import { SortableListItem } from "@lib/components/SortableList";
import { BaseSetting } from "@modules/_shared/layers/settings/BaseSetting";
import { Delete, Settings } from "@mui/icons-material";

export type LayerSettingComponentProps = {
    setting: BaseSetting<any>;
    onRemove: (id: string) => void;
    children: React.ReactNode;
};

export function LayerSettingComponent(props: LayerSettingComponentProps): React.ReactNode {
    return (
        <SortableListItem
            key={props.setting.getId()}
            id={props.setting.getId()}
            title={<span className="font-bold">{props.setting.getName()}</span>}
            startAdornment={<Settings fontSize="inherit" />}
            endAdornment={
                <div
                    className="hover:cursor-pointer rounded hover:text-red-800"
                    onClick={() => props.onRemove(props.setting.getId())}
                    title="Remove setting"
                >
                    <Delete fontSize="inherit" />
                </div>
            }
        >
            {props.children}
        </SortableListItem>
    );
}
