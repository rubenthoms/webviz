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

export type Status = {
    id: string;
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
    private readonly _pubSub = new PublishSubscribeDelegate();
    private _statusArray: Status[] = [];

    getPublishSubscribeDelegate() {
        return this._pubSub;
    }

    makeSnapshotGetter<T extends StatusControllerTopic.STATUS_CHANGED>(
        topic: T,
    ): () => StatusControllerTopicPayloads[T] {
        return () => {
            return this._statusArray;
        };
    }

    addStatus(status: Status) {
        this._statusArray.push(status);
    }

    getStatusArray(): readonly Status[] {
        return this._statusArray;
    }

    removeStatus(id: string) {
        this._statusArray = this._statusArray.filter((status) => status.id !== id);
    }
}
