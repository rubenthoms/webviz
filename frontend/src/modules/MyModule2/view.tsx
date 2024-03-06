import React from "react";

import { WellborepathLayer } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { makeReferenceSystemFromTrajectoryXyzPoints } from "@modules/SeismicIntersection/utils/esvIntersectionDataConversion";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";

import { Interface, State } from "./state";

export const View = (props: ModuleViewProps<State, Interface>) => {
    const exampleWellBorePath = [
        [463256.911, 5930542.294, -49],
        [463564.402, 5931057.803, 1293.418],
        [463637.925, 5931184.235, 1536.938],
        [463690.658, 5931278.837, 1616.5],
        [463910.452, 5931688.122, 1630.515],
        [464465.876, 5932767.761, 1656.987],
    ];
    const ris = makeReferenceSystemFromTrajectoryXyzPoints(exampleWellBorePath);
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
                    new WellborepathLayer("wellborepath", {
                        stroke: "red",
                        strokeWidth: "4px",
                        referenceSystem: ris,
                    }),
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
