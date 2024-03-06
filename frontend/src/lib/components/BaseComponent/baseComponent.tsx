import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type BaseComponentProps = {
    disabled?: boolean;
    invalid?: boolean;
    invalidMessage?: string;
    children?: React.ReactNode;
};

export const BaseComponent = React.forwardRef((props: BaseComponentProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    function maybeMakeInvalidMessage(): React.ReactNode {
        if (props.invalidMessage === undefined || !props.invalid) {
            return null;
        }
        return <span className="text-red-600 text-sm">{props.invalidMessage}</span>;
    }
    return (
        <div
            className={resolveClassNames("flex flex-col gap-2", {
                "opacity-50": props.disabled,
                "pointer-events-none": props.disabled,
                "cursor-default": props.disabled,
            })}
        >
            <div
                ref={ref}
                className={resolveClassNames({
                    "outline outline-red-600 relative": props.invalid,
                })}
            >
                {props.children}
            </div>
            {maybeMakeInvalidMessage()}
        </div>
    );
});

BaseComponent.displayName = "BaseComponent";
