from typing import List

from webviz_pkg.core_utils.perf_timer import PerfTimer
from ..types import StratigraphicUnit
from ._get_request import smda_get_request


async def get_stratigraphic_units(access_token: str, strat_column_uuid: str) -> List[StratigraphicUnit]:
    """Returns a list of all stratigraphic units in a stratigraphic column."""
    endpoint = "strat-units"
    params = {
        "strat_column_uuid": strat_column_uuid,
        "_sort": "top_age",
        "_projection": "top,base,identifier,strat_unit_level,strat_unit_type,strat_unit_parent,top_age,base_age,color_r,color_g,color_b",
    }
    results = await smda_get_request(access_token=access_token, endpoint=endpoint, params=params)
    timer = PerfTimer()
    strat_units = [StratigraphicUnit(**result) for result in results]
    print(f"TIME SMDA validate stratigraphic units {timer.lap_s():.2f} seconds")
    return strat_units
