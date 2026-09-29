import React from "react";

import { AutoFixHigh } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { isDataProviderWithInvalidSettings } from "../DataProvider/DataProvider";
import type { DataProvider } from "../DataProvider/DataProvider";
import { DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";

export type FixUpAllInvalidSettingsButtonProps = {
    dataProviderManager: DataProviderManager;
};

export function FixUpAllInvalidSettingsButton(props: FixUpAllInvalidSettingsButtonProps): React.ReactNode {
    usePublishSubscribeTopicValue(props.dataProviderManager, DataProviderManagerTopic.DATA_REVISION);
    const [isFixingUp, setIsFixingUp] = React.useState(false);

    const invalidProviders = props.dataProviderManager
        .getGroupDelegate()
        .getDescendantItems(isDataProviderWithInvalidSettings) as DataProvider<any, any>[];

    if (invalidProviders.length === 0 && !isFixingUp) {
        return null;
    }

    async function handleFixUpAll() {
        setIsFixingUp(true);
        try {
            await Promise.all(
                invalidProviders.map((provider) => provider.getSettingsContextDelegate().fixupAllInvalidSettings()),
            );
        } finally {
            setIsFixingUp(false);
        }
    }

    return (
        <Tooltip content="Attempt to fix all invalid settings" side="bottom">
            <Button onClick={handleFixUpAll} disabled={isFixingUp} variant="ghost" tone="neutral" size="small" iconOnly>
                {isFixingUp ? <CircularProgress size="em" /> : <AutoFixHigh fontSize="inherit" />}
            </Button>
        </Tooltip>
    );
}
