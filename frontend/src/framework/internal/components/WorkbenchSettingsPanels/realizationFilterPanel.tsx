import React from "react";

import { GuiEvent, GuiState, SettingsPanel, useGuiValue } from "@framework/GuiMessageBroker";
import { useSettingsDockController } from "@framework/internal/components/SettingsDock";
import { UnsavedChangesAction } from "@framework/types/unsavedChangesAction";
import type { Workbench } from "@framework/Workbench";
import { AlertDialog } from "@lib/components/AlertDialog";

import { RealizationFilterSettings } from "./private-components/realizationFilterSettings";

type RealizationFilterPanelProps = {
    workbench: Workbench;
};

/** The realization filters, asking what to do with unsaved filter changes before the panel is closed */
export function RealizationFilterPanel(props: RealizationFilterPanelProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const controller = useSettingsDockController();
    const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

    const numberOfUnsavedRealizationFilters = useGuiValue(guiMessageBroker, GuiState.NumberOfUnsavedRealizationFilters);
    const hasUnsavedChangesRef = React.useRef(false);
    hasUnsavedChangesRef.current = numberOfUnsavedRealizationFilters !== 0;

    React.useEffect(
        function registerUnsavedChangesCloseGuard() {
            return controller.registerCloseGuard(SettingsPanel.RealizationFilterSettings, () => {
                if (hasUnsavedChangesRef.current) {
                    setDialogOpen(true);
                    return false;
                }
                return true;
            });
        },
        [controller],
    );

    function closePanel() {
        controller.closePanel(SettingsPanel.RealizationFilterSettings, { force: true });
    }

    function handleClose() {
        controller.closePanel(SettingsPanel.RealizationFilterSettings);
    }

    function handleDialogSaveClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Save,
        });
        setDialogOpen(false);
        closePanel();
    }

    function handleDialogDiscardClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Discard,
        });
        setDialogOpen(false);
        closePanel();
    }

    function handleDialogCloseClick() {
        guiMessageBroker.publishEvent(GuiEvent.UnsavedRealizationFilterSettingsAction, {
            action: UnsavedChangesAction.Cancel,
        });
        setDialogOpen(false);
    }

    return (
        <>
            <RealizationFilterSettings workbench={props.workbench} onClose={handleClose} />
            <AlertDialog
                open={dialogOpen}
                onOpenChange={handleDialogCloseClick}
                title="Unsaved changes - Realization filter"
                primaryAction={{
                    label: "Cancel",
                    onClick: handleDialogCloseClick,
                    tone: "accent",
                }}
                secondaryActions={[
                    {
                        label: "Discard changes",
                        onClick: handleDialogDiscardClick,
                        tone: "danger",
                    },
                    {
                        label: "Save changes",
                        onClick: handleDialogSaveClick,
                        tone: "accent",
                    },
                ]}
            >
                You have unsaved realization filter changes which are not applied to their respective ensemble yet. Do
                you want to save the changes?
            </AlertDialog>
        </>
    );
}
