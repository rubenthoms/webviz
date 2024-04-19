import React from "react";

import { domRectsAreEqual } from "@lib/utils/geometry";
import { elementIsVisible } from "@lib/utils/htmlElementUtils";

export function useElementBoundingRect(ref: React.RefObject<HTMLElement | SVGSVGElement>): DOMRect {
    const [rect, setRect] = React.useState<DOMRect>(new DOMRect(0, 0, 0, 0));

    React.useEffect(() => {
        let isHidden = false;
        let currentRect = new DOMRect(0, 0, 0, 0);
        const parentElement = ref.current?.parentElement ?? window;

        const handleResizeAndScroll = (): void => {
            if (ref.current) {
                // If element is not visible do not change size as it might be expensive to render
                if (!isHidden && !elementIsVisible(ref.current)) {
                    isHidden = true;
                    return;
                }

                const newRect = ref.current.getBoundingClientRect();

                if (isHidden && domRectsAreEqual(currentRect, newRect)) {
                    isHidden = false;
                    return;
                }

                currentRect = newRect;

                setRect(newRect);
            }
        };

        function handleMutations(): void {
            if (ref.current) {
                const newRect = ref.current.getBoundingClientRect();

                if (!domRectsAreEqual(currentRect, newRect)) {
                    currentRect = newRect;
                    setRect(newRect);
                }
            }
        }

        const resizeObserver = new ResizeObserver(handleResizeAndScroll);
        const mutationObserver = new MutationObserver(handleMutations);
        parentElement.addEventListener("resize", handleResizeAndScroll, true);
        parentElement.addEventListener("scroll", handleResizeAndScroll, true);

        if (ref.current) {
            handleResizeAndScroll();
            resizeObserver.observe(ref.current);
            mutationObserver.observe(ref.current, {
                attributes: true,
                subtree: false,
                childList: false,
                attributeFilter: ["style", "class"],
            });
        }

        return () => {
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            parentElement.removeEventListener("resize", handleResizeAndScroll, true);
            parentElement.removeEventListener("scroll", handleResizeAndScroll, true);
        };
    }, [ref]);

    return rect;
}
