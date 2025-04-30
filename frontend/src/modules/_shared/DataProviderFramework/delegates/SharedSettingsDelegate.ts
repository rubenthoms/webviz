import { UnsubscribeHandlerDelegate } from "./UnsubscribeHandlerDelegate";

import { DataProvider } from "../framework/DataProvider/DataProvider";
import { DataProviderManagerTopic } from "../framework/DataProviderManager/DataProviderManager";
import { ExternalSettingController } from "../framework/ExternalSettingController/ExternalSettingController";
import { Group } from "../framework/Group/Group";
import type { SettingManager } from "../framework/SettingManager/SettingManager";
import type { Item } from "../interfacesAndTypes/entities";
import type { SettingsKeysFromTuple } from "../interfacesAndTypes/utils";
import type { SettingTypes, Settings } from "../settings/settingsDefinitions";

export class SharedSettingsDelegate<
    TSettings extends Settings,
    TSettingKey extends SettingsKeysFromTuple<TSettings> = SettingsKeysFromTuple<TSettings>,
> {
    private _parentItem: Item;
    private _externalSettingControllers: { [K in TSettingKey]: ExternalSettingController<K> } = {} as {
        [K in TSettingKey]: ExternalSettingController<K>;
    };
    private _wrappedSettings: { [K in TSettingKey]: SettingManager<K> } = {} as {
        [K in TSettingKey]: SettingManager<K>;
    };
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();

    constructor(parentItem: Item, wrappedSettings: { [K in TSettingKey]: SettingManager<K> }) {
        this._parentItem = parentItem;
        this._wrappedSettings = wrappedSettings;

        for (const key in wrappedSettings) {
            const setting = wrappedSettings[key];
            const externalSettingController = new ExternalSettingController(parentItem, setting);
            this._externalSettingControllers[key] = externalSettingController;
        }

        const dataProviderManager = parentItem.getItemDelegate().getDataProviderManager();
        if (!dataProviderManager) {
            throw new Error("SharedSettingDelegate must have a parent item with a data provider manager.");
        }

        this._unsubscribeHandler.registerUnsubscribeFunction(
            "data-provider-manager",
            dataProviderManager.getPublishSubscribeDelegate().makeSubscriberFunction(DataProviderManagerTopic.ITEMS)(
                () => {
                    this.updateControlledSettings();
                },
            ),
        );
    }

    getWrappedSettings(): { [K in TSettingKey]: SettingManager<K, SettingTypes[K]> } {
        return this._wrappedSettings;
    }

    private updateControlledSettings(): void {
        this.unregisterAllControlledSettings();

        let parentGroup = this._parentItem.getItemDelegate().getParentGroup();
        if (this._parentItem instanceof Group) {
            parentGroup = this._parentItem.getGroupDelegate();
        }

        if (!parentGroup) {
            return;
        }

        const providers = parentGroup.getDescendantItems((item) => item instanceof DataProvider) as DataProvider<
            any,
            any
        >[];

        for (const provider of providers) {
            for (const key in this._externalSettingControllers) {
                const externalSettingController = this._externalSettingControllers[key];
                const setting = provider.getSettingsContextDelegate().getSettings()[key];
                if (setting) {
                    externalSettingController.registerSetting(setting);
                }
            }
        }

        for (const key in this._externalSettingControllers) {
            const externalSettingController = this._externalSettingControllers[key];
            externalSettingController.makeIntersectionOfAvailableValues();
        }
    }

    private unregisterAllControlledSettings(): void {
        for (const key in this._externalSettingControllers) {
            const externalSettingController = this._externalSettingControllers[key];
            externalSettingController.unregisterAllControlledSettings();
        }
    }

    unsubscribeAll(): void {
        this._unsubscribeHandler.unsubscribeAll();
    }
}
