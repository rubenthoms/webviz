/**
 * Every settings panel renders (through a portal) into one long-lived element, which is moved into the dockview group
 * that shows the panel, or detached while the panel is closed. The panel's React tree thus stays mounted, so moving,
 * floating, hiding or closing a panel never loses its state (e.g. unsaved realization filters).
 *
 * When a panel is moved, its new place may claim the element before the old one releases it; the latest claim wins.
 */
export class PanelElementRegistry {
    private _elements = new Map<string, HTMLDivElement>();
    private _claims = new Map<string, HTMLElement[]>();

    getElement(panelId: string): HTMLDivElement {
        let element = this._elements.get(panelId);
        if (!element) {
            element = document.createElement("div");
            element.className = "flex h-full min-h-0 w-full flex-col";
            element.dataset.settingsPanel = panelId;
            this._elements.set(panelId, element);
        }
        return element;
    }

    /** Places the panel's element in `container` while this is the latest claim. Returns the release function. */
    claim(panelId: string, container: HTMLElement): () => void {
        this._claims.set(panelId, [...(this._claims.get(panelId) ?? []), container]);
        this.place(panelId);

        return () => {
            this._claims.set(
                panelId,
                (this._claims.get(panelId) ?? []).filter((existing) => existing !== container),
            );
            this.place(panelId);
        };
    }

    private place(panelId: string): void {
        const element = this.getElement(panelId);
        const container = this._claims.get(panelId)?.at(-1);
        if (!container) {
            element.remove();
            return;
        }
        if (element.parentElement !== container) {
            container.appendChild(element);
        }
    }
}
