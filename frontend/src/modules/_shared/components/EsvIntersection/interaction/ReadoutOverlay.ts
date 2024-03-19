import { Controller } from "@equinor/esv-intersection";

import { ReadoutItem } from "./types";

import { makeHtmlFromReadoutItem } from "../utils/intersectionConversion";

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

    makeReadout(items: ReadoutItem[]) {
        if (items.length === 0) {
            this._overlay.style.visibility = "hidden";
            return;
        }

        let readout = items
            .map((item, idx) => {
                if (idx >= 3) {
                    return "";
                }
                return makeHtmlFromReadoutItem(item);
            })
            .join("");

        if (items.length > 3) {
            readout += `<div style="display: flex; flex-direction: row; align-items: center; gap: 0.5rem;"><span style="text-overflow: ellipsis;">... and ${
                items.length - 3
            } more</span></div>`;
        }

        this._overlay.innerHTML = readout;
        this._overlay.style.visibility = "visible";
    }

    destroy() {
        this._controller.overlay.remove("readout-overlay");
    }
}
