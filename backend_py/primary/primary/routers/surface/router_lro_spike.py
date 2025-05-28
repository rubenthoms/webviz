import asyncio
import logging
from hashlib import sha256
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, status, Response, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from primary.middleware.add_browser_cache import no_cache

from primary.utils.long_running_endpoints import (
    LroInProgressResp,
    LroErrorResp,
    LroSuccessResp,
    TaskState,
    PollUrl,
    auto_status,
    get_poll_url,
    lro_endpoint,
    ProgressInfo,
    ErrorInfo,
)


LOGGER = logging.getLogger(__name__)

router = APIRouter()


class MyResult(BaseModel):
    my_string: str


class Task(BaseModel):
    state: TaskState
    error: Optional[str] = None


_LAST_USED_TASK_ID = 0
_FAKE_TASK_QUEUE: dict[str, Task] = {}
_FAKE_TASK_RESULT_STORE: dict[str, MyResult] = {}

_PAYLOAD_HASH_TO_TASK_MAP: dict[str, str] = {}


def _generate_new_task_id() -> str:
    global _LAST_USED_TASK_ID
    _LAST_USED_TASK_ID += 1
    return str(_LAST_USED_TASK_ID)


def _concatenate_strings(a: str, b: str) -> str:
    return f"{a}+++{b}"


async def _concatenate_strings_task(task_id: str, delay: float, fail: bool, a: str, b: str) -> None:
    _FAKE_TASK_QUEUE[task_id] = {
        "state": TaskState.RUNNING,
        "error": None,
    }

    if delay > 0:
        # Simulate a long-running task
        await asyncio.sleep(delay)

    if fail:
        _FAKE_TASK_QUEUE[task_id] = {
            "state": TaskState.FAILED,
            "error": "Simulated failure",
        }
        return

    res = _concatenate_strings(a, b)
    _FAKE_TASK_RESULT_STORE[task_id] = MyResult(my_string=res)
    _FAKE_TASK_QUEUE[task_id] = {
        "state": TaskState.COMPLETED,
        "error": None,
    }


"""
This endpoint is an example of a long-running operation (LRO) that concatenates two strings.
It uses a decorator to automatically create two endpoints:
1. A POST endpoint to start the operation and either return the result at once (delay = 0) or return an in-progress response.
2. A GET endpoint to check the status of the operation.
"""


@lro_endpoint(
    path="/postconcatenate",
    method="post",
    prefix="/surface",
    router=router,
    task_queue=_FAKE_TASK_QUEUE,
    result_store=_FAKE_TASK_RESULT_STORE,
)
async def postConcatenate(
    background_tasks: BackgroundTasks,
    response: Response,
    a: str,
    b: str,
    delay: float = 0,
    fail: bool = False,
    poll_url: PollUrl = Depends(get_poll_url),
) -> (
    LroInProgressResp | LroErrorResp | LroSuccessResp[MyResult]
):  # I would prefer to use LroCombinedResponse[MyResult] here, but it seems Union types cannot be used as generics in Python
    task_id = _generate_new_task_id()
    _FAKE_TASK_QUEUE[task_id] = TaskState.PENDING
    background_tasks.add_task(_concatenate_strings_task, task_id, delay, fail, a, b)

    if delay == 0:
        if fail:
            # If fail is True, return an error response
            return auto_status(
                LroErrorResp(
                    status="failure",
                    error=ErrorInfo(message="Simulated failure"),
                ),
                response,
            )
        # If no delay, return immediately with success as 200
        ret_str = _concatenate_strings(a, b)
        return auto_status(
            LroSuccessResp[MyResult](
                status="success",
                data=MyResult(my_string=ret_str),
            ),
            response,
        )

    # If delay is specified, return 202 with in-progress status
    return auto_status(
        LroInProgressResp(
            status="in_progress",
            operation_id=task_id,
            poll_url=poll_url(task_id),
            progress=ProgressInfo(progress_message="Task was added to queue"),
        ),
        response,
    )


