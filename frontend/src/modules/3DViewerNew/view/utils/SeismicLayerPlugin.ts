import { Layer, PickingInfo } from "@deck.gl/core";
import { DragDirection, DragHandleLayer } from "@modules/_shared/customDeckGlLayers/DragHandleLayer";
import { PublishSubscribe, PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import { DeckGlInstanceManager, DeckGlPlugin } from "./DeckGlInstanceManager";

export enum SeismicLayersPluginTopic {
    REDRAW = "SeismicLayersPlugin.REDRAW",
}

export type SeismicLayersPluginTopicPayloads = {
    [SeismicLayersPluginTopic.REDRAW]: void;
};

export class SeismicLayersPlugin extends DeckGlPlugin implements PublishSubscribe<SeismicLayersPluginTopicPayloads> {
    private _selectedLayer: Layer<any> | undefined;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SeismicLayersPluginTopicPayloads>();

    constructor(manager: DeckGlInstanceManager) {
        super(manager);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<SeismicLayersPluginTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    handleGlobalMouseClick(pickingInfo: PickingInfo): boolean {
        if (pickingInfo.layer && pickingInfo.layer.id) {
            if ("movable" in pickingInfo.layer.props && pickingInfo.layer.props.movable !== undefined) {
                this._selectedLayer = pickingInfo.layer;
                return true;
            }
        }
        return false;
    }

    getLayers(): Layer<any>[] {
        if (!this._selectedLayer) {
            return [];
        }

        if (this._selectedLayer.props.movable === DragDirection.X) {
            return [new DragHandleLayer({ dragDirection: DragDirection.X })];
        }
    }

    makeSnapshotGetter<T extends SeismicLayersPluginTopic.REDRAW>(topic: T): () => SeismicLayersPluginTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === SeismicLayersPluginTopic.REDRAW) {
                return;
            }

            throw new Error(`Unknown topic ${topic}`);
        };

        return snapshotGetter;
    }
}
