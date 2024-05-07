import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { Add, FilterCenterFocus, Remove } from "@mui/icons-material";

export type ToolbarProps = {
    visible: boolean;
    zFactor: number;
    onFitInView: () => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
};

export function Toolbar(props: ToolbarProps): React.ReactNode {
    function handleFitInViewClick() {
        props.onFitInView();
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleIncrease();
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleDecrease();
    }

    if (!props.visible) {
        return null;
    }

    return (
        <div className="absolute left-0 top-0 bg-white p-1 rounded border-gray-300 border shadow z-30 text-sm flex flex-col gap-1 items-center">
            <Button onClick={handleFitInViewClick} title="Fit in view">
                <FilterCenterFocus fontSize="inherit" />
            </Button>
            <ToolBarDivider />
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                title="Increase vertical scale"
            >
                <Add fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
            <span title="Vertical scale">{props.zFactor.toFixed(2)}</span>
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                title="Decrease vertical scale"
            >
                <Remove fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
        </div>
    );
}

function ToolBarDivider(): React.ReactNode {
    return <div className="w-full h-[1px] bg-gray-300" />;
}
