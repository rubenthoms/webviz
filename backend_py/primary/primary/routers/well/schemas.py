from typing import List, Optional
from pydantic import BaseModel


class StratigraphicUnit(BaseModel):
    """
    Stratigraphic unit from SMDA

    Camel case attributes needed for esvIntersection component in front-end
    """

    identifier: str
    top: str
    base: str
    stratUnitLevel: int
    stratUnitType: str
    topAge: int | float
    baseAge: int | float
    stratUnitParent: Optional[str] = None
    colorR: int
    colorG: int
    colorB: int
    lithologyType: int | float | str = "unknown"

class WellboreHeader(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    well_uuid: str
    unique_well_identifier: str
    well_easting: float
    well_northing: float

class WellboreTrajectory(BaseModel):
    wellbore_uuid: str
    unique_wellbore_identifier: str
    tvd_msl_arr: List[float]
    md_arr: List[float]
    easting_arr: List[float]
    northing_arr: List[float]

class WellborePick(BaseModel):
    """
    Wellbore pick from SMDA

    Camel case attributes needed for esvIntersection component in front-end
    """

    northing: float
    easting: float
    tvd: float
    tvdMsl: float
    md: float
    mdMsl: float
    uniqueWellboreIdentifier: str
    pickIdentifier: str
    confidence: Optional[str] = None
    depthReferencePoint: str
    mdUnit: str


class WellborePicksAndStratigraphicUnits(BaseModel):
    wellbore_picks: List[WellborePick] = []
    stratigraphic_units: List[StratigraphicUnit] = []