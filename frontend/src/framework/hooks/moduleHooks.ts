import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstanceBase } from "@framework/ModuleInstanceBase";

export const useImportState = (moduleInstance: ModuleInstanceBase<any>): ImportState => {
    const [importState, setImportState] = React.useState<ImportState>(moduleInstance.getImportState());

    React.useEffect(() => {
        const unsubscribeFunc = moduleInstance.subscribeToImportStateChange(() => {
            setImportState(moduleInstance.getImportState());
        });
        return unsubscribeFunc;
    }, [moduleInstance]);

    return importState;
};
