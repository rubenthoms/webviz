import { LayerManager } from "@modules/LayerSpike/layers/LayerManager";

import { atom } from "jotai";

export const userSelectedFieldIdentifierAtom = atom<string | null>(null);
export const layerManagerAtom = atom<LayerManager | null>(null);
