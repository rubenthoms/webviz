import { v4 } from "uuid";

import { Broker } from "./Broker";
import { GroupDelegate } from "./GroupDelegate";
import { LayerManager } from "./LayerManager";
import { Message, MessageDirection, MessageType } from "./Message";
import { Item, Layer, Setting, instanceofLayer } from "./interfaces";

export class SharedSetting implements Item {
    private _id: string;
    private _broker: Broker = new Broker(null);
    private _wrappedSetting: Setting<any>;
    private _parentGroup: GroupDelegate | null = null;
    private _layerManager: LayerManager | null = null;

    constructor(wrappedSetting: Setting<any>) {
        this._id = v4();
        this._wrappedSetting = wrappedSetting;
        this._broker.onMessage(this.handleBrokerMessage.bind(this));
    }

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;
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

    setParentGroup(parentGroup: GroupDelegate): void {
        this._parentGroup = parentGroup;
    }

    handleBrokerMessage(message: Message): void {
        if (!this._parentGroup) {
            throw new Error("Parent group not set");
        }
        if (message.getType() === MessageType.AVAILABLE_SETTINGS_CHANGED) {
            if (message.getDirection() === MessageDirection.DOWN) {
                this.makeIntersectionOfAvailableValues();
            }
        }

        if (message.getType() === MessageType.DESCENDANTS_CHANGED) {
            this.makeIntersectionOfAvailableValues();
        }

        message.stopPropagation();
        return;
    }

    private makeIntersectionOfAvailableValues(): void {
        if (!this._parentGroup) {
            throw new Error("Parent group not set");
        }

        const layers = this._parentGroup.getDescendantItems((item) => instanceofLayer(item)) as Layer<any>[];
        const availableValues = layers.reduce((acc, layer, index) => {
            const setting = layer.getSettingsContext().getSettings()[this._wrappedSetting.getType()];

            if (setting) {
                if (index === 0) {
                    acc.push(...setting.getAvailableValues());
                } else {
                    acc = acc.filter((value) => setting.getAvailableValues().includes(value));
                }
            }
            return acc;
        }, [] as any[]);

        this._wrappedSetting.setAvailableValues(availableValues);
    }

    getBroker(): Broker {
        return this._broker;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._wrappedSetting.getLabel();
    }
}
