import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import type { Item } from "../../interfacesAndTypes/entities";
import type { Setting } from "../../settings/settingsDefinitions";
import { DataProvider } from "../DataProvider/DataProvider";
import { DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
import { Group } from "../Group/Group";
import type { SettingManager } from "../SettingManager/SettingManager";

export class ExternalSettingController<TSetting extends Setting> {
    private _parentItem: Item;
    private _controlledSettings: Map<string, SettingManager<TSetting>> = new Map();
    private _unsubscribeHandler: UnsubscribeHandlerDelegate = new UnsubscribeHandlerDelegate();

    constructor(parentItem: Item) {
        this._parentItem = parentItem;

        const dataProviderManager = parentItem.getItemDelegate().getDataProviderManager();
        this._unsubscribeHandler.registerUnsubscribeFunction(
            "data-provider-manager",
            dataProviderManager.getPublishSubscribeDelegate().makeSubscriberFunction(DataProviderManagerTopic.ITEMS)(
                () => {
                    this.updateControlledSettings();
                },
            ),
        );
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
        }
    }

    private unregisterAllControlledSettings(): void {
        for (const setting of this._controlledSettings.values()) {
            setting.unregisterExternalSettingController();
        }
        this._controlledSettings.clear();
    }
}
