import type React from "react";

import {
    KeyboardDoubleArrowDown,
    KeyboardDoubleArrowLeft,
    KeyboardDoubleArrowRight,
    KeyboardDoubleArrowUp,
} from "@mui/icons-material";

import type { DockEdge } from "../SettingsDockController";

/** Points away from the modules, i.e. towards the side's edge */
export const COLLAPSE_ICONS: Record<DockEdge, React.ReactElement> = {
    left: <KeyboardDoubleArrowLeft fontSize="inherit" />,
    right: <KeyboardDoubleArrowRight fontSize="inherit" />,
    top: <KeyboardDoubleArrowUp fontSize="inherit" />,
    bottom: <KeyboardDoubleArrowDown fontSize="inherit" />,
};

/** Points towards the modules */
export const EXPAND_ICONS: Record<DockEdge, React.ReactElement> = {
    left: <KeyboardDoubleArrowRight fontSize="inherit" />,
    right: <KeyboardDoubleArrowLeft fontSize="inherit" />,
    top: <KeyboardDoubleArrowDown fontSize="inherit" />,
    bottom: <KeyboardDoubleArrowUp fontSize="inherit" />,
};
