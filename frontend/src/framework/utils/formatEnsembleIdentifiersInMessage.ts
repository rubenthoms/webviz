import type { EnsembleSet } from "@framework/EnsembleSet";

export function formatEnsembleIdentifiersInMessage(message: string, ensembleSet: EnsembleSet | null): string {
    return message.replace(
        /\{\{ensemble:([^{}]+)\}\}/g,
        function replaceEnsembleMarker(_match: string, ensembleIdent: string) {
            return ensembleSet?.findEnsembleByIdentString(ensembleIdent)?.getDisplayName() ?? ensembleIdent;
        },
    );
}
