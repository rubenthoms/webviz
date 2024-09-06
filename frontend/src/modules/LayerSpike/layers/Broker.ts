import { WorkbenchServices } from "@framework/WorkbenchServices";
import { WorkbenchSession } from "@framework/WorkbenchSession";

export class Broker {
    private _workbenchServices: WorkbenchServices;
    private _workbenchSession: WorkbenchSession;

    constructor(workbenchServices: WorkbenchServices, workbenchSession: WorkbenchSession) {
        this._workbenchServices = workbenchServices;
        this._workbenchSession = workbenchSession;
    }

    getWorkbenchServices(): WorkbenchServices {
        return this._workbenchServices;
    }

    getWorkbenchSession(): WorkbenchSession {
        return this._workbenchSession;
    }
}
