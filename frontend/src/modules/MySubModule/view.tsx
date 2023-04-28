import React from "react";

import { SubModuleFCProps } from "@framework/SubModule";

import { CallbackInterface } from "./callbackInterface";
import { State } from "./state";

export const view = (props: SubModuleFCProps<State, CallbackInterface>) => {
    const [leaderCount, setLeaderCount] = React.useState(0);

    React.useEffect(() => {
        const cb = (data: CallbackInterface) => {
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
