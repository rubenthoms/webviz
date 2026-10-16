/**
 * A layer that animates particles moving around a grid.
 */

import type { Accessor, Color, DefaultProps, LayerContext, UpdateParameters } from "@deck.gl/core";
import { _mergeShaders, Layer } from "@deck.gl/core";
import type { RenderPass } from "@luma.gl/core";
import { Shader, Buffer as LumaBuffer } from "@luma.gl/core";
import { Model, Geometry, BufferTransform, ShaderInputs } from "@luma.gl/engine";
import { random } from "@luma.gl/shadertools";
import { TextureShader } from "pixi.js";

export type AnimatedParticleLayerProps = {
    numParticles: number;
    grid: GridCell[];
    color: Color;

    // getVelocity: Accessor<TData, number[]>;
    // paused: boolean;
};

const CELL_NEIGHBOR_INDEX_SIZE = 6;
const CELL_FACE_VELOCITY_SIZE = 6 * (3 + 1); // Buffer storage expects padding on vectors
const CELL_CORNER_SIZE = 8 * (3 + 1); // Buffer storage expects padding on vectors
const CELL_TOTAL_SIZE = CELL_NEIGHBOR_INDEX_SIZE + CELL_FACE_VELOCITY_SIZE + CELL_CORNER_SIZE;

export class AnimatedParticleLayer extends Layer<AnimatedParticleLayerProps> {
    static layerName = "AnimatedParticleLayer";
    static defaultProps: DefaultProps<AnimatedParticleLayerProps> = {
        numParticles: 1_000,
    };

    declare state: {
        particleCount: number;
        particles: Float32Array[];

        // TODO: Check need for these
        dataLoaded: boolean;

        renderModel?: Model;
    };

    initializeState(context: LayerContext): void {
        // const { gl } = this.context;

        // if()

        this.setState({ dataLoaded: false });
        // this.createGridCellBuffers();
        this.setupParticles();

        //     // this.context.device.info.shadingLanguage
        //     this.getAttributeManager({
        //     })
    }

    getShaders(shaders: any) {
        return {
            ...super.getShaders(shaders),
            inject: {},
        };
    }

    updateState(params: UpdateParameters<AnimatedParticleLayer<TData>>): void {
        // TODO
    }

    // private initParticles(numParticles: number) {
    //     // const particles = new
    // }

    draw(opts: {
        renderPass: RenderPass;
        shaderModuleProps: any;
        uniforms: any;
        parameters: any;
        context: LayerContext;
    }): void {
        // TODO
    }

    private getModel() {
        // return new Model
    }

    private createGridCellBuffers() {
        const device = this.context.device;
        const buffer = new Float32Array(this.props.grid.length * CELL_TOTAL_SIZE);

        console.log("Cell byte size", CELL_TOTAL_SIZE);

        // Flatten cell data structure to
        for (let i = 0; i < this.props.grid.length; i++) {
            const cell = this.props.grid[i];

            const offset = i * CELL_TOTAL_SIZE;
            let localPos = 0;

            // Cell corners
            for (const corner of cell.corners) {
                buffer[offset + localPos++] = corner[0];
                buffer[offset + localPos++] = corner[1];
                buffer[offset + localPos++] = corner[2];
                localPos++; // Padding
            }

            // Cell corners
            for (const velocity of cell.faceVelocities) {
                buffer[offset + localPos++] = velocity[0];
                buffer[offset + localPos++] = velocity[1];
                buffer[offset + localPos++] = velocity[2];
                localPos++; // Padding
            }

            for (const neighbor of cell.neighborIndices) {
                buffer[offset + localPos++] = neighbor;
            }
        }

        return device.createBuffer(buffer);
    }

    private setupParticles() {
        const device = this.context.device;
        const gridBuffer = this.createGridCellBuffers();

        // --- This one was based on line-layer, maybe not relevant?
        // const particleCellIndices = device.createBuffer(new Float32Array(this.props.numParticles));
        // const particlePositions = device.createBuffer(
        //     // Particle positions are UVW; relative to the cells corners
        //     new Float32Array(this.props.numParticles * 3),
        // );

        // const transform = new BufferTransform(device, {
        //     attributes: {
        //         position: particlePositions,
        //         cellIndex: particleCellIndices,
        //     },
        //     bufferLayout: [
        //         { name: "position", format: "float32x3" },
        //         { name: "cellIndex", format: "float32" },
        //     ],
        //     feedback
        // });

        // -----------

        // Particles are geometry points
        const pointGeometry = new Geometry({
            topology: "point-list",
            attributes: {
                positions: { size: 3, value: new Float32Array([0, 0, 0]) },
            },
        });

        const renderModel = new Model(device, {
            id: `${this.props.id}-render`,
            modules: [random],
            vs: vertexShader,
            geometry: pointGeometry,
            // shaderInputs: new ShaderInputs({
            //     grid: {name: "grid", }
            //     // grid: gridBuffer,
            // }),

            instanceCount: this.props.numParticles,
            // bindings: {
            //     grid: gridBuffer,
            // },
            // TODO: Is this correct???
            // uniforms: { grid: gridBuffer },
            bindings: { gridData: gridBuffer },
            parameters: {
                // TODO: Check what these do...
                // depthWriteEnabled: false,
                // depthCompare: "always",
                // blend: true,
                // blendColorOperation: "add",
                // blendColorSrcFactor: "src-alpha",
                // blendColorDstFactor: "one",
                // blendAlphaOperation: "add",
                // blendAlphaSrcFactor: "one",
                // blendAlphaDstFactor: "one",
            },
        });

        return {
            renderModel,
        };
    }
}

// function generateParticleCloud(numberOfParticles: number): Float32Array {
//     // Each particle needs 4 positional values: u, v, w, and cell-index
//     // Real world position is then based on the
//     // const particlePositionData=
// }

//
// function generatePositions();

export type GridCell = {
    corners: number[][];
    faceVelocities: number[][];
    neighborIndices: number[];
};

// const gridCellUniformBlock = /*glsl*/ `
// struct GridCell {
//     vec3 corners[8]
//     vec3 face_velocities[6]
//     int neighbor_indices[6]
// }
// `;

const vertexShader = /*glsl*/ `
#version 300 es

// struct GridData

layout(std430, binding = 0) readonly buffer GridData

in vec3 positions;

vec3 random_scale = vec3(12.9898, 78.233, 151.7182);

void main() {
        
}
`;
