/*
 * Copyright (c) 2021-2023 WeatherLayers.com
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Color, DefaultProps, LayerContext, TextureSource, UpdateParameters } from "@deck.gl/core";
import { LineLayer, LineLayerProps } from "@deck.gl/layers";
import { Buffer, Device, luma } from "@luma.gl/core";
import { Model, Transform } from "@luma.gl/engine";

// import { isWebGL2 } from "@luma.gl/gltools";
import updateTransformVs from "./particle-layer-update-transform.vs.glsl.js";

const FPS = 30;

const DEFAULT_COLOR: Color = [255, 255, 255, 255];

/** All properties supported by LineLayer. */
export type FlowLayerProps = _FlowLayerProps & Omit<LineLayerProps, "data">;

/** Properties added by LineLayer. */
type _FlowLayerProps = {
    image?: string | TextureSource | null;
    imageUnscale: number[] | null;

    numParticles: number;
    maxAge: number;
    speedFactor: number;

    color: Color;
    width: number;
    animate: boolean;

    bounds: [number, number, number, number];
};

const defaultProps: DefaultProps<FlowLayerProps> = {
    // ...LineLayer.defaultProps,

    image: { type: "image", value: null, async: true },
    imageUnscale: { type: "array", value: null },

    numParticles: { type: "number", min: 1, max: 1000000, value: 5000 },
    maxAge: { type: "number", min: 1, max: 255, value: 100 },
    speedFactor: { type: "number", min: 0, max: 1, value: 1 },

    color: { type: "color", value: DEFAULT_COLOR },
    width: { type: "number", value: 1 },
    animate: true,

    bounds: { type: "array", value: [-180, -90, 180, 90], compare: true },
    wrapLongitude: true,
};

export class FlowLayer extends LineLayer<any, FlowLayerProps> {
    private _device: Device | null = null;

    static layerName = "FlowLayer";
    static defaultProps = defaultProps;

    // @ts-ignore
    state!: {
        model: Model;
        initialized: boolean;
        numInstances?: number;
        numAgedInstances?: number;
        sourcePositions?: Buffer;
        targetPositions?: Buffer;
        sourcePositions64Low?: Buffer;
        targetPositions64Low?: Buffer;
        colors?: Buffer;
        widths?: Buffer;
        transform?: Transform;
        previousViewportZoom?: number;
        previousTime?: number;
        stepRequested?: boolean;
    };

    constructor(props: FlowLayerProps) {
        super(props);
        luma.enforceWebGL2();
        luma.attachDevice({ handle: this.context.gl as WebGL2RenderingContext }).then((device) => {
            this._device = device;
        });
    }

    getShaders() {
        return {
            ...super.getShaders(),
            inject: {
                "vs:#decl": `
          varying float drop;
          const vec2 DROP_POSITION = vec2(0);
        `,
                "vs:#main-start": `
          drop = float(instanceSourcePositions.xy == DROP_POSITION || instanceTargetPositions.xy == DROP_POSITION);
        `,
                "fs:#decl": `
          varying float drop;
        `,
                "fs:#main-start": `
          if (drop > 0.5) discard;
        `,
            },
        };
    }

    initializeState() {
        const { gl } = this.context;
        /*  if (!isWebGL2(gl)) {
            throw new Error("WebGL 2 is required");
        } */

        super.initializeState();

        this._setupTransformFeedback();

        const attributeManager = this.getAttributeManager();
        if (attributeManager) {
            attributeManager.remove([
                "instanceSourcePositions",
                "instanceTargetPositions",
                "instanceColors",
                "instanceWidths",
            ]);
        }
    }

    updateState({ props, oldProps, changeFlags, context }: UpdateParameters<this>) {
        const { numParticles, maxAge, color, width } = props;

        super.updateState({ props, oldProps, changeFlags, context });

        if (!numParticles || !maxAge || !width) {
            this._deleteTransformFeedback();
            return;
        }

        if (
            numParticles !== oldProps.numParticles ||
            maxAge !== oldProps.maxAge ||
            color[0] !== oldProps.color[0] ||
            color[1] !== oldProps.color[1] ||
            color[2] !== oldProps.color[2] ||
            color[3] !== oldProps.color[3] ||
            width !== oldProps.width
        ) {
            this._setupTransformFeedback();
        }
    }

    finalizeState(context: LayerContext) {
        this._deleteTransformFeedback();

        super.finalizeState(context);
    }

    draw({ uniforms }) {
        const { gl } = this.context;
        /* if (!isWebGL2(gl)) {
            return;
        } */

        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const { animate } = this.props;
        const { sourcePositions, targetPositions, sourcePositions64Low, targetPositions64Low, colors, widths, model } =
            this.state;

        if (
            !sourcePositions ||
            !targetPositions ||
            !sourcePositions64Low ||
            !targetPositions64Low ||
            !colors ||
            !widths
        ) {
            return;
        }

        model.setAttributes({
            instanceSourcePositions: sourcePositions,
            instanceTargetPositions: targetPositions,
            instanceSourcePositions64Low: sourcePositions64Low,
            instanceTargetPositions64Low: targetPositions64Low,
            instanceColors: colors,
            instanceWidths: widths,
        });

        super.draw({ uniforms });

        if (animate) {
            this.requestStep();
        }
    }

