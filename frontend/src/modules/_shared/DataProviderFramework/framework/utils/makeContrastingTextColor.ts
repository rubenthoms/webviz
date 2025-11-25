// colorContrast.ts
import { parse, wcagContrast, formatHex } from "culori";

export function getContrastingTextColor(
    backgroundHex: string,
    {
        lightTextHex = "#ffffff",
        darkTextHex = "#000000",
    }: {
        lightTextHex?: string;
        darkTextHex?: string;
    } = {},
): string {
    const bg = parse(backgroundHex);
    if (!bg) {
        // Fallback if invalid color
        return darkTextHex;
    }

    const light = parse(lightTextHex)!;
    const dark = parse(darkTextHex)!;

    const contrastLight = wcagContrast(bg, light);
    const contrastDark = wcagContrast(bg, dark);

    // Prefer the one with higher contrast
    const bestIsLight = contrastLight >= contrastDark;

    const bestColor = bestIsLight ? light : dark;

    // If the best one still doesn't meet minContrast, you could:
    // - return it anyway (current behavior), or
    // - throw, or
    // - apply more advanced logic (e.g., adjust lightness).
    // Here we just return the best of black/white:
    return formatHex(bestColor);
}
