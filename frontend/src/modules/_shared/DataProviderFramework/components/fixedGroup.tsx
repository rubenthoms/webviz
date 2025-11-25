import React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

import { TreeBranchLine, TreeContentLine, TreeHeaderLine } from "./treeComponents";

export type FixedGroupProps = {
    icon?: React.ReactNode;
    title: string;
    children: React.ReactNode;
    isLastItemInParent?: boolean;
};

export function FixedGroup(props: FixedGroupProps): React.ReactNode {
    const [isExpanded, setIsExpanded] = React.useState<boolean>(true);

    function handleToggleExpanded() {
        setIsExpanded(!isExpanded);
    }

    return (
        <div className="relative">
            {props.isLastItemInParent ? <TreeHeaderLine /> : <TreeContentLine />}
            <Header
                startAdornment={props.icon}
                title={props.title}
                expanded={isExpanded}
                hovered={false}
                onToggleExpanded={handleToggleExpanded}
            />
            <div className="pl-4">{isExpanded ? props.children : null}</div>
        </div>
    );
}

type HeaderProps = {
    title: React.ReactNode;
    expanded: boolean;
    hovered: boolean;
    onToggleExpanded?: () => void;
    startAdornment?: React.ReactNode;
    endAdornment?: React.ReactNode;
};

function Header(props: HeaderProps): React.ReactNode {
    return (
        <div
            className={resolveClassNames(
                "sortable-list-item-header flex w-full items-center gap-0.5 h-8 text-sm sticky z-10 bg-cyan-200 rounded-sm",
                {
                    "bg-blue-300": props.hovered,
                },
            )}
        >
            <TreeBranchLine />
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
