import { v4 } from "uuid";

import { GroupDelegate } from "./GroupDelegate";
import { LayerManager, LayerManagerTopic } from "./LayerManager";
import { Item, Layer, Setting, SettingTopic, instanceofLayer } from "./interfaces";

export class SharedSetting implements Item {
    private _id: string;
    private _wrappedSetting: Setting<any>;
    private _parentGroup: GroupDelegate | null = null;
    private _layerManager: LayerManager | null = null;
    private _unsubscribeFuncs: (() => void)[] = [];

    constructor(wrappedSetting: Setting<any>) {
        this._id = v4();
        this._wrappedSetting = wrappedSetting;
        this._wrappedSetting
            .getDelegate()
            .getPublishSubscribeHandler()
            .makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
            this.publishValueChange();
        });
    }

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;

        if (layerManager) {
            this._unsubscribeFuncs.push(
                layerManager.getPublishSubscribeHandler().makeSubscriberFunction(LayerManagerTopic.ITEMS_CHANGED)(
                    () => {
                        this.makeIntersectionOfAvailableValues();
                    }
                )
            );
            this._unsubscribeFuncs.push(
                layerManager.getPublishSubscribeHandler().makeSubscriberFunction(LayerManagerTopic.SETTINGS_CHANGED)(
                    () => {
                        this.makeIntersectionOfAvailableValues();
                    }
                )
            );
            this._unsubscribeFuncs.push(
                layerManager
                    .getPublishSubscribeHandler()
                    .makeSubscriberFunction(LayerManagerTopic.AVAILABLE_SETTINGS_CHANGED)(() => {
                    this.makeIntersectionOfAvailableValues();
                })
            );
        } else {
            this._unsubscribeFuncs.forEach((unsubscribeFunc) => {
                unsubscribeFunc();
            });
            this._unsubscribeFuncs = [];
        }
    }

    publishValueChange(): void {
        if (this._layerManager) {
            this._layerManager.publishTopic(LayerManagerTopic.SETTINGS_CHANGED);
        }
    }

    getWrappedSetting(): Setting<any> {
        return this._wrappedSetting;
    }

    getLayerManager(): LayerManager {
        if (!this._layerManager) {
            throw new Error("Layer manager not set");
        }
        return this._layerManager;
    }

    setParentGroup(parentGroup: GroupDelegate | null): void {
        this._parentGroup = parentGroup;
    }

    private makeIntersectionOfAvailableValues(): void {
        if (!this._parentGroup) {
            throw new Error("Parent group not set");
        }

        const layersAndSharedSettings = this._parentGroup.getDescendantItems(
            (item) => instanceofLayer(item) || item instanceof SharedSetting
        ) as Layer<any, any>[];
        const availableValues = layersAndSharedSettings.reduce((acc, item) => {
            if (instanceofLayer(item)) {
                const setting = item.getSettingsContext().getSettings()[this._wrappedSetting.getType()];
                if (setting) {
                    if (acc.length === 0) {
                        acc.push(...setting.getDelegate().getAvailableValues());
                    } else {
                        acc = acc.filter((value) => setting.getDelegate().getAvailableValues().includes(value));
                    }
                }
            }
            if (item instanceof SharedSetting && item.getId() !== this.getId()) {
                const setting = item.getWrappedSetting();
                if (setting) {
                    if (acc.length === 0) {
                        acc.push(...setting.getDelegate().getAvailableValues());
                    } else {
                        acc = acc.filter((value) => setting.getDelegate().getAvailableValues().includes(value));
                    }
                }
            }
            return acc;
        }, [] as any[]);

        this._wrappedSetting.getDelegate().setAvailableValues(availableValues);
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._wrappedSetting.getLabel();
    }
}
