import logging
from typing import List, Union

from fastapi import APIRouter, Depends, Query

from primary.services.smda_access.mocked_drogon_smda_access import (
    WellAccess as MockedSmdaWellAccess,
    StratigraphyAccess as MockedStratigraphyAccess,
)
from primary.services.smda_access.well_access import WellAccess as SmdaWellAccess
from primary.services.smda_access.stratigraphy_access import StratigraphyAccess
from primary.services.utils.authenticated_user import AuthenticatedUser
from primary.auth.auth_helper import AuthHelper
from primary.services.sumo_access.case_inspector import CaseInspector

from primary.services.ssdl_access.well_access import WellAccess as SsdlWellAccess

from . import schemas
from . import converters

LOGGER = logging.getLogger(__name__)

router = APIRouter()


@router.get("/drilled_wellbore_headers/")
async def get_drilled_wellbore_headers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"),
    # Should be field identifier
    # fmt:on
) -> List[schemas.WellboreHeader]:
    """Get wellbore headers for all wells in the field"""

    case_inspector = await CaseInspector.from_case_uuid_async(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = (await case_inspector.get_field_identifiers_async())[0]
    well_access: Union[SmdaWellAccess, MockedSmdaWellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = MockedSmdaWellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = SmdaWellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_wellbore_headers(field_identifier=field_identifier)


@router.get("/field_well_trajectories/")
async def get_field_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
    unique_wellbore_identifiers:List[str] =  Query(None, description="Optional subset of well names")
    # fmt:on
) -> List[schemas.WellboreTrajectory]:
    """Get well trajectories for field"""
    case_inspector = await CaseInspector.from_case_uuid_async(authenticated_user.get_sumo_access_token(), case_uuid)
    field_identifier = (await case_inspector.get_field_identifiers_async())[0]
    well_access: Union[SmdaWellAccess, MockedSmdaWellAccess]
    if field_identifier == "DROGON":
        # Handle DROGON
        well_access = MockedSmdaWellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = SmdaWellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_field_wellbore_trajectories(
        field_identifier=field_identifier, unique_wellbore_identifiers=unique_wellbore_identifiers
    )


@router.get("/well_trajectories/")
async def get_well_trajectories(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuids: List[str] = Query(description="Wellbore uuids"),
    # fmt:on
) -> List[schemas.WellboreTrajectory]:
    """Get well trajectories"""
    well_access: Union[SmdaWellAccess, MockedSmdaWellAccess]

    # Handle DROGON
    if all(x in ["drogon_horizontal", "drogon_vertical"] for x in wellbore_uuids):
        well_access = MockedSmdaWellAccess(authenticated_user.get_smda_access_token())
    else:
        well_access = SmdaWellAccess(authenticated_user.get_smda_access_token())

    return await well_access.get_wellbore_trajectories(wellbore_uuids=wellbore_uuids)


@router.get("/wellbore_picks_and_stratigraphic_units/")
async def get_wellbore_picks_and_stratigraphic_units(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    case_uuid: str = Query(description="Sumo case uuid"), # Should be field identifier?
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> schemas.WellborePicksAndStratigraphicUnits:
    """Get well bore picks for a single well bore"""
    well_access: Union[SmdaWellAccess, MockedSmdaWellAccess]
    stratigraphy_access: Union[StratigraphyAccess, MockedStratigraphyAccess]

    case_inspector = await CaseInspector.from_case_uuid_async(authenticated_user.get_sumo_access_token(), case_uuid)
    stratigraphic_column_identifier = await case_inspector.get_stratigraphic_column_identifier_async()

    # Handle DROGON
    field_identifiers = await case_inspector.get_field_identifiers_async()
    if "DROGON" in field_identifiers:
        well_access = MockedSmdaWellAccess(authenticated_user.get_smda_access_token())
        stratigraphy_access = MockedStratigraphyAccess(authenticated_user.get_smda_access_token())

    else:
        well_access = SmdaWellAccess(authenticated_user.get_smda_access_token())
        stratigraphy_access = StratigraphyAccess(authenticated_user.get_smda_access_token())

    stratigraphic_units = await stratigraphy_access.get_stratigraphic_units(stratigraphic_column_identifier)
    wellbore_picks = await well_access.get_all_picks_for_wellbore(wellbore_uuid=wellbore_uuid)

    return schemas.WellborePicksAndStratigraphicUnits(
        wellbore_picks=converters.convert_wellbore_picks_to_schema(wellbore_picks),
        stratigraphic_units=converters.convert_stratigraphic_units_to_schema(stratigraphic_units),
    )


@router.get("/wellbore_completions/")
async def get_wellbore_completions(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellboreCompletion]:
    """Get well bore completions for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []
    else:
        well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_completions = await well_access.get_completions_for_wellbore(wellbore_uuid=wellbore_uuid)
    return wellbore_completions


@router.get("/wellbore_casing/")
async def get_wellbore_casing(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellboreCasing]:
    """Get well bore casing for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []
    else:
        well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_casing = await well_access.get_casing_for_wellbore(wellbore_uuid=wellbore_uuid)

    return wellbore_casing


@router.get("/wellbore_perforations/")
async def get_wellbore_perforations(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellborePerforation]:
    """Get well bore casing for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []
    else:
        well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_perforations = await well_access.get_perforations_for_wellbore(wellbore_uuid=wellbore_uuid)

    return wellbore_perforations


@router.get("/wellbore_log_curve_headers/")
async def get_wellbore_log_curve_headers(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    # fmt:on
) -> List[schemas.WellboreLogCurveInfo]:
    """Get all log curve headers for a single well bore"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []
    else:
        well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    wellbore_casing = await well_access.get_log_curve_headers_for_wellbore(wellbore_uuid=wellbore_uuid)

    return wellbore_casing


@router.get("/log_curve_data/")
async def get_log_curve_data(
    # fmt:off
    authenticated_user: AuthenticatedUser = Depends(AuthHelper.get_authenticated_user),
    wellbore_uuid: str = Query(description="Wellbore uuid"),
    log_curve_name:str = Query(description="Log curve name")
    # fmt:on
) -> schemas.WellboreLogCurveData:
    """Get log curve data"""

    # Handle DROGON
    if wellbore_uuid in ["drogon_horizontal", "drogon_vertical"]:
        return []
    else:
        well_access = SsdlWellAccess(authenticated_user.get_ssdl_access_token())

    log_curve = await well_access.get_log_curve_data(wellbore_uuid=wellbore_uuid, curve_name=log_curve_name)

    return log_curve
