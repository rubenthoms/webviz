/**
 * Why are we disbling rules-of-hooks here?
 *
 * Well, we are using several hooks in this class, which is not allowed by this rule.
 * However, we are not using these hooks in a component, but in a utility class.
 * The important thing to remember is that these functions must be called on every render,
 * unconditionally (i.e. not in a conditional statement) and not in a loop.
 * This is exactly what we are doing here. We are only using the class to group the functions together
 * and give additional context to the functions.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";

import { BroadcastChannel, InputBroadcastChannelDef } from "./Broadcaster";
import { InitialSettings } from "./InitialSettings";
import { ModuleBusinessLogic } from "./ModuleBusinessLogic";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceStatusController } from "./ModuleInstanceStatusController";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";

export class ModuleContext<S extends StateBaseType, TBusinessLogic extends ModuleBusinessLogic<any> | never> {
    private _moduleInstance: ModuleInstance<S, TBusinessLogic>;
    private _stateStore: StateStore<S>;

    constructor(moduleInstance: ModuleInstance<S, TBusinessLogic>, stateStore: StateStore<S>) {
        this._moduleInstance = moduleInstance;
        this._stateStore = stateStore;
    }

    getInstanceIdString(): string {
        return this._moduleInstance.getId();
    }

    getStateStore(): StateStore<S> {
        return this._stateStore;
    }

    useStoreState<K extends keyof S>(key: K): [S[K], (value: S[K] | ((prev: S[K]) => S[K])) => void] {
        return useStoreState(this._stateStore, key);
    }

    useStoreValue<K extends keyof S>(key: K): S[K] {
        return useStoreValue(this._stateStore, key);
    }

    useSetStoreValue<K extends keyof S>(key: K): (newValue: S[K] | ((prev: S[K]) => S[K])) => void {
        return useSetStoreValue(this._stateStore, key);
    }

    useSyncedSettingKeys(): SyncSettingKey[] {
        const [keyArr, setKeyArr] = React.useState<SyncSettingKey[]>([]);

        React.useEffect(() => {
            function handleNewValue(newArr: SyncSettingKey[]) {
                setKeyArr([...newArr]);
            }

            const unsubscribeFunc = this._moduleInstance.subscribeToSyncedSettingKeysChange(handleNewValue);
            return unsubscribeFunc;
        }, []);

        return keyArr;
    }

    setInstanceTitle(title: string): void {
        this._moduleInstance.setTitle(title);
    }

    getStatusController(): ModuleInstanceStatusController {
        return this._moduleInstance.getStatusController();
    }

    getChannel(channelName: string): BroadcastChannel {
        return this._moduleInstance.getBroadcastChannel(channelName);
    }

    getInputChannel(name: string): BroadcastChannel | null {
        return this._moduleInstance.getInputChannel(name);
    }

    setInputChannel(inputName: string, channelName: string): void {
        this._moduleInstance.setInputChannel(inputName, channelName);
    }

    getInputChannelDef(name: string): InputBroadcastChannelDef | undefined {
        return this._moduleInstance.getInputChannelDefs().find((channelDef) => channelDef.name === name);
    }

    useInputChannel(name: string, initialSettings?: InitialSettings): BroadcastChannel | null {
        const [channel, setChannel] = React.useState<BroadcastChannel | null>(null);

        React.useEffect(() => {
            if (initialSettings) {
                const setting = initialSettings.get(name, "string");
                if (setting) {
                    this._moduleInstance.setInputChannel(name, setting);
                }
            }
        }, [initialSettings, name]);

        React.useEffect(() => {
            function handleNewChannel(newChannel: BroadcastChannel | null) {
                setChannel(newChannel);
            }

            const unsubscribeFunc = this._moduleInstance.subscribeToInputChannelChange(name, handleNewChannel);
            return unsubscribeFunc;
        }, [name]);

        return channel;
    }
}
