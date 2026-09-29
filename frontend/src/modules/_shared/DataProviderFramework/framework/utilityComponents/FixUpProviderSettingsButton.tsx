import React from "react";

import { AutoFixHigh } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Tooltip } from "@lib/components/Tooltip";

import type { DataProvider } from "../DataProvider/DataProvider";

export type FixUpProviderSettingsButtonProps = {
    dataProvider: DataProvider<any, any>;
};

export function FixUpProviderSettingsButton(props: FixUpProviderSettingsButtonProps): React.ReactNode {
    const [isFixingUp, setIsFixingUp] = React.useState(false);

    async function handleFixUp() {
        setIsFixingUp(true);
        try {
            await props.dataProvider.getSettingsContextDelegate().fixupAllInvalidSettings();
        } finally {
            setIsFixingUp(false);
        }
    }

    return (
        <Tooltip content="Attempt to fix invalid settings" side="bottom">
            <Button onClick={handleFixUp} disabled={isFixingUp} variant="ghost" tone="neutral" size="small" iconOnly>
                {isFixingUp ? <CircularProgress size="em" /> : <AutoFixHigh fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
