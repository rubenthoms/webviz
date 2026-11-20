import type React from "react";

import { Block, CloudOff, Error, Warning } from "@mui/icons-material";

import { StatusCategory } from "@framework/ModuleInstanceStatus";

export type StatusCategoryIconProps = {
    category: StatusCategory;
};

export function StatusCategoryIcon(props: StatusCategoryIconProps): React.ReactNode {
    switch (props.category) {
        case StatusCategory.ACTION_REQUIRED:
            return <Block fontSize="inherit" color="error" />;
        case StatusCategory.DATA_ERROR:
            return <Error fontSize="inherit" color="error" />;
        case StatusCategory.RETRYABLE_ERROR:
            return <CloudOff fontSize="inherit" color="error" />;
        case StatusCategory.WARNING:
            return <Warning fontSize="inherit" color="warning" />;
    }
}
