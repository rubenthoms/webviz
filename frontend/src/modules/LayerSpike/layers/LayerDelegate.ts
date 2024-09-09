import { v4 } from "uuid";

import { Broker } from "./Broker";
import { LayerManager } from "./LayerManager";
import { Message, MessageDirection, MessageType } from "./Message";
import { SettingsContextDelegateTopic } from "./SettingsContextDelegate";
import { Item, Settings, SettingsContext } from "./interfaces";

export class LayerDelegate<TSettings extends Settings> implements Item {
    private _name: string;
    private _id: string;
    private _broker: Broker = new Broker(null);
    private _settingsContext: SettingsContext<TSettings>;
    private _layerManager: LayerManager | null = null;

    constructor(name: string, settingsContext: SettingsContext<TSettings>) {
        this._id = v4();
        this._name = name;
        this._settingsContext = settingsContext;
        this._settingsContext.getDelegate().makeSubscriberFunction(SettingsContextDelegateTopic.SETTINGS_CHANGED)(
            () => {
                this._broker.emit(new Message(MessageType.SETTINGS_CHANGED, MessageDirection.UP));
            }
        );
        this._settingsContext
            .getDelegate()
            .makeSubscriberFunction(SettingsContextDelegateTopic.AVAILABLE_SETTINGS_CHANGED)(() => {
            this._broker.emit(new Message(MessageType.AVAILABLE_SETTINGS_CHANGED, MessageDirection.UP));
        });
    }

    getBroker(): Broker {
        return this._broker;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    getSettingsContext(): SettingsContext<TSettings> {
        return this._settingsContext;
    }

    setLayerManager(layerManager: LayerManager | null): void {
        this._layerManager = layerManager;
        this._settingsContext.getDelegate().setLayerManager(layerManager);
    }

    getLayerManager(): LayerManager {
        if (this._layerManager === null) {
            throw new Error("LayerManager not set");
        }
        return this._layerManager;
    }
}
