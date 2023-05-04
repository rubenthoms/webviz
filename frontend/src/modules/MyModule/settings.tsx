import { MainModuleFCProps } from "@framework/MainModule";
import { Button } from "@lib/components/Button";

import { State } from "./state";

export const settings = (props: MainModuleFCProps<State>) => {
    const setCount = props.moduleContext.useSetStoreValue("count");

    return (
        <div>
            <Button onClick={() => setCount((prev: number) => prev + 1)}>Count</Button>
        </div>
    );
};
