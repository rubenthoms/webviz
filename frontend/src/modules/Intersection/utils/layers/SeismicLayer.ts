import { SeismicFenceData_api } from "@api";
import { IntersectionReferenceSystem, generateSeismicSliceImage } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultContinuousDivergingColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { SeismicDataType, SeismicSurveyType } from "@modules/Intersection/typesAndEnums";
import { ColorScaleWithName } from "@modules/Intersection/view/utils/ColorScaleWithName";
import { b64DecodeFloatArrayToFloat32 } from "@modules/_shared/base64";
import { QueryClient } from "@tanstack/query-core";

import { BaseLayer, BoundingBox, LayerStatus, LayerTopic } from "./BaseLayer";

export type SeismicSliceImageOptions = {
    datapoints: number[][];
    yAxisValues: number[];
    trajectory: number[][];
    colorScale: ColorScale;
};

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
    options: SeismicSliceImageOptions;
    seismicFenceData: SeismicFenceData_trans;
};

export class SeismicLayer extends BaseLayer<SeismicLayerSettings, SeismicLayerData> {
    private _defaultColorScale: ColorScale;
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

        this._defaultColorScale = new ColorScale({
            colorPalette: defaultContinuousDivergingColorPalettes[0],
            gradientType: ColorScaleGradientType.Diverging,
            type: ColorScaleType.Continuous,
            steps: 10,
        });
    }

    private makeColorScaleAddress(): string | null {
        if (this._settings.attribute === null) {
            return null;
        }
        return `${this._settings.surveyType}-${this._settings.attribute ?? ""}`;
    }

    getColorScale(): ColorScaleWithName {
        const addr = this.makeColorScaleAddress();
        let colorScale = this._defaultColorScale;
        if (addr !== null) {
            colorScale = this._colorScalesParameterMap.get(addr) ?? this._defaultColorScale;
        }
        return ColorScaleWithName.fromColorScale(colorScale, this._settings.attribute ?? super.getName());
    }

    setColorScale(colorScale: ColorScale): void {
        const addr = this.makeColorScaleAddress();

        if (addr === null) {
            return;
        }

        this._colorScalesParameterMap.set(addr, colorScale);
        this.notifySubscribers(LayerTopic.DATA);

        if (!this._data) {
            return;
        }

        /*
        When already loading, we don't want to update the seismic image with the old data set
        */
        if (this._status === LayerStatus.LOADING) {
            return;
        }

        this._status = LayerStatus.LOADING;
        this.notifySubscribers(LayerTopic.STATUS);
        this.generateImage(this._data.seismicFenceData)
            .then((data) => {
                this._data = data;
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
        this.notifySubscribers(LayerTopic.DATA);
    }

    getBoundingBox(): BoundingBox | null {
        if (!this._data) {
            return null;
        }

        const xMin =
            this._data.options.trajectory.reduce((acc: number, val: number[]) => Math.min(acc, val[0]!), 0) -
            this._settings.extensionLength;
        const xMax =
            this._data.options.trajectory.reduce((acc: number, val: number[]) => Math.max(acc, val[0]!), 0) -
            this._settings.extensionLength;

        const minTvdMsl = this._data.options.yAxisValues && this._data.options.yAxisValues[0]!;
        const maxTvdMsl =
            this._data.options.yAxisValues &&
            this._data.options.yAxisValues[this._data.options.yAxisValues.length - 1]!;

        return {
            x: [xMin, xMax],
            y: [minTvdMsl, maxTvdMsl],
            z: [this._data.seismicFenceData.min_fence_depth, this._data.seismicFenceData.max_fence_depth],
        };
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

    private async generateImage(data: SeismicFenceData_trans): Promise<SeismicLayerData> {
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
        const trajectoryXyProjection = IntersectionReferenceSystem.toDisplacement(trajectory.points, trajectory.offset);

        const options: SeismicSliceImageOptions = {
            datapoints,
            yAxisValues,
            trajectory: trajectoryXyProjection,
            colorScale: this.getColorScale(),
        };
        const colormap = options.colorScale.sampleColors(options.colorScale.getNumSteps() || 10);

        const image = await generateSeismicSliceImage({ ...options }, options.trajectory, colormap, {
            isLeftToRight: true,
            seismicMin: this.getUseCustomColorScaleBoundaries() ? options.colorScale.getMin() : undefined,
            seismicMax: this.getUseCustomColorScaleBoundaries() ? options.colorScale.getMax() : undefined,
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
            seismicFenceData: data,
        };
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
                return this.generateImage(data);
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
