import React from "react";

import { MainModuleFCProps } from "@framework/MainModule";

import { State } from "./state";

export const view = (props: MainModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");

    React.useEffect(() => {
        props.moduleContext.getSubModuleInstances().forEach((subModuleInstance) => {
            if (subModuleInstance.subModuleName === "MySubModule") {
                subModuleInstance.callback({ count });
            }
        });
    }, [count]);

    return (
        <div>
            <h3>Count: {count}</h3>
        </div>
    );
};