    _setupTransformFeedback() {
        const { gl } = this.context;
        /* if (!isWebGL2(gl)) {
            return;
        } */

        if (!this._device) {
            return;
        }

        const { initialized } = this.state;
        if (initialized) {
            this._deleteTransformFeedback();
        }

        const { numParticles, maxAge, color, width } = this.props;

        // sourcePositions/targetPositions buffer layout:
        // |          age0         |          age1         |          age2         |...|          ageN         |
        // |pos1,pos2,pos3,...,posN|pos1,pos2,pos3,...,posN|pos1,pos2,pos3,...,posN|...|pos1,pos2,pos3,...,posN|
        const numInstances = numParticles * maxAge;
        const numAgedInstances = numParticles * (maxAge - 1);
        const sourcePositions = this._device.createBuffer(new Float32Array(numInstances * 3));
        const targetPositions = this._device.createBuffer(new Float32Array(numInstances * 3));
        const sourcePositions64Low = new Float32Array([0, 0, 0]); // constant attribute
        const targetPositions64Low = new Float32Array([0, 0, 0]); // constant attribute
        const colors = this._device.createBuffer(
            new Float32Array(
                new Array(numInstances)
                    .fill(undefined)
                    .map((_, i) => {
                        const age = Math.floor(i / numParticles);
                        return [color[0], color[1], color[2], (color[3] ?? 255) * (1 - age / maxAge)].map(
                            (d) => d / 255
                        );
                    })
                    .flat()
            )
        );
        const widths = new Float32Array([width]); // constant attribute

        const transform = new Transform(this._device, {
            // @ts-ignore
            sourceBuffers: {
                sourcePosition: sourcePositions,
            },
            feedbackBuffers: {
                targetPosition: targetPositions,
            },
            feedbackMap: {
                sourcePosition: "targetPosition",
            },
            vs: updateTransformVs,
            elementCount: numParticles,
        });

        this.setState({
            initialized: true,
            numInstances,
            numAgedInstances,
            sourcePositions,
            targetPositions,
            sourcePositions64Low,
            targetPositions64Low,
            colors,
            widths,
            transform,
        });
    }

    _runTransformFeedback() {
        const { gl } = this.context;
        /* if (!isWebGL2(gl)) {
            return;
        } */

        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const { viewport, timeline } = this.context;
        const { image, imageUnscale, bounds, numParticles, speedFactor, maxAge } = this.props;
        const { numAgedInstances, transform, previousViewportZoom, previousTime } = this.state;
        const time = timeline.getTime();
        if (!image || time === previousTime) {
            return;
        }

        if (previousViewportZoom && transform && numAgedInstances) {
            // viewport
            const viewportBounds = viewport.getBounds();
            const viewportZoomChangeFactor = 2 ** ((previousViewportZoom - viewport.zoom) * 4);

            // speed factor for current zoom level
            const currentSpeedFactor = speedFactor / 2 ** (viewport.zoom + 7);

            // update particles age0
            const uniforms = {
                viewportBounds: viewportBounds || [0, 0, 0, 0],
                viewportZoomChangeFactor: viewportZoomChangeFactor || 0,

                bitmapTexture: image,
                imageUnscale: imageUnscale || [0, 0],
                bounds,
                numParticles,
                maxAge,
                speedFactor: currentSpeedFactor,

                time,
                seed: Math.random(),
            };
            transform.run({ ...uniforms });

            // update particles age1-age(N-1)
            // copy age0-age(N-2) sourcePositions to age1-age(N-1) targetPositions
            const sourcePositions =
                transform.getBuffer("").bufferTransform.bindings[transform.bufferTransform.currentIndex].sourceBuffers
                    .sourcePosition;
            const targetPositions =
                transform.bufferTransform.bindings[transform.bufferTransform.currentIndex].feedbackBuffers
                    .targetPosition;
            sourcePositions.copyData({
                sourceBuffer: targetPositions,
                readOffset: 0,
                writeOffset: numParticles * 4 * 3,
                size: numAgedInstances * 4 * 3,
            });

            transform.swap();
        }

        // const {sourcePositions, targetPositions} = this.state;
        // console.log(uniforms, sourcePositions.getData().slice(0, 6), targetPositions.getData().slice(0, 6));

        this.state.previousViewportZoom = viewport.zoom;
        this.state.previousTime = time;
    }

    _resetTransformFeedback() {
        const { gl } = this.context;
        /* if (!isWebGL2(gl)) {
            return;
        } */

        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const { numInstances, sourcePositions, targetPositions } = this.state;

        if (!sourcePositions || !targetPositions || !numInstances) {
            return;
        }

        sourcePositions.write(new Float32Array(numInstances * 3));
        targetPositions.write(new Float32Array(numInstances * 3));
    }

    _deleteTransformFeedback() {
        const { gl } = this.context;
        /* if (!isWebGL2(gl)) {
            return;
        } */

        const { initialized } = this.state;
        if (!initialized) {
            return;
        }

        const { sourcePositions, targetPositions, colors, transform } = this.state;

        sourcePositions?.destroy();
        targetPositions?.destroy();
        colors?.destroy();
        transform.delete();

        this.setState({
            initialized: false,
            sourcePositions: undefined,
            targetPositions: undefined,
            sourcePositions64Low: undefined,
            targetPositions64Low: undefined,
            colors: undefined,
            widths: undefined,
            transform: undefined,
        });
    }

    requestStep() {
        const { stepRequested } = this.state;
        if (stepRequested) {
            return;
        }

        this.state.stepRequested = true;
        setTimeout(() => {
            this.step();
            this.state.stepRequested = false;
        }, 1000 / FPS);
    }

    step() {
        this._runTransformFeedback();

        this.setNeedsRedraw();
    }

    clear() {
        this._resetTransformFeedback();

        this.setNeedsRedraw();
    }
}

FlowLayer.layerName = "ParticleLayer";
