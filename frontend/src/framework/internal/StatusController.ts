import { PublishSubscribe, PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

export enum StatusType {
    ERROR = "ERROR",
    WARNING = "WARNING",
}

export type StatusSubTypeMap = {
    [StatusType.ERROR]: "ActionRequired" | "RateLimitHit" | "NoData";
    [StatusType.WARNING]: "DataNotFound" | "DataWithWarnings";
};

export type StatusInformation<T> = {
    message: string;
    additionalInfo?: T;
};

export type StatusGroupKey = string[];

export type Status = {
    id: string;
    groupKey: StatusGroupKey;
    type: StatusType;
    subType: StatusSubTypeMap[StatusType];
    information: StatusInformation<any>;
};

export enum StatusControllerTopic {
    STATUS_CHANGED = "STATUS_CHANGED",
}

export type StatusControllerTopicPayloads = {
    [StatusControllerTopic.STATUS_CHANGED]: readonly Status[];
};

export class StatusController implements PublishSubscribe<StatusControllerTopicPayloads> {
    private readonly _pubSubDelegate = new PublishSubscribeDelegate();
    private _statusArray: Status[] = [];

    getPublishSubscribeDelegate() {
        return this._pubSubDelegate;
    }

    makeSnapshotGetter<T extends StatusControllerTopic.STATUS_CHANGED>(
        topic: T,
    ): () => StatusControllerTopicPayloads[T] {
        return () => {
            if (topic === StatusControllerTopic.STATUS_CHANGED) {
                return this._statusArray;
            }
            throw new Error(`Unsupported topic: ${topic}`);
        };
    }

    getStatusArray(): readonly Status[] {
        return this._statusArray;
    }

    addStatus(status: Status) {
        this._statusArray = [...this._statusArray, status];
        this._pubSubDelegate.notifySubscribers(StatusControllerTopic.STATUS_CHANGED);
    }

    removeStatus(id: string) {
        this._statusArray = [...this._statusArray.filter((status) => status.id !== id)];
        this._pubSubDelegate.notifySubscribers(StatusControllerTopic.STATUS_CHANGED);
    }

    removeStatusGroup(groupKey: StatusGroupKey) {
        this._statusArray = [
            ...this._statusArray.filter((status) => !status.groupKey.every((key, index) => key === groupKey[index])),
        ];
        this._pubSubDelegate.notifySubscribers(StatusControllerTopic.STATUS_CHANGED);
    }
}
