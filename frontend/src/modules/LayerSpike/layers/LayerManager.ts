import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { GroupDelegate } from "./GroupDelegate";
import { View } from "./View";

export class LayerManager {
    private _workbenchSession: WorkbenchSession;
    private _workbenchSettings: WorkbenchSettings;
    private _groupDelegate: GroupDelegate;

    constructor(workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings) {
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
        this._groupDelegate = new GroupDelegate(this);
    }

    getWorkbenchSession(): WorkbenchSession {
        return this._workbenchSession;
    }

    getWorkbenchSettings(): WorkbenchSettings {
        return this._workbenchSettings;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    makeView(name: string): View {
        return new View(this, name);
    }
}
