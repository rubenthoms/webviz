import { PolygonsAttributeType_api, PolygonsMeta_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingsContextDelegate } from "@modules/LayerSpike/layers/delegates/SettingsContextDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/LayerSpike/layers/queryConstants";
import { SettingType } from "@modules/LayerSpike/layers/settingsTypes";

import { isEqual } from "lodash";

import { RealizationFaultPolygonsSettings } from "./types";

import { SettingsContext } from "../../../interfaces";
import { Ensemble } from "../../settings/Ensemble";
import { Realization } from "../../settings/Realization";
import { SurfaceAttribute } from "../../settings/SurfaceAttribute";
import { SurfaceName } from "../../settings/SurfaceName";

export class RealizationFaultPolygonsContext implements SettingsContext<RealizationFaultPolygonsSettings> {
    private _contextDelegate: SettingsContextDelegate<RealizationFaultPolygonsSettings>;
    private _fetchDataCache: PolygonsMeta_api[] | null = null;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<
            RealizationFaultPolygonsSettings,
            keyof RealizationFaultPolygonsSettings
        >(this, {
            [SettingType.ENSEMBLE]: new Ensemble(),
            [SettingType.REALIZATION]: new Realization(),
            [SettingType.FAULT_POLYGONS_ATTRIBUTE]: new SurfaceAttribute(),
            [SettingType.SURFACE_NAME]: new SurfaceName(),
        });
    }

    getDelegate(): SettingsContextDelegate<RealizationFaultPolygonsSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    private setAvailableSettingsValues() {
        const settings = this.getDelegate().getSettings();
        settings[SettingType.FAULT_POLYGONS_ATTRIBUTE].getDelegate().setLoadingState(false);
        settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(false);

        if (!this._fetchDataCache) {
            return;
        }
        const faultPolygonAttributeTypes = [PolygonsAttributeType_api.FAULT_LINES, PolygonsAttributeType_api.DEPTH];

        const availableAttributes: string[] = [];
        availableAttributes.push(
            ...Array.from(
                new Set(
                    this._fetchDataCache
                        .filter((polygonsMeta) => faultPolygonAttributeTypes.includes(polygonsMeta.attribute_type))
                        .map((polygonsMeta) => polygonsMeta.attribute_name)
                )
            )
        );
        this._contextDelegate.setAvailableValues(SettingType.FAULT_POLYGONS_ATTRIBUTE, availableAttributes);

        let currentAttribute = settings[SettingType.FAULT_POLYGONS_ATTRIBUTE].getDelegate().getValue();
        if (!currentAttribute || !availableAttributes.includes(currentAttribute)) {
            if (availableAttributes.length > 0) {
                currentAttribute = availableAttributes[0];
                settings[SettingType.FAULT_POLYGONS_ATTRIBUTE].getDelegate().setValue(currentAttribute);
            }
        }

        const availableSurfaceNames: string[] = [];

        if (currentAttribute) {
            availableSurfaceNames.push(
                ...Array.from(
                    new Set(
                        this._fetchDataCache
                            .filter((polygonsMeta) => polygonsMeta.attribute_name === currentAttribute)
                            .map((el) => el.name)
                    )
                )
            );
        }
        this._contextDelegate.setAvailableValues(SettingType.SURFACE_NAME, availableSurfaceNames);

        let currentSurfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        if (!currentSurfaceName || !availableSurfaceNames.includes(currentSurfaceName)) {
            if (availableSurfaceNames.length > 0) {
                currentSurfaceName = availableSurfaceNames[0];
                settings[SettingType.SURFACE_NAME].getDelegate().setValue(currentSurfaceName);
            }
        }
    }

    fetchData(oldValues: RealizationFaultPolygonsSettings, newValues: RealizationFaultPolygonsSettings): void {
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

            settings[SettingType.FAULT_POLYGONS_ATTRIBUTE].getDelegate().setLoadingState(true);
            settings[SettingType.SURFACE_NAME].getDelegate().setLoadingState(true);

            queryClient
                .fetchQuery({
                    queryKey: ["getPolygonsDirectory", newValues[SettingType.ENSEMBLE]],
                    queryFn: () =>
                        apiService.polygons.getPolygonsDirectory(
                            newValues[SettingType.ENSEMBLE]?.getCaseUuid() ?? "",
                            newValues[SettingType.ENSEMBLE]?.getEnsembleName() ?? ""
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                })
                .then((response: PolygonsMeta_api[]) => {
                    this._fetchDataCache = response;
                    this.setAvailableSettingsValues();
                });
            return;
        }
        this.setAvailableSettingsValues();
    }

    isValid(): boolean {
        const settings = this.getDelegate().getSettings();
        return (
            settings[SettingType.FAULT_POLYGONS_ATTRIBUTE].getDelegate().getValue() !== null &&
            settings[SettingType.SURFACE_NAME].getDelegate().getValue() !== null &&
            settings[SettingType.REALIZATION].getDelegate().getValue() !== null &&
            settings[SettingType.ENSEMBLE].getDelegate().getValue() !== null
        );
    }
}
