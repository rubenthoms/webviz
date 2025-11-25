import type React from "react";

import { Delete } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";

import { SortableListItem } from "../../components/item";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";

import type { SharedSetting } from "./SharedSetting";

export type SharedSettingComponentProps = {
    sharedSetting: SharedSetting<any>;
    isLastItemInParent?: boolean;
    nestingLevel?: number;
};

export function SharedSettingComponent(props: SharedSettingComponentProps): React.ReactNode {
    const manager = props.sharedSetting.getItemDelegate().getDataProviderManager();
    if (!manager) {
        return null;
    }
    return (
        <SortableListItem
            key={props.sharedSetting.getItemDelegate().getId()}
            id={props.sharedSetting.getItemDelegate().getId()}
            title={
                <div className="font-bold overflow-hidden text-ellipsis">
                    {props.sharedSetting.getItemDelegate().getName()}
                </div>
            }
            endAdornment={
                <div className="min-w-0 flex items-center gap-1">
                    <SettingManagerComponent
                        setting={props.sharedSetting.getWrappedSetting()}
                        manager={manager}
                        sharedSetting
                        hideLabel
                    />
                    <Actions sharedSetting={props.sharedSetting} />
                </div>
            }
            isLastItemInParent={props.isLastItemInParent}
            nestingLevel={props.nestingLevel}
            headerClassNames="bg-white!"
        ></SortableListItem>
    );
}

type ActionProps = {
    sharedSetting: SharedSetting<any>;
};

function Actions(props: ActionProps): React.ReactNode {
    function handleRemove() {
        props.sharedSetting.beforeDestroy();
        const parentGroup = props.sharedSetting.getItemDelegate().getParentGroup();
        if (parentGroup) {
            parentGroup.removeChild(props.sharedSetting);
        }
    }

    return (
        <>
            <DenseIconButton
                onClick={handleRemove}
                title="Remove shared setting"
                colorScheme={DenseIconButtonColorScheme.DANGER}
            >
                <Delete fontSize="inherit" />
            </DenseIconButton>
        </>
    );
}
