import logging
 
from typing import List
 
from fmu.sumo.explorer import TimeFilter, TimeType
from fmu.sumo.explorer.objects.cube_collection import CubeCollection
from fmu.sumo.explorer.objects.cube import Cube
 
from primary.services.service_exceptions import Service, NoDataError
 
from ._helpers import SumoEnsemble
from .seismic_types import SeismicCubeMeta, VdsHandle
 
LOGGER = logging.getLogger(__name__)
 
 
class SeismicAccess(SumoEnsemble):
    async def get_seismic_cube_meta_list_async(self) -> List[SeismicCubeMeta]:
 
        seismic_cube_meta_list: List[SeismicCubeMeta] = []
        # Todo: Handle observed cube per realization
 
        # Get metadata for simulated cube for the the first valid realization
        realizations = self.get_realizations()
        if not realizations:
            raise NoDataError(
                f"No valid realizations found for case {self._case_uuid,}, iteration {self._iteration_name}",
                Service.SUMO,
            )
        seismic_cube_realization_collection: CubeCollection = self._case.cubes.filter(
            iteration=self._iteration_name, realization=self.get_realizations()[0]
        )
        async for cube in seismic_cube_realization_collection:
            seismic_meta = get_seismic_cube_meta(cube, False)
            seismic_cube_meta_list.append(seismic_meta)
 
        # Get metadata for observed cubes on case level (preprocessed)
        seismic_cube_preprocessed_collection: CubeCollection = self._case.cubes.filter(stage="case")
        async for cube in seismic_cube_preprocessed_collection:
            seismic_meta = get_seismic_cube_meta(cube, True)
            seismic_cube_meta_list.append(seismic_meta)
        return seismic_cube_meta_list
 
    async def get_vds_handle_async(
        self,
        seismic_attribute: str,
        realization: int,
        time_or_interval_str: str,
        observed: bool = False,
    ) -> VdsHandle:
        """Get the vds handle for a given cube"""
        timestamp_arr = time_or_interval_str.split("/", 1)
        if len(timestamp_arr) == 0 or len(timestamp_arr) > 2:
            raise ValueError("time_or_interval_str must contain a single timestamp or interval")
        if len(timestamp_arr) == 1:
            time_filter = TimeFilter(
                TimeType.TIMESTAMP,
                start=timestamp_arr[0],
                end=timestamp_arr[0],
                exact=True,
            )
        else:
            time_filter = TimeFilter(
                TimeType.INTERVAL,
                start=timestamp_arr[0],
                end=timestamp_arr[1],
                exact=True,
            )
        if observed:
            cube_collection: CubeCollection = self._case.cubes.filter(
                tagname=seismic_attribute, time=time_filter, is_observation=observed, stage="case"
            )
        else:
            cube_collection: CubeCollection = self._case.cubes.filter(
                tagname=seismic_attribute,
                realization=realization,
                iteration=self._iteration_name,
                time=time_filter,
                is_observation=False,  # Does not work for observed. Only handles observed on case level?
            )
        # Filter on observed
        cubes = []
        async for cube in cube_collection:
            if cube["data"]["is_observation"] == observed:
                cubes.append(cube)
                break
 
        if not cubes:
            raise ValueError(f"Cube {seismic_attribute} not found in case {self._case_uuid}")
        if len(cubes) > 1:
            raise ValueError(f"Multiple cubes found for {seismic_attribute} in case {self._case_uuid}")
        cube = cubes[0]
 
        return VdsHandle(
            sas_token=cube.sas,
            vds_url=clean_vds_url(cube.url),
        )
 
 
def clean_vds_url(vds_url: str) -> str:
    """clean vds url"""
    return vds_url.replace(":443", "")
 
 
def get_seismic_cube_meta(sumo_cube_meta: Cube, is_observation: bool) -> SeismicCubeMeta:
    t_start = sumo_cube_meta["data"].get("time", {}).get("t0", {}).get("value", None)
    t_end = sumo_cube_meta["data"].get("time", {}).get("t1", {}).get("value", None)
 
    if not t_start and not t_end:
        raise ValueError(f"Cube {sumo_cube_meta['data']['tagname']} has no time information")
 
    if t_start and not t_end:
        iso_string_or_time_interval = t_start
 
    else:
        iso_string_or_time_interval = f"{t_start}/{t_end}"
 
    seismic_meta = SeismicCubeMeta(
        seismic_attribute=sumo_cube_meta["data"].get("tagname"),
        iso_date_or_interval=iso_string_or_time_interval,
        # is_observation=sumo_cube_meta["data"]["is_observation"],
        is_observation=is_observation,
        is_depth=sumo_cube_meta["data"]["vertical_domain"] == "depth",
    )
    return seismic_meta
 