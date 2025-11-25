import React from "react";

import { DragIndicator, ExpandLess, ExpandMore } from "@mui/icons-material";
import { isEqual } from "lodash";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { SortableList } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { getContrastingTextColor } from "../framework/utils/makeContrastingTextColor";

import { TreeBranchLine, TreeContentLine, TreeHeaderLine } from "./treeComponents";

export type SortableListGroupProps = {
    id: string;
    title: React.ReactNode;
    expanded?: boolean;
    color?: string;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    headerStyle?: React.CSSProperties;
    content?: React.ReactNode;
    contentStyle?: React.CSSProperties;
    contentWhenEmpty?: React.ReactNode;
    children?: React.ReactElement[];
    isLastItemInParent?: boolean;
    nestingLevel?: number;
};

/**
 *
 * @param {SortableListGroupProps} props Object of properties for the SortableListGroup component (see below for details).
 * @param {string} props.id ID that is unique among all components inside the sortable list.
 * @param {React.ReactNode} props.title Title of the list item.
 * @param {boolean} props.expanded Whether the group should be expanded.
 * @param {React.ReactNode} props.startAdornment Start adornment to display to the left of the title.
 * @param {React.ReactNode} props.endAdornment End adornment to display to the right of the title.
 * @param {React.ReactNode} props.content Optional content to display before actual children.
 * @param {React.ReactNode} props.contentWhenEmpty Content to display when the group is empty.
 * @param {React.ReactNode} props.children Child components to display as the content of the list item.
 *
 * @returns {React.ReactNode} A sortable list group component.
 */
export function SortableListGroup(props: SortableListGroupProps): React.ReactNode {
    const [isExpanded, setIsExpanded] = React.useState<boolean>(props.expanded ?? true);
    const [prevExpanded, setPrevExpanded] = React.useState<boolean | undefined>(props.expanded);

    if (!isEqual(props.expanded, prevExpanded)) {
        if (props.expanded !== undefined) {
            setIsExpanded(props.expanded);
        }
        setPrevExpanded(props.expanded);
    }

    function handleToggleExpanded() {
        setIsExpanded(!isExpanded);
    }

    const hasContent = props.children !== undefined && props.children.length > 0;

    const textColor = getContrastingTextColor(props.color ?? "");
    const nestingLevel = props.nestingLevel ?? 0;

    return (
        <SortableList.Group id={props.id}>
            <div className="relative py-1">
                {props.isLastItemInParent ? null : <TreeContentLine />}
                <Header
                    title={props.title}
                    startAdornment={props.startAdornment}
                    endAdornment={props.endAdornment}
                    headerStyle={{
                        backgroundColor: props.color,
                        color: textColor,
                        ...props.headerStyle,
                    }}
                    onToggleExpanded={handleToggleExpanded}
                    expanded={isExpanded}
                    hovered={false}
                    nestingLevel={nestingLevel}
                />
                <SortableList.GroupContent>
                    <div
                        className={resolveClassNames("pl-4", {
                            hidden: !isExpanded,
                        })}
                        style={props.contentStyle}
                    >
                        {props.content}
                        {hasContent ? props.children : props.contentWhenEmpty}
                    </div>
                </SortableList.GroupContent>
            </div>
        </SortableList.Group>
    );
}

type HeaderProps = {
    title: React.ReactNode;
    expanded: boolean;
    hovered: boolean;
    onToggleExpanded?: () => void;
    icon?: React.ReactNode;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
    headerStyle?: React.CSSProperties;
    nestingLevel: number;
};

function Header(props: HeaderProps): React.ReactNode {
    const topOffset = props.nestingLevel * 32; // 32px = h-8 (2rem)
    return (
        <div
            className={resolveClassNames(
                "sortable-list-item-header flex w-full items-center gap-0.5 h-8 text-sm sticky px-2 hover:bg-blue-100 bg-slate-300 rounded-sm shadow-sm",
                {
                    "bg-blue-300!": props.hovered,
                },
            )}
            style={{ ...props.headerStyle, top: `${topOffset}px`, zIndex: 2 * (20 - props.nestingLevel) }}
        >
            <TreeHeaderLine />
            <TreeBranchLine />
            <SortableList.DragHandle>
                <DragIndicator fontSize="inherit" className="pointer-events-none" />
            </SortableList.DragHandle>
            <DenseIconButton
                onClick={props.onToggleExpanded}
                title={props.expanded ? "Hide children" : "Show children"}
            >
                {props.expanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
            </DenseIconButton>
            <div className="flex items-center gap-2 grow min-w-0">
                {props.startAdornment}
                <div className="grow font-bold min-w-0">{props.title}</div>
                {props.endAdornment}
            </div>
        </div>
    );
}
