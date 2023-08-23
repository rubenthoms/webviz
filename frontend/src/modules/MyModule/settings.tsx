import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { Input } from "@lib/components/Input";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const [numCurves, setNumCurves] = props.moduleContext.useStoreState("numCurves");

    return (
        <div className="flex flex-col gap-4">
            <Input type="number" defaultValue={numCurves} onChange={(e) => setNumCurves(parseInt(e.target.value))} />
        </div>
    );
};
