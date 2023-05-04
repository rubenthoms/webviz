import React from "react";

import { SubModuleFCProps } from "@framework/SubModule";

import { CallbackProperties } from "./callbackInterface";
import { State } from "./state";

export const view = (props: SubModuleFCProps<State, CallbackProperties>) => {
    const [leaderCount, setLeaderCount] = React.useState(0);

    React.useEffect(() => {
        const cb = (data: CallbackProperties) => {
            setLeaderCount(data.count);
        };

        const unregisterCallback = props.moduleContext.registerSubModuleCallbackFunction(cb);

        return unregisterCallback;
    }, []);

    return (
        <div>
            <h3>Leader Count: {leaderCount}</h3>
        </div>
    );
};
