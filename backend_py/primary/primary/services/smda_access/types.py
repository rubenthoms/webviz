from enum import Enum
from typing import List, Optional
from datetime import datetime

from pydantic import BaseModel, NonNegativeFloat


class WellBorePick(BaseModel):
    """
    Wellbore pick from SMDA

    Attributes needed for esvIntersection component
    """

    northing: float
    easting: float
    tvd: float
    tvd_msl: float
    md: float
    md_msl: float
    unique_wellbore_identifier: str
    pick_identifier: str
    confidence: Optional[str] = None
    depth_reference_point: str
    md_unit: str


class WellBoreTrajectory(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    tvd_msl_arr: List[float]
    md_arr: List[float]
    easting_arr: List[float]
    northing_arr: List[float]


class WellBoreHeader(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    well_uuid: str
    unique_well_identifier: str
    well_easting: float
    well_northing: float
    depth_reference_datum: str
    depth_reference_elevation: float
    depth_reference_elevation_unit: str
    depth_reference_point: str
    tvd_unit: str
    md_unit: str


class WellBoreCompletion(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    wellbore_status: str
    wellbore_purpose: str
    completion_type: str
    completion_open_flag: bool
    top_depth_md: NonNegativeFloat
    base_depth_md: NonNegativeFloat
    md_unit: str
    date_opened: datetime
    date_closed: Optional[datetime] = None


class StratigraphicUnit(BaseModel):
    """
    Stratigraphic unit from SMDA

    Attributes needed for esvIntersection component
    """

    identifier: str
    top: str
    base: str
    strat_unit_level: int
    strat_unit_type: str
    top_age: int | float
    base_age: int | float
    strat_unit_parent: Optional[str] = None
    color_r: int
    color_g: int
    color_b: int
    lithology_type: int | float | str = "unknown"


class StratigraphicFeature(str, Enum):
    """The stratigraphic feature of a surface"""

    ZONE = "zone"  # identifier
    HORIZON = "horizon"  # top/base


class StratigraphicSurface(BaseModel):
    name: str
    feature: StratigraphicFeature
    relative_strat_unit_level: int = 0
    strat_unit_parent: Optional[str] = None
    strat_unit_identifier: Optional[str] = None
