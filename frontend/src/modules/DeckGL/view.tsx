import { apiService } from "@framework/ApiService";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useQuery } from "@tanstack/react-query";
import { DeckGLMap } from "@webviz/subsurface-components";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");
    const fieldName = useSubscribedValue("navigator.fieldName", props.workbenchServices);
    const caseId = useSubscribedValue("navigator.caseId", props.workbenchServices);

    return <DeckGLMap id="deckgl-map" />;
};
