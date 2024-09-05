import { SortableListItem } from "@lib/components/SortableList";

import { LayerBase } from "../LayerBase";

export type LayerComponentProps = {
    layer: LayerBase;
    onRemove: (id: string) => void;
};

export function Layer(props: LayerComponentProps): React.ReactNode {
    return (
        <SortableListItem
            key={props.layer.getId()}
            id={props.layer.getId()}
            title={props.layer.getName()}
        ></SortableListItem>
    );
}