@lro_endpoint(
    path="/getconcatenate",
    method="get",
    prefix="/surface",
    router=router,
    task_queue=_FAKE_TASK_QUEUE,
    result_store=_FAKE_TASK_RESULT_STORE,
)
async def get_concatenate(
    background_tasks: BackgroundTasks,
    response: Response,
    a: str,
    b: str,
    delay: float = 0,
    fail: bool = False,
    poll_url: PollUrl = Depends(get_poll_url),
) -> LroInProgressResp | LroErrorResp | LroSuccessResp[MyResult]:
    task_id = _generate_new_task_id()
    _FAKE_TASK_QUEUE[task_id] = TaskState.PENDING
    background_tasks.add_task(_concatenate_strings_task, task_id, delay, fail, a, b)

    if delay == 0:
        if fail:
            # If fail is True, return an error response
            return auto_status(
                LroErrorResp(
                    status="failure",
                    error=ErrorInfo(message="Simulated failure"),
                ),
                response,
            )
        # If no delay, return immediately with success as 200
        ret_str = _concatenate_strings(a, b)
        return auto_status(
            LroSuccessResp[MyResult](
                status="success",
                data=MyResult(my_string=ret_str),
            ),
            response,
        )

    # If delay is specified, return 202 with in-progress status
    return auto_status(
        LroInProgressResp(
            status="in_progress",
            operation_id=task_id,
            poll_url=poll_url(task_id),
            progress=ProgressInfo(progress_message="Task was added to queue"),
        ),
        response,
    )


@router.post("/always_long_running")
@no_cache
async def post_always_long_running(
    background_tasks: BackgroundTasks, a: str, b: str, delay: float = 0
) -> LroInProgressResp | LroErrorResp | LroSuccessResp[MyResult]:

    task_id = _generate_new_task_id()
    _FAKE_TASK_QUEUE[task_id] = TaskState.PENDING
    background_tasks.add_task(_concatenate_strings_task, task_id, delay, False, a, b)

    return JSONResponse(
        status_code=202,
        content=LroInProgressResp(
            status="in_progress",
            operation_id=task_id,
            poll_url=f"surface/always_long_running_status?task_id={task_id}",
            progress=ProgressInfo(progress_message="Task was added to queue"),
        ).model_dump(),
    )


@router.get("/always_long_running_status")
@no_cache
async def get_always_long_running_status(task_id: str) -> LroInProgressResp | LroErrorResp | LroSuccessResp[MyResult]:
    task = _FAKE_TASK_QUEUE.get(task_id)
    task_state = task["state"] if task else None
    if not task_state:
        raise HTTPException(status_code=500, detail="Unknown task_id")

    if task_state in [TaskState.PENDING, TaskState.RUNNING]:
        return LroInProgressResp(
            status="in_progress",
            operation_id=task_id,
            poll_url=f"surface/always_long_running_status?task_id={task_id}",
            progress=ProgressInfo(progress_message="Task is pending or running"),
        )

    task_result = _FAKE_TASK_RESULT_STORE.get(task_id)
    if not task_result:
        raise HTTPException(status_code=500, detail="Task completed but no result found")

    return LroSuccessResp[MyResult](
        status="success",
        data=task_result,
    )


@router.get("/maybe_long_running")
@no_cache
async def get_maybe_long_running(
    background_tasks: BackgroundTasks, a: str, b: str, delay: float = 0
) -> LroInProgressResp | LroErrorResp | LroSuccessResp[MyResult]:
    # Possibly simulate immediate response
    if delay <= 0:
        ret_str = _concatenate_strings(a, b)
        return LroSuccessResp[MyResult](
            status="success",
            data=MyResult(my_string=ret_str),
        )

    # Simulate a long-running task
    payload_hash = sha256(f"{a}{b}{delay}".encode()).hexdigest()

    existing_task_id = _PAYLOAD_HASH_TO_TASK_MAP.get(payload_hash)
    if existing_task_id is not None:
        task_state = _FAKE_TASK_QUEUE.get(existing_task_id)
        if task_state in [TaskState.PENDING, TaskState.RUNNING]:
            return LroInProgressResp(
                status="in_progress",
                operation_id=existing_task_id,
                progress=ProgressInfo(progress_message="Task is pending or running"),
            )
        if task_state == TaskState.COMPLETED:
            task_result = _FAKE_TASK_RESULT_STORE.get(existing_task_id)
            if task_result:
                return LroSuccessResp[MyResult](
                    status="success",
                    data=task_result,
                )

    new_task_id = _generate_new_task_id()
    _FAKE_TASK_QUEUE[new_task_id] = TaskState.PENDING
    _PAYLOAD_HASH_TO_TASK_MAP[payload_hash] = new_task_id
    background_tasks.add_task(_concatenate_strings_task, new_task_id, delay, a, b)

    return LroInProgressResp(
        status="in_progress",
        operation_id=new_task_id,
        progress=ProgressInfo(progress_message="A new task was added to queue"),
    )


class MyAscResult(BaseModel):
    format: Literal["asc"]
    the_string: str
    the_value: int


class MyBinResult(BaseModel):
    format: Literal["bin"]
    base64_str: str


@router.get("/dummy_with_multiple_models")
@no_cache
async def get_dummy_with_multiple_models() -> (
    LroInProgressResp | LroErrorResp | LroSuccessResp[MyAscResult] | LroSuccessResp[MyBinResult]
):
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED)
