import { ModuleFCProps } from "@framework/Module";
import { Label } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";

import { State } from "./state";

export function Settings(props: ModuleFCProps<State>) {
    const [grid, setGrid] = props.moduleContext.useStoreState("grid");
    const [wellbore, setWellbore] = props.moduleContext.useStoreState("wellbore");
    const [geoModel, setGeoModel] = props.moduleContext.useStoreState("geoModel");
    const [geoModelLabels, setGeoModelLabels] = props.moduleContext.useStoreState("geoModelLabels");
    const [seismic, setSeismic] = props.moduleContext.useStoreState("seismic");
    const [schematic, setSchematic] = props.moduleContext.useStoreState("schematic");
    const [seaAndRbk, setSeaAndRbk] = props.moduleContext.useStoreState("seaAndRbk");
    const [picks, setPicks] = props.moduleContext.useStoreState("picks");
    const [axisLabels, setAxisLabels] = props.moduleContext.useStoreState("axisLabels");
    const [polyLineIntersection, setPolyLineIntersection] = props.moduleContext.useStoreState("polyLineIntersection");

    function handleGridChange() {
        setGrid(!grid);
    }

    return (
        <div className="flex flex-col gap-2">
            <Label text="Show grid">
                <Switch checked={grid} onChange={handleGridChange} />
            </Label>
            <Label text="Show wellbore">
                <Switch checked={wellbore} onChange={() => setWellbore(!wellbore)} />
            </Label>
            <Label text="Show geo model">
                <Switch checked={geoModel} onChange={() => setGeoModel(!geoModel)} />
            </Label>
            <Label text="Show geo model labels">
                <Switch checked={geoModelLabels} onChange={() => setGeoModelLabels(!geoModelLabels)} />
            </Label>
            <Label text="Show seismic">
                <Switch checked={seismic} onChange={() => setSeismic(!seismic)} />
            </Label>
            <Label text="Show schematic">
                <Switch checked={schematic} onChange={() => setSchematic(!schematic)} />
            </Label>
            <Label text="Show sea and RBK">
                <Switch checked={seaAndRbk} onChange={() => setSeaAndRbk(!seaAndRbk)} />
            </Label>
            <Label text="Show picks">
                <Switch checked={picks} onChange={() => setPicks(!picks)} />
            </Label>
            <Label text="Show axis labels">
                <Switch checked={axisLabels} onChange={() => setAxisLabels(!axisLabels)} />
            </Label>
            <Label text="Show polyline intersection">
                <Switch
                    checked={polyLineIntersection}
                    onChange={() => setPolyLineIntersection(!polyLineIntersection)}
                />
            </Label>
        </div>
    );
}
