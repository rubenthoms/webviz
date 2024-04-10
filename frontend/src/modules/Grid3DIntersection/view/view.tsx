import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore";

import { Grid3D } from "./components/grid3d";
import { Intersection } from "./components/intersection";
import { useGridPolylineIntersection } from "./queries/polylineIntersection";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): JSX.Element {
    const statusWriter = useViewStatusWriter(props.viewContext);

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const realization = props.viewContext.useSettingsToViewInterfaceValue("realization");
    const gridModelName = props.viewContext.useSettingsToViewInterfaceValue("gridModelName");
    const gridModelBoundingBox3d = props.viewContext.useSettingsToViewInterfaceValue("gridModelBoundingBox3d");
    const gridModelParameterName = props.viewContext.useSettingsToViewInterfaceValue("gridModelParameterName");
    const gridModelParameterDateOrInterval = props.viewContext.useSettingsToViewInterfaceValue(
        "gridModelParameterDateOrInterval"
    );
    const wellboreUuid = props.viewContext.useSettingsToViewInterfaceValue("wellboreUuid");

    const wellboreTrajectoriesQuery = useWellboreTrajectoriesQuery(wellboreUuid ? [wellboreUuid] : []);

    if (wellboreTrajectoriesQuery.isError) {
        statusWriter.addError(wellboreTrajectoriesQuery.error.message);
    }

    const polylineUtmXy: number[] = [];
    let referenceSystem: IntersectionReferenceSystem | null = null;
    if (wellboreTrajectoriesQuery.data) {
        const wellboreTrajectory = wellboreTrajectoriesQuery.data[0];

        const path: number[][] = [];
        for (const [index, northing] of wellboreTrajectory.northing_arr.entries()) {
            const easting = wellboreTrajectory.easting_arr[index];
            const tvd_msl = wellboreTrajectory.tvd_msl_arr[index];

            path.push([easting, northing, tvd_msl]);
        }
        const offset = wellboreTrajectory.tvd_msl_arr[0];

        referenceSystem = new IntersectionReferenceSystem(path);
        referenceSystem.offset = offset;

        const extendedTrajectory = referenceSystem.getExtendedTrajectory(10);

        for (const point of extendedTrajectory.points) {
            polylineUtmXy.push(point[0], point[1]);
        }
    }

    const polylineIntersectionQuery = useGridPolylineIntersection(
        ensembleIdent ?? null,
        gridModelName,
        gridModelParameterName,
        realization,
        polylineUtmXy
    );

    statusWriter.setLoading(polylineIntersectionQuery.isFetching || wellboreTrajectoriesQuery.isFetching);

    if (polylineIntersectionQuery.isError) {
        statusWriter.addError(polylineIntersectionQuery.error.message);
    }

    return (
        <div className="w-full h-full">
            <Grid3D ensembleIdent={ensembleIdent} realization={realization} />
            <Intersection
                referenceSystem={referenceSystem}
                polylineIntersectionData={polylineIntersectionQuery.data ?? null}
                gridBoundingBox3d={gridModelBoundingBox3d}
                colorScale={colorScale}
            />
        </div>
    );
}
