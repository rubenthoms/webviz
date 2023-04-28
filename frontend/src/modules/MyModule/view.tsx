import React from "react";

import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");

    React.useEffect(() => {
        props.moduleContext.getSubModuleInstances().forEach((subModuleInstance) => {
            if (subModuleInstance.subModuleName === "MySubModule") {
                subModuleInstance.callback(count);
            }
        });
    }, [count]);

    return (
        <div>
            <h3>Count: {count}</h3>
        </div>
    );
};
