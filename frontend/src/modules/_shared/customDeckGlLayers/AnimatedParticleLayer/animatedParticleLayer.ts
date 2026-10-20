/**
 * A layer that animates particles moving around a grid.
 */

import type { Color, DefaultProps, LayerContext, UpdateParameters } from "@deck.gl/core";
import { Layer, project32 } from "@deck.gl/core";
import type { RenderPass } from "@luma.gl/core";
import { Model, Geometry } from "@luma.gl/engine";

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
        grid: [],
        color: [255, 0, 0, 255],
    };

    declare state: {
        // TODO: Clean up state objects
        particleCount: number;
        particles: Float32Array[];

        dataLoaded: boolean;
        renderModel?: Model;
    };

    initializeState(context: LayerContext): void {
        this.setState({ dataLoaded: false });
        this.setupParticles();
    }

    override getShaders(shaders?: any) {
        return super.getShaders({
            ...shaders,
            modules: [project32],
        });
    }

    updateState(params: UpdateParameters<AnimatedParticleLayer>): void {
        // TODO
    }

    finalizeState(context: LayerContext): void {
        // TODO
    }

    draw(opts: {
        renderPass: RenderPass;
        shaderModuleProps: any;
        uniforms: any;
        parameters: any;
        context: LayerContext;
    }): void {
        // TODO
        const { renderModel } = this.state;

        if (!renderModel) return;

        renderModel.draw(opts.renderPass);
    }

    private createGridCellBuffers() {
        const device = this.context.device;
        const buffer = new Float32Array(this.props.grid.length * CELL_TOTAL_SIZE);

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

        // Particles are geometry points
        const pointGeometry = new Geometry({
            topology: "point-list",
            vertexCount: 1,

            attributes: {
                positions: { size: 3, value: new Float32Array([0, 0, 0]) },
                // gridIndex: { size: 1, value: new Float32Array([0]) },
            },
        });

        const renderModel = new Model(device, {
            ...this.getShaders({}),
            id: `${this.props.id}-render`,
            // modules: [random, this.getShaders],
            vs: vertexShader,
            fs: fragmentShader,
            geometry: pointGeometry,

            // TODO: clean up these
            // shaderInputs: new ShaderInputs({
            //     grid: {name: "grid", }
            //     // grid: gridBuffer,
            // }),

            // instanceCount: this.props.numParticles,
            // bindings: {
            //     grid: gridBuffer,
            // },
            // uniforms: { grid: gridBuffer },
            // bindings: { gridData: gridBuffer },
            // parameters: {
            //     depthWriteEnabled: false,
            //     depthCompare: "always",
            //     blend: true,
            //     blendColorOperation: "add",
            //     blendColorSrcFactor: "src-alpha",
            //     blendColorDstFactor: "one",
            //     blendAlphaOperation: "add",
            //     blendAlphaSrcFactor: "one",
            //     blendAlphaDstFactor: "one",
            // },
        });

        this.setState({
            renderModel: renderModel,
            gridBuffer: gridBuffer,
        });

        return {
            renderModel,
        };
    }
}

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

// Partially copied from src/modules/_shared/customDeckGlLayers/WellsLayer/_private/shaders/vertexShader.glsl
const vertexShader = /*glsl*/ `\
#version 300 es

in vec3 positions;

out vec4 projectedPosition;

void main() {
    vec4 position_commonspace = vec4(project_position(positions), 0.0);

    geometry.position = position_commonspace;

    // ! FIXME: When I do position like this, nothing appears
    gl_Position = project_common_position_to_clipspace(position_commonspace);

    // This renders the point correctly, so likely just some incorrect use of projection? 
    //    gl_Position = vec4(0.0, 0.0, 0.0, 1.0); // Center of the screen in clip space
    
    
    gl_PointSize = 12.0; // Adjust point size as needed
    
    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
    vec4 color = vec4(0.0f);
    DECKGL_FILTER_COLOR(color, geometry);
}
`;

const fragmentShader = /*glsl*/ `\
#version 300 es

precision highp float;

out vec4 fragColor;

void main() {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color with full opacity
}
`;
