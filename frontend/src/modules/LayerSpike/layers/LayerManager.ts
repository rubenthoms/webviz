import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

import { GroupDelegate } from "./GroupDelegate";
import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";

export enum LayerManagerTopic {
    ITEMS_CHANGED = "items-changed",
    SETTINGS_CHANGED = "settings-changed",
}

export type LayerManagerTopicPayload = {
    [LayerManagerTopic.ITEMS_CHANGED]: void;
    [LayerManagerTopic.SETTINGS_CHANGED]: void;
};
export class LayerManager implements PublishSubscribe<LayerManagerTopic, LayerManagerTopicPayload> {
    private _workbenchSession: WorkbenchSession;
    private _workbenchSettings: WorkbenchSettings;
    private _groupDelegate: GroupDelegate;
    private _queryClient: QueryClient;
    private _publishSubscribeHandler = new PublishSubscribeHandler<LayerManagerTopic>();

    constructor(workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings, queryClient: QueryClient) {
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
        this._groupDelegate = new GroupDelegate(this);
        this._queryClient = queryClient;
    }

    publishTopic(topic: LayerManagerTopic): void {
        this._publishSubscribeHandler.notifySubscribers(topic);
    }

    getWorkbenchSession(): WorkbenchSession {
        return this._workbenchSession;
    }

    getQueryClient(): QueryClient {
        return this._queryClient;
    }

    getWorkbenchSettings(): WorkbenchSettings {
        return this._workbenchSettings;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    makeSnapshotGetter<T extends LayerManagerTopic>(topic: T): () => LayerManagerTopicPayload[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerManagerTopic.ITEMS_CHANGED) {
                return;
            }
            if (topic === LayerManagerTopic.SETTINGS_CHANGED) {
                return;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeHandler<LayerManagerTopic> {
        return this._publishSubscribeHandler;
    }
}
