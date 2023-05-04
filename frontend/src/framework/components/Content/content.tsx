import React from "react";

import { Workbench } from "@framework/Workbench";

import { Layout } from "./private-components/layout";

type ContentProps = {
    workbench: Workbench;
};

export const Content: React.FC<ContentProps> = (props) => {
    return (
        <div className="bg-slate-200 flex-grow">
            <Layout workbench={props.workbench} />
        </div>
    );
};
