export type TreeComponentProps = {
    color?: string;
};

export function TreeHeaderLine(props: TreeComponentProps): React.ReactNode {
    return (
        <div
            className="absolute -left-2 -top-1 w-0.5 bg-gray-800"
            style={{ backgroundColor: props.color, height: "calc(50% + 4px)" }}
        />
    );
}

export function TreeContentLine(props: TreeComponentProps): React.ReactNode {
    return <div className="absolute -left-2 top-0 w-0.5 h-full bg-gray-800" style={{ backgroundColor: props.color }} />;
}

export function TreeBranchLine(props: TreeComponentProps): React.ReactNode {
    return (
        <div
            className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-2 h-0.5 bg-gray-800"
            style={{ backgroundColor: props.color }}
        />
    );
}
