from enum import StrEnum
from dataclasses import dataclass
from typing import List, Union


class InplaceVolumetricsIdentifier(StrEnum):
    """
    Definition of valid index names for an inplace volumetrics table
    """

    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    LICENSE = "LICENSE"


class AggregateByEach(StrEnum):
    # FLUID_ZONE = "FLUID_ZONE"
    ZONE = "ZONE"
    REGION = "REGION"
    FACIES = "FACIES"
    # LICENSE = "LICENSE"
    REAL = "REAL"


class FluidZone(StrEnum):
    OIL = "Oil"
    GAS = "Gas"
    Water = "Water"  # TODO: Remove or keep?


class Property(StrEnum):
    NTG = "NTG"
    PORO = "PORO"
    PORO_NET = "PORO_NET"
    SW = "SW"
    BO = "BO"
    BG = "BG"


@dataclass
class InplaceVolumetricsIdentifierWithValues:
    """
    Unique values for an identifier column in an inplace volumetrics table

    NOTE: Ideally all values should be strings, but it is possible that some values are integers - especially for REGION
    """

    identifier: InplaceVolumetricsIdentifier
    values: List[Union[str, int]]  # List of values: str or int


@dataclass
class InplaceVolumetricsTableDefinition:
    """Definition of a volumetric table"""

    table_name: str
    identifiers_with_values: List[InplaceVolumetricsIdentifierWithValues]
    result_names: List[str]
    fluid_zones: List[FluidZone]
