from typing import List
from pydantic import ValidationError
from primary.services.service_exceptions import (
    Service,
    InvalidDataError,
)
from ._ssdl_get_request import fetch_from_ssdl

from . import schemas


class WellAccess:
    def __init__(self, access_token: str):
        self._ssdl_token = access_token

    async def get_completions_for_wellbore(self, wellbore_uuid: str) -> List[schemas.WellboreCompletion]:
        endpoint = f"Wellbores/{wellbore_uuid}/completion"
        params = {"normalized_data": True}

        ssdl_data = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=params)
        try:
            result = [schemas.WellboreCompletion.model_validate(casing) for casing in ssdl_data]
        except ValidationError as error:
            raise InvalidDataError(
                f"Invalid completion data for wellbore {wellbore_uuid} {error}", Service.SSDL
            ) from error
        return result

    async def get_casing_for_wellbore(self, wellbore_uuid: str) -> List[schemas.WellboreCasing]:
        endpoint = f"Wellbores/{wellbore_uuid}/casing"
        params = {"source": "dbr"}
        ssdl_data = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=params)
        try:
            result = [schemas.WellboreCasing.model_validate(casing) for casing in ssdl_data]
        except ValidationError as error:
            raise InvalidDataError(f"Invalid casing data for wellbore {wellbore_uuid}", Service.SSDL) from error
        return result

    async def get_perforations_for_wellbore(self, wellbore_uuid: str) -> List[schemas.WellborePerforation]:
        endpoint = f"Wellbores/{wellbore_uuid}/perforations"
        params = {"normalized-data": False, "details": True}

        ssdl_data = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=params)
        try:
            result = [schemas.WellborePerforation.model_validate(casing) for casing in ssdl_data]
        except ValidationError as error:
            raise InvalidDataError(f"Invalid casing data for wellbore {wellbore_uuid}", Service.SSDL) from error
        return result

    async def get_log_curve_headers_for_wellbore(self, wellbore_uuid: str) -> List[schemas.WellboreLogCurveInfo]:
        endpoint = f"WellLog/{wellbore_uuid}"
        ssdl_data = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=None)
        try:
            result = [schemas.WellboreLogCurveInfo.model_validate(log_curve) for log_curve in ssdl_data]
        except ValidationError as error:
            raise InvalidDataError(f"Invalid log curve headers for wellbore {wellbore_uuid}", Service.SSDL) from error
        return result

    async def get_log_curve_headers_for_field(self, field_uuid: str) -> List[schemas.WellboreLogCurveInfo]:
        endpoint = f"WellLog/field/{field_uuid}"
        ssdl_data = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=None)
        try:
            result = [schemas.WellboreLogCurveInfo.model_validate(log_curve) for log_curve in ssdl_data]
        except ValidationError as error:
            raise InvalidDataError(f"Invalid log curve headers for field {field_uuid}", Service.SSDL) from error
        return result

    async def get_log_curve_data(self, wellbore_uuid: str, curve_name: str) -> schemas.WellboreLogCurveData:
        params = {"normalized_data": False}
        endpoint = f"WellLog/{wellbore_uuid}/{curve_name}"
        ssdl_data = await fetch_from_ssdl(access_token=self._ssdl_token, endpoint=endpoint, params=params)
        try:
            result = schemas.WellboreLogCurveData.model_validate(ssdl_data)
        except ValidationError as error:
            raise InvalidDataError(
                f"Invalid log curve data for wellbore {wellbore_uuid} and curve {curve_name}", Service.SSDL
            ) from error
        return result
