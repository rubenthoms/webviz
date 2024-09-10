import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { isDevMode } from "@lib/utils/devMode";
import { QueryClient } from "@tanstack/react-query";

import { v4 } from "uuid";

import { GroupDelegate } from "./GroupDelegate";
import { LayerManager, LayerManagerTopic } from "./LayerManager";
import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { SharedSetting } from "./SharedSetting";
import { Item, Layer, LayerStatus, Settings, SettingsContext } from "./interfaces";

export enum LayerDelegateTopic {
    VISIBILITY = "VISIBILITY",
    STATUS = "STATUS",
    DATA = "DATA",
}

export type LayerDelegatePayloads<TData> = {
    [LayerDelegateTopic.VISIBILITY]: boolean;
    [LayerDelegateTopic.STATUS]: LayerStatus;
    [LayerDelegateTopic.DATA]: TData;
};
export class LayerDelegate<TSettings extends Settings, TData>
    implements Item, PublishSubscribe<LayerDelegateTopic, LayerDelegatePayloads<TData>>
{
    private _parent: Layer<TSettings, TData>;
    private _name: string;
    private _id: string;
    private _isVisible: boolean = true;
    private _parentGroup: GroupDelegate | null = null;
    private _settingsContext: SettingsContext<TSettings>;
    private _layerManager: LayerManager | null = null;
    private _unsubscribeFuncs: (() => void)[] = [];
    private _cancellationPending: boolean = false;
    private _publishSubscribeHandler = new PublishSubscribeHandler<LayerDelegateTopic>();
    private _queryKeys: unknown[][] = [];
    private _refetchRequested: boolean = false;
    private _status: LayerStatus = LayerStatus.IDLE;
    private _data: TData | null = null;
    private _error: StatusMessage | string | null = null;

    constructor(layer: Layer<TSettings, TData>, name: string, settingsContext: SettingsContext<TSettings>) {
        this._id = v4();
        this._parent = layer;
        this._name = name;
        this._settingsContext = settingsContext;
    }

    handleSettingsChange(): void {
        this._cancellationPending = true;
        if (this._settingsContext.isValid()) {
            this.maybeCancelQuery().then(() => {
                this.maybeRefetchData();
            });
        } else {
            this._cancellationPending = false;
        }
    }

    registerQueryKey(queryKey: unknown[]): void {
        this._queryKeys.push(queryKey);
    }

    setVisible(isVisible: boolean): void {
        this._isVisible = isVisible;
        this._publishSubscribeHandler.notifySubscribers(LayerDelegateTopic.VISIBILITY);
    }

    getStatus(): LayerStatus {
        return this._status;
    }

    isVisible(): boolean {
        return this._isVisible;
    }

    setParentGroup(parentGroup: GroupDelegate | null): void {
        this._parentGroup = parentGroup;
    }

    getParentGroup(): GroupDelegate | null {
        return this._parentGroup;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    getData(): TData | null {
        return this._data;
    }

    getSettingsContext(): SettingsContext<TSettings> {
        return this._settingsContext;
    }

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;
        this._settingsContext.getDelegate().setLayerManager(layerManager);

        if (layerManager) {
            const unsubscribeFunc1 = layerManager
                .getPublishSubscribeHandler()
                .makeSubscriberFunction(LayerManagerTopic.ITEMS_CHANGED)(() => {
                this.handleSharedSettingsChanged();
            });

            const unsubscribeFunc2 = layerManager
                .getPublishSubscribeHandler()
                .makeSubscriberFunction(LayerManagerTopic.SETTINGS_CHANGED)(() => {
                this.handleSharedSettingsChanged();
            });

            this._unsubscribeFuncs.push(unsubscribeFunc1);
            this._unsubscribeFuncs.push(unsubscribeFunc2);
        } else {
            this._unsubscribeFuncs.forEach((unsubscribeFunc) => {
                unsubscribeFunc();
            });
            this._unsubscribeFuncs = [];
        }
    }

    handleSharedSettingsChanged(): void {
        if (this._parentGroup) {
            const sharedSettings: SharedSetting[] = this._parentGroup.getAncestorAndSiblingItems(
                (item) => item instanceof SharedSetting
            ) as SharedSetting[];
            const overriddenSettings: { [K in keyof TSettings]: TSettings[K] } = {} as {
                [K in keyof TSettings]: TSettings[K];
            };
            for (const setting of sharedSettings) {
                const type = setting.getWrappedSetting().getType();
                if (this._settingsContext.getSettings()[type] && overriddenSettings[type] === undefined) {
                    overriddenSettings[type] = setting.getWrappedSetting().getDelegate().getValue();
                }
            }
            this._settingsContext.getDelegate().setOverriddenSettings(overriddenSettings);
        }
    }

    getLayerManager(): LayerManager {
        if (this._layerManager === null) {
            throw new Error("LayerManager not set");
        }
        return this._layerManager;
    }

    makeSnapshotGetter<T extends LayerDelegateTopic>(topic: T): () => LayerDelegatePayloads<TData>[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerDelegateTopic.VISIBILITY) {
                return this._isVisible;
            }
            if (topic === LayerDelegateTopic.STATUS) {
                return this._status;
            }
            if (topic === LayerDelegateTopic.DATA) {
                return this._data;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeHandler<LayerDelegateTopic> {
        return this._publishSubscribeHandler;
    }

    getError(): StatusMessage | string | null {
        if (!this._error) {
            return null;
        }

        if (typeof this._error === "string") {
            return `${this.getName()}: ${this._error}`;
        }

        return {
            ...this._error,
            message: `${this.getName()}: ${this._error.message}`,
        };
    }

    private setStatus(status: LayerStatus): void {
        this._status = status;
        this._publishSubscribeHandler.notifySubscribers(LayerDelegateTopic.STATUS);
    }

    private getQueryClient(): QueryClient | null {
        return this._layerManager?.getQueryClient() ?? null;
    }

    private async maybeCancelQuery(): Promise<void> {
        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._queryKeys.length > 0) {
            for (const queryKey of this._queryKeys) {
                await queryClient.cancelQueries(
                    {
                        queryKey,
                        exact: true,
                        fetchStatus: "fetching",
                        type: "active",
                    },
                    {
                        silent: true,
                        revert: true,
                    }
                );
                await queryClient.invalidateQueries({ queryKey });
                queryClient.removeQueries({ queryKey });
            }
            this._queryKeys = [];
        }

        this._cancellationPending = false;
    }

    async maybeRefetchData(): Promise<void> {
        const queryClient = this.getQueryClient();

        if (!queryClient) {
            return;
        }

        if (this._cancellationPending) {
            this._refetchRequested = true;
            return;
        }

        this.setStatus(LayerStatus.LOADING);

        try {
            this._data = await this._parent.fechData(queryClient);
            if (this._queryKeys.length === null && isDevMode()) {
                console.warn(
                    "Did you forget to use 'setQueryKeys' in your layer implementation of 'fetchData'? This will cause the queries to not be cancelled when settings change and might lead to undesired behaviour."
                );
            }
            this._queryKeys = [];
            this._publishSubscribeHandler.notifySubscribers(LayerDelegateTopic.DATA);
            this.setStatus(LayerStatus.SUCCESS);
        } catch (error: any) {
            if (error.constructor?.name === "CancelledError") {
                return;
            }
            const apiError = ApiErrorHelper.fromError(error);
            if (apiError) {
                this._error = apiError.makeStatusMessage();
            } else {
                this._error = "An error occurred";
            }
            this.setStatus(LayerStatus.ERROR);
        }
    }
}
