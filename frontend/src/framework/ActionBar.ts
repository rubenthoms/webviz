import React from "react";

/**
 * Semantic command, independent of where and how it is presented.
 */
export type Action = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    isEnabled?: boolean;
    execute(): void;
};

export type ActionBarButton = {
    type: "button";
    id: string;
    action: Action;
};

export type ActionBarToggle = {
    type: "toggle";
    id: string;
    label: string;
    icon?: React.ReactNode;
    isEnabled?: boolean;
    pressed: boolean;
    setPressed(pressed: boolean): void;
};

export type ActionBarNumberInput = {
    type: "number";
    id: string;
    label: string;
    isEnabled?: boolean;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    setValue(value: number): void;
};

export type ActionBarSeparator = {
    type: "separator";
    id: string;
};

export type ActionBarControl = ActionBarButton | ActionBarToggle | ActionBarNumberInput | ActionBarSeparator;

export type ActionBarGroup = {
    id: string;
    label?: string;
    order?: number;
    controls: readonly ActionBarControl[];
};

export type ActionBarTabMetadata = {
    id: string;
    label: string;
    order?: number;
    contextual?: boolean;
};

export type ActionBarTab = ActionBarTabMetadata & {
    groups: readonly ActionBarGroup[];
};

export type ActionBarContribution = {
    tab: ActionBarTabMetadata;
    groups: readonly ActionBarGroup[];
    /** "activate": the tab requests activation when this contribution becomes applicable. */
    activation?: "none" | "activate";
    /**
     * Semantic context identity used only for activation transitions (e.g. the selection anchor).
     * A change of key while the contribution stays registered requests activation again.
     */
    activationKey?: string;
};

export interface ModuleActionBarContributionApi {
    setContribution(id: string, contribution: ActionBarContribution): void;
    removeContribution(id: string): void;
}

export const ModuleActionBarContext = React.createContext<ModuleActionBarContributionApi | null>(null);

/**
 * Contributes tab content to the Action Bar for as long as the calling component is mounted.
 * Pass `null` to withdraw the contribution without unmounting.
 */
export function useActionBarContribution(contribution: ActionBarContribution | null): void {
    const api = React.useContext(ModuleActionBarContext);
    if (!api) {
        throw new Error("useActionBarContribution must be used within a module's settings or view");
    }

    const id = React.useId();

    // Lifetime only - an update must never remove the contribution first, as re-adding it would
    // look like a newly applicable context and steal focus
    React.useEffect(
        function removeContributionOnUnmount() {
            return () => {
                api.removeContribution(id);
            };
        },
        [api, id],
    );

    React.useEffect(
        function updateContribution() {
            if (contribution === null) {
                api.removeContribution(id);
                return;
            }
            api.setContribution(id, contribution);
        },
        [api, id, contribution],
    );
}
