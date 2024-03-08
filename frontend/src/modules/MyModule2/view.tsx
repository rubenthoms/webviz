import React from "react";

import { GeomodelLayerV2, WellborepathLayer } from "@equinor/esv-intersection";
import { ModuleFCProps } from "@framework/Module";
import { makeReferenceSystemFromTrajectoryXyzPoints } from "@modules/SeismicIntersection/utils/esvIntersectionDataConversion";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import { LayerType } from "@modules/_shared/components/EsvIntersection/esvIntersection";

import realizationData from "./data.json";
import { State } from "./state";

const exampleWellBorePath = [
    [463256.911, 5930542.294, -49],
    [463564.402, 5931057.803, 1293.418],
    [463637.925, 5931184.235, 1536.938],
    [463690.658, 5931278.837, 1616.5],
    [463910.452, 5931688.122, 1630.515],
    [464465.876, 5932767.761, 1656.987],
];

const ris = makeReferenceSystemFromTrajectoryXyzPoints(exampleWellBorePath);

export const View = (props: ModuleFCProps<State>) => {
    return (
        <div className="h-full w-full flex flex-col justify-center items-center">
            <EsvIntersection
                showGrid
                axesOptions={{
                    xLabel: "X",
                    yLabel: "Y",
                    unitOfMeasure: "m",
                }}
                layers={[
                    {
                        id: "wellborepath",
                        type: LayerType.WELLBORE_PATH,
                        options: {
                            stroke: "red",
                            strokeWidth: "2px",
                            referenceSystem: ris,
                        },
                    },
                    {
                        id: "realizationSurfaceLayer",
                        type: LayerType.GEOMODEL_V2,
                        options: {
                            data: realizationData,
                            order: 4,
                            layerOpacity: 0.6,
                            strokeWidth: "2px",
                        },
                    },
                    {
                        id: "realizationSurfaceLabelsLayer",
                        type: LayerType.GEOMODEL_LABELS,
                        options: {
                            data: realizationData,
                            order: 3,
                            maxFontSize: 16,
                            minFontSize: 10,
                        },
                    },
                ]}
                intersectionReferenceSystem={ris}
                bounds={{
                    x: [10, 1000],
                    y: [0, 3000],
                }}
                viewport={[1000, 1650, 6000]}
            />
        </div>
    );
};

View.displayName = "View";
