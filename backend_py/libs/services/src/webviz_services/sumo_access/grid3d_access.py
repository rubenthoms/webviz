import logging
from typing import List, Optional
import asyncio

import xtgeo
from pydantic import BaseModel
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.explorer import SumoClient, SearchContext
from fmu.sumo.explorer.objects import CPGrid, CPGridProperty

from webviz_core_utils.timestamp_utils import iso_str_to_date_str, timestamp_utc_ms_to_iso_str
from webviz_services.service_exceptions import InvalidDataError, Service
from .sumo_client_factory import create_sumo_client

LOGGER = logging.getLogger(__name__)


class Grid3dBoundingBox(BaseModel):
    """Bounding box for a 3D grid geometry"""

    xmin: float
    ymin: float
    zmin: float
    xmax: float
    ymax: float
    zmax: float


class Grid3dZone(BaseModel):
    """Named subset of 3D grid layers (Zone)"""

    name: str
    start_layer: int
    end_layer: int


class Grid3dDimensions(BaseModel):
    """Specification of a 3D grid geometry"""

    i_count: int
    j_count: int
    k_count: int
    subgrids: List[Grid3dZone]


class Grid3dPropertyInfo(BaseModel):
    """Metadata for a 3D grid property"""

    property_name: str
    iso_date_or_interval: Optional[str] = None


class Grid3dInfo(BaseModel):
    """Metadata for a 3D grid model, including its properties and geometry"""

    grid_name: str
    bbox: Grid3dBoundingBox
    dimensions: Grid3dDimensions
    property_info_arr: List[Grid3dPropertyInfo]


class Grid3dAccess:
    def __init__(self, sumo_client: SumoClient, case_uuid: str, ensemble_name: str):
        self._sumo_client = sumo_client
        self._case_uuid: str = case_uuid
        self._ensemble_name: str = ensemble_name
        self._ensemble_context = SearchContext(sumo=self._sumo_client).filter(
            uuid=self._case_uuid, ensemble=self._ensemble_name
        )

    @classmethod
    def from_ensemble_name(cls, access_token: str, case_uuid: str, ensemble_name: str) -> "Grid3dAccess":
        sumo_client = create_sumo_client(access_token)
        return cls(sumo_client=sumo_client, case_uuid=case_uuid, ensemble_name=ensemble_name)

    async def get_models_info_arr_async(self, realization: int) -> List[Grid3dInfo]:
        """Get metadata for all 3D grid models, including bbox, dimensions and properties"""

        grid3d_search_context = self._ensemble_context.grids.filter(realization=realization)

        # Run loop in parallel as function for creating meta is async
        sumo_grid_uuids: list[str] = await grid3d_search_context.uuids_async
        async with asyncio.TaskGroup() as tg:
            tasks = [
                tg.create_task(_get_grid_model_meta_async(grid3d_search_context, uuid)) for uuid in sumo_grid_uuids
            ]
        grid_meta_arr: list[Grid3dInfo] = [task.result() for task in tasks]

        return grid_meta_arr

    async def get_grid_async(self, grid_name: str, realization: int) -> xtgeo.Grid:
        """Get a 3D grid geometry as an xtgeo.Grid, direct from Sumo (no ResInsight involved)"""

        cpgrid = await self._get_cpgrid_object_async(grid_name, realization)
        return await cpgrid.to_cpgrid_async()

    async def get_grid_properties_async(
        self,
        grid_name: str,
        property_names: list[str],
        realization: int,
        time_or_interval_str: str | None = None,
    ) -> dict[str, xtgeo.GridProperty]:
        """Get several named 3D grid properties (same grid/realization/time) as xtgeo.GridProperty objects, direct
        from Sumo (no ResInsight involved). The CPGrid metadata lookup is shared across the whole batch; the
        per-property searches and blob downloads run concurrently."""

        cpgrid = await self._get_cpgrid_object_async(grid_name, realization)
        time_filter = _make_time_filter(time_or_interval_str)

        async def _get_one_property_async(property_name: str) -> tuple[str, xtgeo.GridProperty]:
            property_search_context = cpgrid.grid_properties.filter(name=property_name, time=time_filter)
            sumo_property_uuids: list[str] = await property_search_context.uuids_async
            if not sumo_property_uuids:
                raise InvalidDataError(
                    f"No grid property found for {property_name=}, {time_or_interval_str=}", Service.SUMO
                )
            if len(sumo_property_uuids) > 1:
                raise InvalidDataError(
                    f"Multiple grid properties found for {property_name=}, {time_or_interval_str=}", Service.SUMO
                )

            sumo_property_object = await property_search_context.get_object_async(sumo_property_uuids[0])
            if not isinstance(sumo_property_object, CPGridProperty):
                raise InvalidDataError(
                    f"Did not get expected CPGridProperty object type for {property_name=}", Service.SUMO
                )

            return property_name, await sumo_property_object.to_cpgrid_property_async()

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(_get_one_property_async(name)) for name in property_names]

        return dict(task.result() for task in tasks)

    async def _get_cpgrid_object_async(self, grid_name: str, realization: int) -> CPGrid:
        """Cheap metadata-only lookup, shared by get_grid_async and get_grid_property_async -- does not
        download/parse the grid blob itself (that only happens on .to_cpgrid_async())."""

        grid3d_search_context = self._ensemble_context.grids.filter(name=grid_name, realization=realization)
        sumo_grid_uuids: list[str] = await grid3d_search_context.uuids_async
        if not sumo_grid_uuids:
            raise InvalidDataError(f"No grid found for {grid_name=}, {realization=}", Service.SUMO)
        if len(sumo_grid_uuids) > 1:
            raise InvalidDataError(f"Multiple grids found for {grid_name=}, {realization=}", Service.SUMO)

        sumo_grid_object = await grid3d_search_context.get_object_async(sumo_grid_uuids[0])
        if not isinstance(sumo_grid_object, CPGrid):
            raise InvalidDataError(f"Did not get expected CPGrid object type for {grid_name=}", Service.SUMO)

        return sumo_grid_object


