import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type BaseComponentProps = {
    disabled?: boolean;
    invalid?: boolean;
    invalidMessage?: string;
    children?: React.ReactNode;
};

export const BaseComponent = React.forwardRef((props: BaseComponentProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    return (
        <div
            ref={ref}
            className={resolveClassNames({
                "opacity-50": props.disabled,
                "pointer-events-none": props.disabled,
                "cursor-default": props.disabled,
                "outline outline-red-600 relative": props.invalid,
                "mb-4": props.invalidMessage !== undefined,
            })}
        >
            {props.invalidMessage && props.invalid && (
                <div className="absolute top-full mt-2 left-0 text-red-600 text-xs z-50">{props.invalidMessage}</div>
            )}
            {props.children}
        </div>
    );
});

BaseComponent.displayName = "BaseComponent";
