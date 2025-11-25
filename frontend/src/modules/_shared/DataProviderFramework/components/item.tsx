import type React from "react";

import { DragIndicator } from "@mui/icons-material";

import { SortableList } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { TreeBranchLine, TreeContentLine, TreeHeaderLine } from "./treeComponents";

export type SortableListItemProps = {
    id: string;
    title: React.ReactNode;
    headerClassNames?: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    children?: React.ReactNode;
    isLastItemInParent?: boolean;
    nestingLevel?: number;
};

/**
 *
 * @param {SortableListItemProps} props Object of properties for the SortableListItem component (see below for details).
 * @param {string} props.id ID that is unique among all components inside the sortable list.
 * @param {React.ReactNode} props.title Title component of the list item.
 * @param {React.ReactNode} props.startAdornment Start adornment to display to the left of the title.
 * @param {React.ReactNode} props.endAdornment End adornment to display to the right of the title.
 * @param {React.ReactNode} props.children Child components to display as the content of the list item.
 *
 * @returns {React.ReactNode} A sortable list item component.
 */
export function SortableListItem(props: SortableListItemProps): React.ReactNode {
    const nestingLevel = props.nestingLevel ?? 0;
    return (
        <div className={resolveClassNames("flex flex-col relative group pt-1")}>
            {props.isLastItemInParent ? null : <TreeContentLine />}
            <SortableList.Item id={props.id}>
                <div>
                    <Header
                        title={props.title}
                        startAdornment={props.startAdornment}
                        endAdornment={props.endAdornment}
                        headerClassNames={props.headerClassNames}
                        nestingLevel={nestingLevel}
                    />
                    <div className="ml-2 mr-1 pl-1 group-hover:bg-blue-50 bg-white">{props.children}</div>
                </div>
            </SortableList.Item>
        </div>
    );
}

type HeaderProps = {
    title: React.ReactNode;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    headerClassNames?: string;
    nestingLevel: number;
};

function Header(props: HeaderProps): React.ReactNode {
    const topOffset = props.nestingLevel * 32; // 32px = h-8 (2rem)
    return (
        <div
            className={resolveClassNames(
                "w-full flex gap-1 min-h-8 text-sm items-center px-2 sticky z-10 bg-slate-200 group-hover:bg-blue-100 rounded-sm shadow-sm",
                props.headerClassNames ?? "",
            )}
            style={{ top: `${topOffset}px`, zIndex: 2 * (20 - props.nestingLevel) }}
        >
            <TreeHeaderLine />
            <TreeBranchLine />
            <SortableList.DragHandle>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </SortableList.DragHandle>
            <div className="flex items-center gap-2 grow min-w-0">
                {props.startAdornment}
                <div className="grow min-w-0">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