async def _get_grid_model_meta_async(sumo_grid3d_search_context: SearchContext, grid_uuid: str) -> Grid3dInfo:
    """
    Get grid object from SUMO using grid search context and grid uuid, and create metadata for the grid model.

    This is a helper function for Grid3dAccess.get_models_info_arr_async

    Note that in fmu-sumo the grid properties metadata are related to a grid geometry via data.geometry.relative_path.keyword
    Older metadata using e.g. name or tagname for the grid geometry relationship are not supported.
    """
    # Get the grid object from the search context
    sumo_grid_object = await sumo_grid3d_search_context.get_object_async(grid_uuid)
    if not isinstance(sumo_grid_object, CPGrid):
        raise InvalidDataError(f"Did not get expected CPGrid object type for {grid_uuid=}", Service.SUMO)

    grid_metadata = sumo_grid_object.metadata

    bbox = Grid3dBoundingBox(
        xmin=grid_metadata["data"]["bbox"]["xmin"],
        ymin=grid_metadata["data"]["bbox"]["ymin"],
        zmin=grid_metadata["data"]["bbox"]["zmin"],
        xmax=grid_metadata["data"]["bbox"]["xmax"],
        ymax=grid_metadata["data"]["bbox"]["ymax"],
        zmax=grid_metadata["data"]["bbox"]["zmax"],
    )
    if grid_metadata.get("data").get("spec").get("zonation"):
        subgrids = [
            Grid3dZone(name=zone["name"], start_layer=zone["min_layer_idx"], end_layer=zone["max_layer_idx"])
            for zone in grid_metadata["data"]["spec"]["zonation"]
        ]
    else:
        subgrids = []

    dimensions = Grid3dDimensions(
        i_count=grid_metadata["data"]["spec"]["ncol"],
        j_count=grid_metadata["data"]["spec"]["nrow"],
        k_count=grid_metadata["data"]["spec"]["nlay"],
        subgrids=subgrids,
    )
    property_info_arr = await _get_grid_properties_info_async(sumo_grid_object)
    grid3d_info = Grid3dInfo(
        grid_name=grid_metadata["data"]["name"],
        bbox=bbox,
        dimensions=dimensions,
        property_info_arr=property_info_arr,
    )

    return grid3d_info


async def _get_grid_properties_info_async(cpgrid: CPGrid) -> List[Grid3dPropertyInfo]:
    """
    Get grid properties metadata for a given CPGrid object.
    This is a helper function to extract property metadata from a CPGrid instance.

    The valid timestamps/intervals are resolved per property using composite aggregations, so that
    each property only reports the time points/intervals that actually exist for that property.
    """

    no_time_context = cpgrid.grid_properties.filter(time=TimeFilter(time_type=TimeType.NONE))
    timestamp_context = cpgrid.grid_properties.filter(time=TimeFilter(time_type=TimeType.TIMESTAMP))
    interval_context = cpgrid.grid_properties.filter(time=TimeFilter(time_type=TimeType.INTERVAL))

    async with asyncio.TaskGroup() as tg:
        no_time_property_names_task = tg.create_task(no_time_context.names_async)
        timestamp_buckets_task = tg.create_task(
            timestamp_context.get_composite_agg_async({"name": "data.name.keyword", "t0": "data.time.t0.value"})
        )
        interval_buckets_task = tg.create_task(
            interval_context.get_composite_agg_async(
                {"name": "data.name.keyword", "t0": "data.time.t0.value", "t1": "data.time.t1.value"}
            )
        )

    no_time_property_names = no_time_property_names_task.result()
    timestamp_buckets = timestamp_buckets_task.result()
    interval_buckets = interval_buckets_task.result()

    property_info_arr: List[Grid3dPropertyInfo] = []

    for property_name in no_time_property_names:
        property_info_arr.append(Grid3dPropertyInfo(property_name=property_name, iso_date_or_interval=None))

    # Each bucket is a unique (property name, timestamp) combination that actually exists in Sumo.
    # The time field values are returned as epoch milliseconds by the composite aggregation.
    for bucket in timestamp_buckets:
        property_info_arr.append(
            Grid3dPropertyInfo(
                property_name=bucket["name"],
                iso_date_or_interval=iso_str_to_date_str(timestamp_utc_ms_to_iso_str(bucket["t0"])),
            )
        )

    # Each bucket is a unique (property name, interval) combination that actually exists in Sumo.
    for bucket in interval_buckets:
        start_date = iso_str_to_date_str(timestamp_utc_ms_to_iso_str(bucket["t0"]))
        end_date = iso_str_to_date_str(timestamp_utc_ms_to_iso_str(bucket["t1"]))
        property_info_arr.append(
            Grid3dPropertyInfo(
                property_name=bucket["name"],
                iso_date_or_interval=f"{start_date}/{end_date}",
            )
        )

    return property_info_arr


def _make_time_filter(time_or_interval_str: str | None) -> TimeFilter:
    if time_or_interval_str is None:
        return TimeFilter(time_type=TimeType.NONE)

    if "/" in time_or_interval_str:
        start_str, end_str = time_or_interval_str.split("/")
        return TimeFilter(time_type=TimeType.INTERVAL, start=start_str, end=end_str, exact=True)

    return TimeFilter(time_type=TimeType.TIMESTAMP, start=time_or_interval_str, end=time_or_interval_str, exact=True)
