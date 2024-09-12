import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { IsMoveAllowedArgs, SortableList } from "@lib/components/SortableList";
import { Add } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { useSetAtom } from "jotai";

import { layerManagerAtom } from "./atoms/baseAtoms";

import { LayerManager } from "../layers/LayerManager";
import { usePublishSubscribeTopicValue } from "../layers/PublishSubscribeHandler";
import { SharedSetting } from "../layers/SharedSetting";
import { View } from "../layers/View";
import { makeComponent } from "../layers/components/utils";
import { GroupBaseTopic } from "../layers/delegates/GroupDelegate";
import { ObservedSurfaceLayer } from "../layers/implementations/layers/ObservedSurfaceLayer/ObservedSurfaceLayer";
import { RealizationSurfaceLayer } from "../layers/implementations/layers/RealizationSurfaceLayer/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "../layers/implementations/layers/StatisticalSurfaceLayer/StatisticalSurfaceLayer";
import { Ensemble } from "../layers/implementations/settings/Ensemble";
import { Realization } from "../layers/implementations/settings/Realization";
import { Item, instanceofGroup } from "../layers/interfaces";
import { LayersPanelActions } from "../layersActions";
import {
    LAYER_TYPE_TO_STRING_MAPPING,
    LayerType,
    SHARED_SETTING_TYPE_TO_STRING_MAPPING,
    SharedSettingType,
} from "../types";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const queryClient = useQueryClient();
    const layerManager = React.useRef<LayerManager>(
        new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient)
    );
    const groupDelegate = layerManager.current.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupBaseTopic.CHILDREN);

    const setLayerManager = useSetAtom(layerManagerAtom);

    React.useEffect(
        function onMountEffect() {
            setLayerManager(layerManager.current);
        },
        [setLayerManager]
    );

    function handleAddLayer(layerType: LayerType) {
        if (layerType === LayerType.OBSERVED_SURFACE) {
            groupDelegate.appendChild(new ObservedSurfaceLayer());
        }
        if (layerType === LayerType.STATISTICAL_SURFACE) {
            groupDelegate.appendChild(new StatisticalSurfaceLayer());
        }
        if (layerType === LayerType.REALIZATION_SURFACE) {
            groupDelegate.appendChild(new RealizationSurfaceLayer());
        }
    }

    function handleAddView() {
        groupDelegate.appendChild(new View("New View"));
    }

    function handleAddSharedSetting(settingType: SharedSettingType) {
        if (settingType === SharedSettingType.ENSEMBLE) {
            groupDelegate.prependChild(new SharedSetting(new Ensemble()));
        }
        if (settingType === SharedSettingType.REALIZATION) {
            groupDelegate.prependChild(new SharedSetting(new Realization()));
        }
    }

    function checkIfItemMoveAllowed(args: IsMoveAllowedArgs): boolean {
        const movedItem = groupDelegate.findDescendantById(args.movedItemId);
        if (!movedItem) {
            return false;
        }

        const destinationItem = args.destinationId
            ? groupDelegate.findDescendantById(args.destinationId)
            : layerManager.current;

        if (!destinationItem || !instanceofGroup(destinationItem)) {
            return false;
        }

        const numSharedSettings =
            destinationItem.getGroupDelegate().findChildren((item) => {
                return item instanceof SharedSetting;
            }).length ?? 0;

        if (!(movedItem instanceof SharedSetting)) {
            if (args.position < numSharedSettings) {
                return false;
            }
        } else {
            if (args.originId === args.destinationId) {
                if (args.position >= numSharedSettings) {
                    return false;
                }
            } else {
                if (args.position > numSharedSettings) {
                    return false;
                }
            }
        }

        return true;
    }

    function handleItemMoved(
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number
    ) {
        const movedItem = groupDelegate.findDescendantById(movedItemId);
        if (!movedItem) {
            return;
        }

        if (movedItem instanceof SharedSetting) {
            if (originId === destinationId) {
                return;
            }
        }

        let origin = layerManager.current.getGroupDelegate();
        if (originId) {
            const candidate = groupDelegate.findDescendantById(originId);
            if (candidate && instanceofGroup(candidate)) {
                origin = candidate.getGroupDelegate();
            }
        }

        let destination = layerManager.current.getGroupDelegate();
        if (destinationId) {
            const candidate = groupDelegate.findDescendantById(destinationId);
            if (candidate && instanceofGroup(candidate)) {
                destination = candidate.getGroupDelegate();
            }
        }

        if (origin === destination) {
            origin.moveChild(movedItem, position);
            return;
        }

        origin.removeChild(movedItem);
        destination.insertChild(movedItem, position);
    }

    return (
        <div className="h-full flex flex-col gap-1">
            <div className="flex-grow flex flex-col min-h-0">
                <div className="w-full flex-grow flex flex-col min-h-0">
                    <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300 gap-2">
                        <div className="flex-grow font-bold text-sm">Layers</div>
                        <LayersPanelActions
                            layerTypeToStringMapping={LAYER_TYPE_TO_STRING_MAPPING}
                            settingTypeToStringMapping={SHARED_SETTING_TYPE_TO_STRING_MAPPING}
                            onAddLayer={handleAddLayer}
                            onAddView={handleAddView}
                            onAddSharedSetting={handleAddSharedSetting}
                        />
                    </div>
                    <div className="w-full flex-grow flex flex-col relative h-full">
                        <SortableList
                            onItemMoved={handleItemMoved}
                            isMoveAllowed={checkIfItemMoveAllowed}
                            contentWhenEmpty={
                                <div className="flex -mt-1 justify-center text-sm items-center gap-1 h-40">
                                    Click on <Add fontSize="inherit" /> to add a layer.
                                </div>
                            }
                        >
                            {items.map((item: Item) => makeComponent(item))}
                        </SortableList>
                    </div>
                </div>
            </div>
        </div>
    );
}
