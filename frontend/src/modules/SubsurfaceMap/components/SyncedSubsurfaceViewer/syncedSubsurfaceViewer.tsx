import React from "react";

import { ModuleContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import SubsurfaceViewer, { SubsurfaceViewerProps } from "@webviz/subsurface-viewer";
import { ViewStateType } from "@webviz/subsurface-viewer/dist/components/Map";

export type SyncedSubsurfaceViewerProps = {
    moduleContext: ModuleContext<any>;
    workbenchServices: WorkbenchServices;
} & SubsurfaceViewerProps;

export function SyncedSubsurfaceViewer(props: SyncedSubsurfaceViewerProps): JSX.Element {
    const { moduleContext, workbenchServices, ...rest } = props;
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);

    const [cameraPosition, setCameraPosition] = React.useState<ViewStateType | undefined>(undefined);

    function onCameraChange(viewport: ViewStateType) {
        syncHelper.publishValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap", {
            target: viewport.target,
            zoom: viewport.zoom as number,
            rotationX: viewport.rotationX,
            rotationOrbit: viewport.rotationOrbit,
        });
        setCameraPosition(viewport);
    }
    const computedCameraPosition =
        syncHelper.useValue(SyncSettingKey.CAMERA_POSITION_MAP, "global.syncValue.cameraPositionMap") || cameraPosition;

    return (
        <SubsurfaceViewer
            getCameraPosition={onCameraChange}
            cameraPosition={computedCameraPosition}
            {...rest}
        ></SubsurfaceViewer>
    );
}
