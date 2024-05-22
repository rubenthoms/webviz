import { SeismicFenceData_api } from "@api";
import { IntersectionReferenceSystem, generateSeismicSliceImage } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScale } from "@lib/utils/ColorScale";
import { SeismicDataType, SeismicSliceImageOptions, SeismicSurveyType } from "@modules/Intersection/typesAndEnums";
import { ColorScaleWithName } from "@modules/Intersection/view/utils/ColorScaleWithName";
import { b64DecodeFloatArrayToFloat32 } from "@modules/_shared/base64";
import { QueryClient } from "@tanstack/query-core";

import { BaseLayer, LayerStatus, LayerTopic } from "./BaseLayer";

// Data structure for transformed data
// Remove the base64 encoded data and replace with a Float32Array
export type SeismicFenceData_trans = Omit<SeismicFenceData_api, "fence_traces_b64arr"> & {
    fenceTracesFloat32Arr: Float32Array;
};

export function transformSeismicFenceData(apiData: SeismicFenceData_api): SeismicFenceData_trans {
    const startTS = performance.now();

    const { fence_traces_b64arr, ...untransformedData } = apiData;
    const dataFloat32Arr = b64DecodeFloatArrayToFloat32(fence_traces_b64arr);

    console.debug(`transformSurfaceData() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        fenceTracesFloat32Arr: dataFloat32Arr,
    };
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SeismicLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    realizationNum: number | null;
    intersectionReferenceSystem: IntersectionReferenceSystem | null;
    extensionLength: number;
    surveyType: SeismicSurveyType;
    dataType: SeismicDataType;
    attribute: string | null;
    dateOrInterval: string | null;
};

export type SeismicLayerData = {
    image: ImageBitmap | null;
    options: SeismicSliceImageOptions | null;
};

export class SeismicLayer extends BaseLayer<SeismicLayerSettings, SeismicLayerData> {
    private _colorScalesParameterMap: Map<string, ColorScale> = new Map();
    private _useCustomColorScaleBoundariesParameterMap = new Map<string, boolean>();

    constructor(name: string, queryClient: QueryClient) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
            intersectionReferenceSystem: null,
            extensionLength: 0,
            surveyType: SeismicSurveyType.THREE_D,
            dataType: SeismicDataType.SIMULATED,
            attribute: null,
            dateOrInterval: null,
        };
        super(name, defaultSettings, queryClient);
    }

    getColorScale(): ColorScaleWithName {
        const colorScale = this._colorScalesParameterMap.get(this._settings.attribute ?? "") ?? this._colorScale;
        return ColorScaleWithName.fromColorScale(colorScale, this._settings.attribute ?? "");
    }

    setColorScale(colorScale: ColorScale): void {
        this.notifySubscribers(LayerTopic.COLORSCALE);
        this._colorScalesParameterMap.set(this._settings.attribute ?? "", colorScale);
        this._status = LayerStatus.LOADING;
        this.notifySubscribers(LayerTopic.STATUS);
        this.fetchData()
            .then(() => {
                this.notifySubscribers(LayerTopic.DATA);
                this._status = LayerStatus.SUCCESS;
                this.notifySubscribers(LayerTopic.STATUS);
            })
            .catch(() => {
                this._status = LayerStatus.ERROR;
                this.notifySubscribers(LayerTopic.STATUS);
            });
    }

    getUseCustomColorScaleBoundaries(): boolean {
        return this._useCustomColorScaleBoundariesParameterMap.get(this._settings.attribute ?? "") ?? false;
    }

    setUseCustomColorScaleBoundaries(useCustomColorScaleBoundaries: boolean): void {
        this._useCustomColorScaleBoundariesParameterMap.set(
            this._settings.attribute ?? "",
            useCustomColorScaleBoundaries
        );
        this.notifySubscribers(LayerTopic.COLORSCALE);
    }

    protected areSettingsValid(): boolean {
        return (
            this._settings.ensembleIdent !== null &&
            this._settings.realizationNum !== null &&
            this._settings.intersectionReferenceSystem !== null &&
            this._settings.attribute !== null &&
            this._settings.dateOrInterval !== null
        );
    }

    protected async fetchData(): Promise<SeismicLayerData> {
        const polyline =
            this._settings.intersectionReferenceSystem?.getExtendedTrajectory(
                1000,
                this._settings.extensionLength,
                this._settings.extensionLength
            ).points ?? [];

        const xPoints: number[] = [];
        const yPoints: number[] = [];
        for (let i = 0; i < polyline.length; i++) {
            xPoints.push(polyline[i][0]);
            yPoints.push(polyline[i][1]);
        }

        return this._queryClient
            .fetchQuery({
                queryKey: [
                    "postGetSeismicFence",
                    this._settings.ensembleIdent?.getCaseUuid() ?? "",
                    this._settings.ensembleIdent?.getEnsembleName() ?? "",
                    this._settings.realizationNum ?? 0,
                    this._settings.attribute ?? "",
                    this._settings.dateOrInterval ?? "",
                    this._settings.intersectionReferenceSystem,
                    this._settings.extensionLength,
                ],
                queryFn: () =>
                    apiService.seismic.postGetSeismicFence(
                        this._settings.ensembleIdent?.getCaseUuid() ?? "",
                        this._settings.ensembleIdent?.getEnsembleName() ?? "",
                        this._settings.realizationNum ?? 0,
                        this._settings.attribute ?? "",
                        this._settings.dateOrInterval ?? "",
                        this._settings.dataType === SeismicDataType.OBSERVED,
                        { polyline: { x_points: xPoints, y_points: yPoints } }
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((data) => transformSeismicFenceData(data))
            .then(async (data) => {
                const datapoints = createSeismicSliceImageDatapointsArrayFromFenceData(data);
                const yAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(data);

                if (this._settings.intersectionReferenceSystem === null) {
                    throw new Error("No intersection reference system set");
                }

                const trajectory = this._settings.intersectionReferenceSystem.getExtendedTrajectory(
                    data.num_traces,
                    this._settings.extensionLength,
                    this._settings.extensionLength
                );
                const trajectoryXyProjection = IntersectionReferenceSystem.toDisplacement(
                    trajectory.points,
                    trajectory.offset
                );

                const options: SeismicSliceImageOptions = {
                    datapoints,
                    yAxisValues,
                    trajectory: trajectoryXyProjection,
                    colorScale: this.getColorScale(),
                };
                const colormap = options.colorScale.getColorPalette().getColors();

                const image = await generateSeismicSliceImage({ ...options }, options.trajectory, colormap, {
                    isLeftToRight: true,
                })
                    .then((result) => {
                        return result ?? null;
                    })
                    .catch(() => {
                        return null;
                    });

                return {
                    image,
                    options,
                };
            });
    }
}

export function isSeismicLayer(layer: BaseLayer<any, any>): layer is SeismicLayer {
    return layer instanceof SeismicLayer;
}

/**
 * Utility function to convert the 1D array of values from the fence data to a 2D array of values
 * for the seismic slice image.
 *
 * For the bit map image, the values are provided s.t. a seismic trace is a column in the image,
 * thus the data will be transposed.
 *
 * trace a,b,c and d
 *
 * num_traces = 4
 * num_samples_per_trace = 3
 * fence_traces = [a1, a2, a3, b1, b2, b3, c1, c2, c3, d1, d2, d3]
 *
 * Image:
 *
 * a1 b1 c1 d1
 * a2 b2 c2 d2
 * a3 b3 c3 d3
 */
export function createSeismicSliceImageDatapointsArrayFromFenceData(
    fenceData: SeismicFenceData_trans,
    fillValue = 0
): number[][] {
    const datapoints: number[][] = [];

    const numTraces = fenceData.num_traces;
    const numSamples = fenceData.num_samples_per_trace;
    const fenceValues = fenceData.fenceTracesFloat32Arr;

    for (let i = 0; i < numSamples; ++i) {
        const row: number[] = [];
        for (let j = 0; j < numTraces; ++j) {
            const index = i + j * numSamples;
            const fenceValue = fenceValues[index];
            const validFenceValue = Number.isNaN(fenceValue) ? fillValue : fenceValue;
            row.push(validFenceValue);
        }
        datapoints.push(row);
    }
    return datapoints;
}

/**
 * Utility to create an array of values for the Y axis of the seismic slice image. I.e. depth values
 * for the seismic depth axis.
 */
export function createSeismicSliceImageYAxisValuesArrayFromFenceData(fenceData: SeismicFenceData_trans): number[] {
    const yAxisValues: number[] = [];

    const numSamples = fenceData.num_samples_per_trace;
    const minDepth = fenceData.min_fence_depth;
    const maxDepth = fenceData.max_fence_depth;

    for (let i = 0; i < numSamples; ++i) {
        yAxisValues.push(minDepth + ((maxDepth - minDepth) / numSamples) * i);
    }
    return yAxisValues;
}
