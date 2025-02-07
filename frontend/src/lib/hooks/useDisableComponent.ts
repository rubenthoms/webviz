import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type UseDisableComponentHookProps = {
    disabled?: boolean;
};

export const useDisabledComponentAttributes = (props: UseDisableComponentHookProps): { className: string } => {
    return {
        className: resolveClassNames({
            "opacity-50": props.disabled,
            "pointer-events-none": props.disabled,
            "cursor-default": props.disabled,
        }),
    };
};
