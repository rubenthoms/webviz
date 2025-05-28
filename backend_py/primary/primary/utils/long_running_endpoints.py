from typing import (
    Type,
    TypeAlias,
    TypeVar,
    Callable,
    Awaitable,
    Generic,
    Literal,
    Protocol,
    Union,
    get_type_hints,
    get_args,
    get_origin,
)
import sys
import types
from enum import Enum
from fastapi import APIRouter, HTTPException, Response
from functools import wraps
from pydantic import BaseModel

T = TypeVar("T")
F = TypeVar("F", bound=Callable[..., Awaitable])


class PollUrl(Protocol):
    def __call__(self, task_id: str) -> str: ...


def get_poll_url() -> PollUrl:
    return lambda: None  # Placeholder for actual implementation


class ErrorInfo(BaseModel):
    message: str


class ProgressInfo(BaseModel):
    progress_message: str


class LroInProgressResp(BaseModel):
    status: Literal["in_progress"]
    operation_id: str
    poll_url: str | None = None
    progress: ProgressInfo | None = None


class LroErrorResp(BaseModel):
    status: Literal["failure"]
    error: ErrorInfo


class LroSuccessResp(BaseModel, Generic[T]):
    status: Literal["success"]
    data: T


LroCombinedResponseType: TypeAlias = Union[
    LroInProgressResp,
    LroErrorResp,
    LroSuccessResp[T],
]


def make_lro_union(result_type: Type) -> Type:
    return Union[
        LroInProgressResp,
        LroErrorResp,
        LroSuccessResp[result_type],
    ]


class TaskState(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


def lro_responses(data_type: Type[T]):
    return {
        200: {
            "model": LroSuccessResp[data_type],
            "description": "Task completed successfully",
        },
        202: {
            "model": LroInProgressResp,
            "description": "Task is in progress",
        },
        500: {
            "model": LroErrorResp,
            "description": "An error occurred",
        },
    }


def auto_status(resp: Union[LroInProgressResp, LroSuccessResp, LroErrorResp], response: Response = None):
    if response is None:
        response = Response()

    if isinstance(resp, LroInProgressResp):
        response.status_code = 202
    elif isinstance(resp, LroErrorResp):
        response.status_code = 500
    elif isinstance(resp, LroSuccessResp):
        response.status_code = 200
    else:
        response.status_code = 200  # fallback

    return resp


def extract_result_type(func: Callable) -> type:
    """Extract the T from LroSuccessResp[T] inside a Union or | expression."""

    globalns = sys.modules[func.__module__].__dict__
    localns = dict(func.__globals__)
    type_hints = get_type_hints(func, globalns=globalns, localns=localns)

    return_annotation = type_hints.get("return")
    if return_annotation is None:
        raise TypeError("Missing return type annotation")

    origin = get_origin(return_annotation)
    args = get_args(return_annotation)

    if origin in (Union, types.UnionType):
        for arg in args:
            if hasattr(arg, "model_fields") and "data" in arg.model_fields:
                return arg.model_fields["data"].annotation

    raise TypeError("Return type must include LroSuccessResp[T]")


def lro_endpoint(
    path: str,
    *,
    method: Literal["get", "post"],
    task_queue: dict,
    result_store: dict,
    router: APIRouter,
    prefix: str = "",
) -> Callable[[F], F]:
    def decorator(func: F) -> F:
        # --- Infer result type from function annotation ---
        return_type = get_type_hints(func).get("return")
        if return_type is None:
            raise TypeError(f"{func.__name__} must have a return type annotation")

        result_type = extract_result_type(func)

        # --- Status path inference ---
        status_path = path.rstrip("/") + "_status"

        # --- Inject poll_url into the main handler ---
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Create the poll_url function
            poll_url_fn = lambda task_id: f"{prefix}{status_path}?task_id={task_id}"
            if "poll_url" in func.__code__.co_varnames:
                kwargs["poll_url"] = poll_url_fn
            return await func(*args, **kwargs)

        # --- Register POST endpoint with proper response models ---
        operation = getattr(router, method)
        operation(
            path,
            responses=lro_responses(result_type),
        )(wrapper)

        # --- Register GET status endpoint ---
        @router.get(status_path, responses=lro_responses(result_type), operation_id=f"{func.__name__}_status")
        async def get_status(task_id: str):
            task = task_queue.get(task_id)
            state = task["state"] if task else None
            if not state:
                raise HTTPException(status_code=404, detail="Unknown task_id")

            if state in [TaskState.PENDING, TaskState.RUNNING]:
                return auto_status(
                    LroInProgressResp(
                        status="in_progress",
                        operation_id=task_id,
                        poll_url=f"{prefix}{status_path}?task_id={task_id}",
                        progress=ProgressInfo(progress_message="Task is pending or running"),
                    )
                )

            if state == TaskState.FAILED:
                return auto_status(
                    LroErrorResp(
                        status="failure",
                        error=ErrorInfo(message=task["error"]),
                    )
                )

            result = result_store.get(task_id)
            if result is None:
                raise HTTPException(status_code=500, detail="Task completed but no result found")

            return auto_status(LroSuccessResp(status="success", data=result))

        return wrapper  # type: ignore

    return decorator
