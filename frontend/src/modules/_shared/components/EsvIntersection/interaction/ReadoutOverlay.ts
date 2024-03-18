import { Controller } from "@equinor/esv-intersection";

import { ReadoutObject } from "./types";

export class ReadoutOverlay {
    private _controller: Controller;
    private _overlay: HTMLElement;

    constructor(controller: Controller) {
        this._controller = controller;
        this._overlay = this.makeOverlay();
    }

    private makeOverlay(): HTMLElement {
        const overlay = this._controller.overlay.create("readout-overlay");

        if (!overlay) {
            throw new Error("Failed to create readout overlay");
        }

        overlay.style.position = "relative";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.gap = "0.5rem";
        overlay.style.width = "250px";
        overlay.style.inset = "0";
        overlay.style.pointerEvents = "none";
        overlay.style.visibility = "hidden";
        overlay.style.zIndex = "100";
        overlay.style.borderRadius = "5px";
        overlay.style.padding = "5px";
        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        overlay.style.color = "white";
        overlay.style.overflow = "hidden";

        return overlay;
    }

    makeReadout(highlightObjects: ReadoutObject[]) {
        if (highlightObjects.length === 0) {
            this._overlay.style.visibility = "hidden";
            return;
        }

        let readout = highlightObjects
            .map((highlightObject, idx) => {
                if (idx >= 3) {
                    return "";
                }
                let html = `<div style="display: flex; flex-direction: row; align-items: center; gap: 0.5rem;"><span style="display: block; width: 10px; height: 10px; border-radius: 50%; margin-right: 0.25rem; background-color: ${highlightObject.color}"></span><span style="text-overflow: ellipsis;">${highlightObject.label}`;
                html += `<br>(${highlightObject.point[0].toFixed(2)}, ${highlightObject.point[1].toFixed(2)})`;
                if (highlightObject.md !== undefined) {
                    html += `<br>MD: ${highlightObject.md.toFixed(2)}`;
                }
                if (highlightObject.polygonIndex !== undefined) {
                    html += `<br>Index: ${highlightObject.polygonIndex}`;
                }
                html += "</span></div>";
                return html;
            })
            .join("");

        if (highlightObjects.length > 3) {
            readout += `<div style="display: flex; flex-direction: row; align-items: center; gap: 0.5rem;"><span style="text-overflow: ellipsis;">... and ${
                highlightObjects.length - 5
            } more</span></div>`;
        }

        this._overlay.innerHTML = readout;
        this._overlay.style.visibility = "visible";
    }

    destroy() {
        this._controller.overlay.remove("readout-overlay");
    }
}
