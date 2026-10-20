import { OrbitView } from "@deck.gl/core";
import type { Meta, StoryObj } from "@storybook/react";
import type { BoundingBox3D } from "@webviz/subsurface-viewer";
import SubsurfaceViewer from "@webviz/subsurface-viewer";
import { AxesLayer } from "@webviz/subsurface-viewer/dist/layers";

import type { AnimatedParticleLayerProps } from "./animatedParticleLayer";

import { AnimatedParticleLayer } from "./";

type Story = StoryObj<AnimatedParticleLayerProps>;
const meta: Meta<AnimatedParticleLayerProps> = {
    // component: AnimatedParticleLayer,
    title: "CustomDeckGlLayers/AnimatedParticleLayer",
    render: (args) => {
        const bounds: BoundingBox3D = [
            10,
            10,
            10,
            -10,
            -10,
            -10, // min x, y, z
        ];

        const layers = [
            new AxesLayer({
                id: "axes",
                bounds,
                ZIncreasingDownwards: true,
            }),
            new AnimatedParticleLayer({
                id: "animated-particle-layer",
                ...args,
            }),
        ];

        return (
            <div className="relative" style={{ width: "100%", height: "1000px" }}>
                <SubsurfaceViewer
                    id={"test"}
                    layers={layers}
                    views={{
                        layout: [1, 1],

                        viewports: [
                            {
                                id: "v1",
                                name: "v1",
                                viewType: OrbitView,
                                layerIds: ["axes", "animated-particle-layer"],
                            },
                        ],
                    }}
                />
            </div>
        );
    },
};

export default meta;

export const Default: Story = {};
// export const Default = Template.bind({});

// Default.args = {
//     particleCount: 1000,
//     particleSpeed: 1,
//     particleSize: 5,
//     color: [255, 0, 0, 255], // Red color
// };
