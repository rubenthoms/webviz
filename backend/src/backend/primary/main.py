import datetime
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from fastapi.responses import ORJSONResponse
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from src.backend.utils.add_process_time_to_server_timing_middleware import AddProcessTimeToServerTimingMiddleware
from src.backend.shared_middleware import add_shared_middlewares
from src.backend.auth.auth_helper import AuthHelper
from .routers.explore import router as explore_router
from .routers.general import router as general_router
from .routers.inplace_volumetrics.router import router as inplace_volumetrics_router
from .routers.surface.router import router as surface_router
from .routers.timeseries.router import router as timeseries_router
from .routers.parameters.router import router as parameters_router
from .routers.correlations.router import router as correlations_router
from .routers.grid.router import router as grid_router
from .routers.pvt.router import router as pvt_router
from .routers.well_completions.router import router as well_completions_router
from .routers.well.router import router as well_router
from .routers.seismic.router import router as seismic_router
from .routers.surface_polygons.router import router as surface_polygons_router
from .routers.graph.router import router as graph_router
from .routers.observations.router import router as observations_router
from .exceptions import ResultNotMatchingExpectations

logging.basicConfig(
    level=logging.WARNING,
    format="%(asctime)s %(levelname)-3s [%(name)s]: %(message)s",
    datefmt="%H:%M:%S",
)
logging.getLogger("src.services.sumo_access").setLevel(level=logging.DEBUG)
logging.getLogger("src.backend.primary.routers.surface").setLevel(level=logging.DEBUG)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.name}"


app = FastAPI(
    generate_unique_id_function=custom_generate_unique_id,
    root_path="/api",
    default_response_class=ORJSONResponse,
)

# The tags we add here will determine the name of the frontend api service for our endpoints as well as
# providing some grouping when viewing the openapi documentation.
app.include_router(explore_router, tags=["explore"])
app.include_router(timeseries_router, prefix="/timeseries", tags=["timeseries"])
app.include_router(
    inplace_volumetrics_router,
    prefix="/inplace_volumetrics",
    tags=["inplace_volumetrics"],
)
app.include_router(surface_router, prefix="/surface", tags=["surface"])
app.include_router(parameters_router, prefix="/parameters", tags=["parameters"])
app.include_router(correlations_router, prefix="/correlations", tags=["correlations"])
app.include_router(grid_router, prefix="/grid", tags=["grid"])
app.include_router(pvt_router, prefix="/pvt", tags=["pvt"])
app.include_router(well_completions_router, prefix="/well_completions", tags=["well_completions"])
app.include_router(well_router, prefix="/well", tags=["well"])
app.include_router(seismic_router, prefix="/seismic", tags=["seismic"])
app.include_router(surface_polygons_router, prefix="/surface_polygons", tags=["surface_polygons"])
app.include_router(graph_router, prefix="/graph", tags=["graph"])
app.include_router(observations_router, prefix="/observations", tags=["observations"])

authHelper = AuthHelper()
app.include_router(authHelper.router)
app.include_router(general_router)

# This middleware instance approximately measures execution time of the route handler itself
app.add_middleware(AddProcessTimeToServerTimingMiddleware, metric_name="total-exec-route")

add_shared_middlewares(app)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# This middleware instance measures execution time of the endpoints, including the cost of other middleware
app.add_middleware(AddProcessTimeToServerTimingMiddleware, metric_name="total")


@app.get("/")
async def root() -> str:
    return f"Backend is alive at this time: {datetime.datetime.now()}"

@app.exception_handler(Exception)
async def exception_handler(request: Request, exc: Exception):
    if isinstance(exc, ResultNotMatchingExpectations):
        return JSONResponse(
            status_code=404,
            content={"message": exc.message},
        )
    return JSONResponse(
        status_code=500,
        content={"message": str(exc)},
    )