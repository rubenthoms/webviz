import React from "react";

import { Workbench } from "./Workbench";

export type NavigatorTopicDefinitions = {
    "navigator.fieldName": string;
    "navigator.caseId": string;
};

export type GlobalTopicDefinitions = {
    "global.infoMessage": string;
    "global.hoverRealization": { realization: number };
    "global.hoverTimestamp": { timestamp: number };
};

export type AllTopicDefinitions = NavigatorTopicDefinitions & GlobalTopicDefinitions;

export type TopicDefinitionsType<T extends keyof AllTopicDefinitions> = T extends keyof GlobalTopicDefinitions
    ? GlobalTopicDefinitions[T]
    : T extends keyof NavigatorTopicDefinitions
    ? NavigatorTopicDefinitions[T]
    : never;

export type CallbackFunction<T extends keyof AllTopicDefinitions> = (value: AllTopicDefinitions[T]) => void;

export class WorkbenchServices {
    protected _workbench: Workbench;
    protected _subscribersMap: { [key: string]: Set<CallbackFunction<any>> };
    protected _topicValueCache: { [key: string]: any };

    protected constructor(workbench: Workbench) {
        this._workbench = workbench;
        this._subscribersMap = {};
        this._topicValueCache = {};
    }

    subscribe<T extends keyof AllTopicDefinitions>(
        topic: T,
        callbackFn: CallbackFunction<T>,
        callCallbackImmediately = true
    ) {
        const subscribersSet = this._subscribersMap[topic] || new Set();
        subscribersSet.add(callbackFn);
        this._subscribersMap[topic] = subscribersSet;

        if (callCallbackImmediately && topic in this._topicValueCache) {
            callbackFn(this._topicValueCache[topic]);
        }

        return () => {
            subscribersSet.delete(callbackFn);
        };
    }

    publishGlobalData<T extends keyof GlobalTopicDefinitions>(topic: T, value: TopicDefinitionsType<T>) {
        this.internalPublishAnyTopic(topic, value);
    }

    protected internalPublishAnyTopic<T extends keyof AllTopicDefinitions>(topic: T, value: TopicDefinitionsType<T>) {
        this._topicValueCache[topic] = value;

        const subscribersSet = this._subscribersMap[topic];
        if (!subscribersSet) {
            return;
        }
        for (const callbackFn of subscribersSet) {
            callbackFn(value);
        }
    }
}

export function useSubscribedValue<T extends keyof AllTopicDefinitions>(
    topic: T,
    workbenchServices: WorkbenchServices
): AllTopicDefinitions[T] | null {
    const [latestValue, setLatestValue] = React.useState<AllTopicDefinitions[T] | null>(null);

    React.useEffect(
        function subscribeToServiceTopic() {
            function handleNewValue(newValue: AllTopicDefinitions[T]) {
                setLatestValue(newValue);
            }
            const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewValue);
            return unsubscribeFunc;
        },
        [topic, workbenchServices]
    );

    return latestValue;
}
