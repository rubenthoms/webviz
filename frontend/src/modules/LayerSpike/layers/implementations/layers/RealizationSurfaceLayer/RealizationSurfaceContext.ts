import { SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/LayerSpike/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/LayerSpike/layers/queryConstants";
import { SettingType } from "@modules/LayerSpike/layers/settingsTypes";

import { isEqual } from "lodash";
import { SurfaceMetaSet } from "src/api/models/SurfaceMetaSet";

import { RealizationSurfaceSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { Realization } from "../../settings/Realization";
import { SurfaceAttribute } from "../../settings/SurfaceAttribute";
import { SurfaceLayer } from "../../settings/SurfaceLayer";
import { SurfaceName } from "../../settings/SurfaceName";
import { TimeOrInterval } from "../../settings/TimeOrInterval";
import { combineSurfaceNameAndLayer, extractSurfaceNamesAndLayers } from "../../utils/surfaceNamesAndLayers";

export class RealizationSurfaceContext implements SettingsContext<RealizationSurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationSurfaceSettings>;
    private _fetchDataCache: SurfaceMetaSet | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationSurfaceSettings,
            keyof RealizationSurfaceSettings
        >(this, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.REALIZATION]: new Realization(),
            [SettingType.SURFACE_ATTRIBUTE]: new SurfaceAttribute(),
            [SettingType.SURFACE_NAME]: new SurfaceName(),
            [SettingType.SURFACE_LAYER]: new SurfaceLayer(),
            [SettingType.TIME_OR_INTERVAL]: new TimeOrInterval(),
        });
    }

    getDelegate(): SettingsContextDelegate<RealizationSurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    private setAvailableSettingsValues() {
        const settings = this.getDelegate().getSettings();
        settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(false);
        settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);
        settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(false);
        settings[SettingType.SURFACE_LAYER].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return;
        }

        const availableAttributes: string[] = [];
        availableAttributes.push(
            ...Array.from(new Set(this._fetchDataCache.surfaces.map((surface) => surface.attribute_name)))
        );
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_ATTRIBUTE, availableAttributes);

        let currentAttribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        if (!currentAttribute || !availableAttributes.includes(currentAttribute)) {
            if (availableAttributes.length > 0) {
                currentAttribute = availableAttributes[0];
                settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setValue(currentAttribute);
            }
        }

        const availableSurfaceNames: string[] = [];

        if (currentAttribute) {
            availableSurfaceNames.push(
                ...Array.from(
                    new Set(
                        this._fetchDataCache.surfaces
                            .filter((surface) => surface.attribute_name === currentAttribute)
                            .map((el) => el.name)
                    )
                )
            );
        }

        const surfaceNamesAndLayers = extractSurfaceNamesAndLayers(availableSurfaceNames);
        const surfaceNames = surfaceNamesAndLayers.map((el) => el.surfaceName);

        let currentSurfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        if (!currentSurfaceName || !surfaceNames.includes(currentSurfaceName)) {
            if (surfaceNames.length > 0) {
                currentSurfaceName = surfaceNames[0];
                settings[SettingType.SURFACE_NAME].getDelegate().setValue(currentSurfaceName);
            }
        }
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_NAME, surfaceNames);

        const surfaceLayers =
            surfaceNamesAndLayers.find((el) => el.surfaceName === currentSurfaceName)?.surfaceLayers ?? [];
        let currentSurfaceLayer = settings[SettingType.SURFACE_LAYER].getDelegate().getValue();
        if (!currentSurfaceLayer || !surfaceLayers.includes(currentSurfaceLayer)) {
            if (surfaceLayers.length > 0) {
                currentSurfaceLayer = surfaceLayers[0];
                settings[SettingType.SURFACE_LAYER].getDelegate().setValue(currentSurfaceLayer);
            }
        }
        if (surfaceLayers.length === 0) {
            surfaceLayers.push("DEFAULT");
            settings[SettingType.SURFACE_LAYER].getDelegate().setValue("DEFAULT");
        }
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_LAYER, surfaceLayers);

        const availableTimeOrIntervals: string[] = [];
        if (currentAttribute && currentSurfaceName) {
            const combinedSurfaceName = combineSurfaceNameAndLayer(currentSurfaceName, currentSurfaceLayer);
            const availableTimeTypes: SurfaceTimeType_api[] = [];
            availableTimeTypes.push(
                ...Array.from(
                    new Set(
                        this._fetchDataCache.surfaces
                            .filter(
                                (surface) =>
                                    surface.attribute_name === currentAttribute && surface.name === combinedSurfaceName
                            )
                            .map((el) => el.time_type)
                    )
                )
            );
            if (availableTimeTypes.includes(SurfaceTimeType_api.NO_TIME)) {
                availableTimeOrIntervals.push(SurfaceTimeType_api.NO_TIME);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.TIME_POINT)) {
                availableTimeOrIntervals.push(...this._fetchDataCache.time_points_iso_str);
            }
            if (availableTimeTypes.includes(SurfaceTimeType_api.INTERVAL)) {
                availableTimeOrIntervals.push(...this._fetchDataCache.time_intervals_iso_str);
            }
        }
        this._contextDelegate.setAvailableValues(SettingType.TIME_OR_INTERVAL, availableTimeOrIntervals);

        let currentTimeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (!currentTimeOrInterval || !availableTimeOrIntervals.includes(currentTimeOrInterval)) {
            if (availableTimeOrIntervals.length > 0) {
                currentTimeOrInterval = availableTimeOrIntervals[0];
                settings[SettingType.TIME_OR_INTERVAL].getDelegate().setValue(currentTimeOrInterval);
            }
        }
    }

    fetchData(oldValues: RealizationSurfaceSettings, newValues: RealizationSurfaceSettings): void {
        const queryClient = this.getDelegate().getLayerManager().getQueryClient();

        const settings = this.getDelegate().getSettings();

        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet.getEnsembleArr().map((ensemble) => ensemble.getIdent())
        );

        const availableEnsembleIdents = ensembleSet.getEnsembleArr().map((ensemble) => ensemble.getIdent());
        let currentEnsembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();

        // Fix up EnsembleIdent
        if (currentEnsembleIdent === null || !availableEnsembleIdents.includes(currentEnsembleIdent)) {
            if (availableEnsembleIdents.length > 0) {
                currentEnsembleIdent = availableEnsembleIdents[0];
                settings[SettingType.ENSEMBLE].getDelegate().setValue(currentEnsembleIdent);
            }
        }

        if (currentEnsembleIdent !== null) {
            const realizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(currentEnsembleIdent)
                .getFilteredRealizations();
            this.getDelegate().setAvailableValues(SettingType.REALIZATION, [...realizations]);

            const currentRealization = newValues[SettingType.REALIZATION];
            if (currentRealization === null || !realizations.includes(currentRealization)) {
                if (realizations.length > 0) {
                    settings[SettingType.REALIZATION].getDelegate().setValue(realizations[0]);
                }
            }
        }

        if (!isEqual(oldValues[SettingType.ENSEMBLE], currentEnsembleIdent)) {
            this._fetchDataCache = null;

            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_LAYER].getDelegate().setLoadingState(true);
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setLoadingState(true);

            settings[SettingType.TIME_OR_INTERVAL].getDelegate().setValue(null);

            queryClient
                .fetchQuery({
                    queryKey: [
                        "getRealizationSurfacesMetadata",
                        newValues[SettingType.ENSEMBLE],
                        newValues[SettingType.REALIZATION],
                    ],
                    queryFn: () =>
                        apiService.surface.getRealizationSurfacesMetadata(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                            newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? ""
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                })
                .then((response: SurfaceMetaSet) => {
                    this._fetchDataCache = response;
                    this.setAvailableSettingsValues();
                });
            return;
        }
        this.setAvailableSettingsValues();
    }

    areCurrentSettingsValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue() !== null &&
            settings[SettingType.SURFACE_NAME].getDelegate().getValue() !== null &&
            settings[SettingType.SURFACE_LAYER].getDelegate().getValue() !== null &&
            settings[SettingType.REALIZATION].getDelegate().getValue() !== null &&
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null &&
            settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue() !== null
        );
    }
}
