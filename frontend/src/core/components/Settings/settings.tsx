import React from "react";

import { workbench } from "@/core/framework/workbench";

export const Settings: React.FC = () => {
    return (
        <div className="bg-white p-4">
            {workbench.getModuleInstances().map((module) => {
                if (module.loading) return <div>Loading...</div>;
                const context = {
                    useModuleState: module.stateStore.useModuleState,
                    useModuleStateValue: module.stateStore.useModuleStateValue,
                    useSetModuleStateValue:
                        module.stateStore.setModuleStateValue,
                };
                return (
                    <div
                        key={module.id}
                        style={{
                            display:
                                workbench.activeModuleId === module.id
                                    ? "block"
                                    : "none",
                        }}
                    >
                        <module.Settings moduleContext={context} />
                    </div>
                );
            })}
        </div>
    );
};
