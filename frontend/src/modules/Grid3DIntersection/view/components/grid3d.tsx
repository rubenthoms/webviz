import { EnsembleIdent } from "@framework/EnsembleIdent";
import SubsurfaceViewer from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

export type Grid3DProps = {
    ensembleIdent: EnsembleIdent | null;
    realization: number | null;
};

export function Grid3D(props: Grid3DProps): JSX.Element {
    return (
        <div className="relative w-full h-1/2">
            <SubsurfaceViewer id="subsurface-view" />
        </div>
    );
}
