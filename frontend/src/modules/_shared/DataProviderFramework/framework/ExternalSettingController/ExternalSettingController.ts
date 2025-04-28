import { UnsubscribeHandlerDelegate } from "../../delegates/UnsubscribeHandlerDelegate";
import type { Item } from "../../interfacesAndTypes/entities";
import type { Setting } from "../../settings/settingsDefinitions";
import { DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
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
}
