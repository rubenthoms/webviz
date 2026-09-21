import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { SeismicSlicesProvider } from "../../_shared/DataProviderFramework/dataProviders/implementations/seismicProviders/SeismicSlicesProvider";

import { RealizationGridCellFluxProvider } from "./customDataProviderImplementations/RealizationGridCellFluxProvider";
import { RealizationGridProvider } from "./customDataProviderImplementations/RealizationGridProvider";
import { CustomDataProviderType } from "./customDataProviderTypes";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.SEISMIC_SLICES, SeismicSlicesProvider);
DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID_3D, RealizationGridProvider);
DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_GRID_CELL_FLUX,
    RealizationGridCellFluxProvider,
);
