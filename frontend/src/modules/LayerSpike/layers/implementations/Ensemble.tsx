import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { PublishSubscribeHandler } from "../PublishSubscribeHandler";
import { Setting, SettingComponentProps, SettingTopic, SettingTopicPayloads, SettingsContext } from "../interfaces";

export class Ensemble implements Setting<EnsembleIdent | null> {
    private _value: EnsembleIdent | null = null;
    private _publishSubscribeHandler = new PublishSubscribeHandler<SettingTopic>();

    constructor() {}

    getLabel(): string {
        return "Ensemble";
    }

    setValue(value: EnsembleIdent | null) {
        this._value = value;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
    }

    makeComponent(): (props: SettingComponentProps<EnsembleIdent | null>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<EnsembleIdent | null>) {
            const ensembleSet = useEnsembleSet(props.workbenchSession);

            return <EnsembleDropdown ensembleSet={ensembleSet} value={props.value} onChange={props.onValueChange} />;
        };
    }

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<EnsembleIdent | null>[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingTopic.VALUE_CHANGED) {
                return this._value;
            }
        };

        return snapshotGetter;
    }

    makeSubscriberFunction(topic: SettingTopic): (onStoreChangeCallback: () => void) => () => void {
        return this._publishSubscribeHandler.makeSubscriberFunction(topic);
    }

    getAvailableValues(): (EnsembleIdent | null)[] {
        return [];
    }
}
