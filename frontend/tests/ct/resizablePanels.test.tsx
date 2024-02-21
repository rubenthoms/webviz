import { ResizablePanels } from "@lib/components/ResizablePanels";
import { ResizablePanelsProps } from "@lib/components/ResizablePanels/resizablePanels";
import { Point2D, Size2D } from "@lib/utils/geometry";
import { ComponentFixtures, expect, test } from "@playwright/experimental-ct-react";
import { Locator } from "@playwright/test";

import { fuzzyCompare } from "tests/utils/fuzzyCompare";

const viewPortSize = { width: 1920, height: 1080 };

test.use({ viewport: viewPortSize });

async function mountComponentAndAssertItsRenderedCorrectly(
    mount: ComponentFixtures["mount"],
    props: Omit<ResizablePanelsProps, "children" | "id">
): ReturnType<ComponentFixtures["mount"]> {
    const resizablePanels = await mount(
        <div className="w-screen h-screen" id="container">
            <ResizablePanels {...props} id="resizable-panels-test">
                <div id="first" className="h-full" />
                <div id="second" className="h-full" />
                <div id="third" className="h-full" />
            </ResizablePanels>
        </div>
    );

    const resizablePanelByDivs = await resizablePanels.locator("div").first().locator("div");
    // 3 children with their wrappers = 3 * 2 = 6
    // 2 drag handles with their children = 2 * 2 = 4
    // 1 cursor overlay
    await expect(resizablePanelByDivs).toHaveCount(11);

    return resizablePanels;
}

async function makeContentLocatorsAndAssertTheirExistence(
    resizablePanels: Locator
): Promise<[Locator, Locator, Locator]> {
    const content1 = resizablePanels.locator("#first");
    const content2 = resizablePanels.locator("#second");
    const content3 = resizablePanels.locator("#third");

    expect(content1).not.toBeNull();
    expect(content2).not.toBeNull();
    expect(content3).not.toBeNull();

    return [content1, content2, content3];
}

async function makeDragHandleLocatorsAndAssertTheirExistence(resizablePanels: Locator): Promise<[Locator, Locator]> {
    const dragHandle1 = resizablePanels.locator("div").nth(5);
    const dragHandle2 = resizablePanels.locator("div").nth(9);

    expect(dragHandle1).not.toBeNull();
    expect(dragHandle2).not.toBeNull();

    return [dragHandle1, dragHandle2];
}

function assertExpectedPositionAndSize(
    locator: Locator,
    position: Point2D,
    size: Size2D,
    tolerance = 1.0
): Promise<boolean> {
    return locator.boundingBox().then((boundingBox) => {
        if (boundingBox === null) {
            return false;
        }
        return (
            fuzzyCompare(boundingBox.x, position.x, tolerance) &&
            fuzzyCompare(boundingBox.y, position.y, tolerance) &&
            fuzzyCompare(boundingBox.width, size.width, tolerance) &&
            fuzzyCompare(boundingBox.height, size.height, tolerance)
        );
    });
}

test.describe("ResizablePanels", () => {
    test("Renders correctly horizontally", async ({ mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "horizontal",
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);

        const expectedWidths = [viewPortSize.width / 3 - 0.5, viewPortSize.width / 3 - 1, viewPortSize.width / 3 - 0.5];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: expectedWidths[0], height: viewPortSize.height }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: expectedWidths[0] + 1, y: 0 },
                { width: expectedWidths[1], height: viewPortSize.height }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: expectedWidths[0] + expectedWidths[1] + 2, y: 0 },
                { width: expectedWidths[2], height: viewPortSize.height }
            )
        ).toBeTruthy();
    });

    test("Renders correctly vertically", async ({ mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "vertical",
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);

        const expectedHeight = [
            viewPortSize.height / 3 - 0.5,
            viewPortSize.height / 3 - 1,
            viewPortSize.height / 3 - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: viewPortSize.width, height: expectedHeight[0] }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: 0, y: expectedHeight[0] + 1 },
                { width: viewPortSize.width, height: expectedHeight[1] }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: 0, y: expectedHeight[0] + expectedHeight[1] + 2 },
                { width: viewPortSize.width, height: expectedHeight[2] }
            )
        ).toBeTruthy();
    });

    test("Applies given sizes correctly horizontally", async ({ mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "horizontal",
            sizesInPercent: [50, 25, 25],
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);

        let expectedWidths = [
            viewPortSize.width * 0.5 - 0.5,
            viewPortSize.width * 0.25 - 1,
            viewPortSize.width * 0.25 - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: expectedWidths[0], height: viewPortSize.height }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: expectedWidths[0] + 1, y: 0 },
                { width: expectedWidths[1], height: viewPortSize.height }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: expectedWidths[0] + expectedWidths[1] + 2, y: 0 },
                { width: expectedWidths[2], height: viewPortSize.height }
            )
        ).toBeTruthy();

        await resizablePanels.update(
            <div className="w-screen h-screen" id="container">
                <ResizablePanels direction="horizontal" id="resizable-panels-test" sizesInPercent={[25, 50, 25]}>
                    <div id="first" className="w-full h-full" />
                    <div id="second" className="w-full h-full" />
                    <div id="third" className="w-full h-full" />
                </ResizablePanels>
            </div>
        );

        expectedWidths = [
            viewPortSize.width * 0.25 - 0.5,
            viewPortSize.width * 0.5 - 1,
            viewPortSize.width * 0.25 - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: expectedWidths[0], height: viewPortSize.height }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: expectedWidths[0] + 1, y: 0 },
                { width: expectedWidths[1], height: viewPortSize.height }
            )
        ).toBeTruthy();
        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: expectedWidths[0] + expectedWidths[1] + 2, y: 0 },
                { width: expectedWidths[2], height: viewPortSize.height }
            )
        ).toBeTruthy();
    });

    test("Applies given sizes correctly vertically", async ({ mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "vertical",
            sizesInPercent: [50, 25, 25],
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);

        expect(content1).not.toBeNull();
        expect(content2).not.toBeNull();
        expect(content3).not.toBeNull();

        let expectedHeights = [
            viewPortSize.height * 0.5 - 0.5,
            viewPortSize.height * 0.25 - 1,
            viewPortSize.height * 0.25 - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: viewPortSize.width, height: expectedHeights[0] }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: 0, y: expectedHeights[0] + 1 },
                { width: viewPortSize.width, height: expectedHeights[1] }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: 0, y: expectedHeights[0] + expectedHeights[1] + 2 },
                { width: viewPortSize.width, height: expectedHeights[2] }
            )
        ).toBeTruthy();

        await resizablePanels.update(
            <div className="w-screen h-screen" id="container">
                <ResizablePanels direction="vertical" id="resizable-panels-test" sizesInPercent={[25, 50, 25]}>
                    <div id="first" className="w-full h-full" />
                    <div id="second" className="w-full h-full" />
                    <div id="third" className="w-full h-full" />
                </ResizablePanels>
            </div>
        );

        expectedHeights = [
            viewPortSize.height * 0.25 - 0.5,
            viewPortSize.height * 0.5 - 1,
            viewPortSize.height * 0.25 - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: viewPortSize.width, height: expectedHeights[0] }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: 0, y: expectedHeights[0] + 1 },
                { width: viewPortSize.width, height: expectedHeights[1] }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: 0, y: expectedHeights[0] + expectedHeights[1] + 2 },
                { width: viewPortSize.width, height: expectedHeights[2] }
            )
        ).toBeTruthy();
    });

    test("Respects min sizes in horizontal direction", async ({ mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "horizontal",
            minSizes: [300, 0, 300],
            sizesInPercent: [10, 80, 10],
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);

        expect(content1).not.toBeNull();
        expect(content2).not.toBeNull();
        expect(content3).not.toBeNull();

        const expectedWidths = [299.5, viewPortSize.width - 600 - 1, 299.5];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: expectedWidths[0], height: viewPortSize.height }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: expectedWidths[0] + 1, y: 0 },
                { width: expectedWidths[1], height: viewPortSize.height }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: expectedWidths[0] + expectedWidths[1] + 2, y: 0 },
                { width: expectedWidths[2], height: viewPortSize.height }
            )
        ).toBeTruthy();
    });

    test("Respects min sizes in vertical direction", async ({ mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "vertical",
            minSizes: [300, 0, 300],
            sizesInPercent: [10, 80, 10],
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);

        const expectedHeights = [299.5, viewPortSize.height - 600 - 1, 299.5];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: viewPortSize.width, height: expectedHeights[0] }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: 0, y: expectedHeights[0] + 1 },
                { width: viewPortSize.width, height: expectedHeights[1] }
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: 0, y: expectedHeights[0] + expectedHeights[1] + 2 },
                { width: viewPortSize.width, height: expectedHeights[2] }
            )
        ).toBeTruthy();
    });

    test("Resizing is working horizontally", async ({ page, mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "horizontal",
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);
        const [dragHandle1] = await makeDragHandleLocatorsAndAssertTheirExistence(resizablePanels);

        const dragHandle1BoundingBox = await dragHandle1.boundingBox();
        expect(dragHandle1BoundingBox).not.toBeNull();

        if (dragHandle1BoundingBox === null) {
            return;
        }

        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2 + 100,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2
        );
        await page.mouse.up();

        const expectedWidths = [
            viewPortSize.width / 3 - 0.5 + 100,
            viewPortSize.width / 3 - 1 - 100,
            viewPortSize.width / 3 - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: expectedWidths[0], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: expectedWidths[0] + 1, y: 0 },
                { width: expectedWidths[1], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: expectedWidths[0] + expectedWidths[1] + 2, y: 0 },
                { width: expectedWidths[2], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();
    });

    test("Resizing is working vertically", async ({ page, mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "vertical",
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);
        const [dragHandle1] = await makeDragHandleLocatorsAndAssertTheirExistence(resizablePanels);

        const dragHandle1BoundingBox = await dragHandle1.boundingBox();
        expect(dragHandle1BoundingBox).not.toBeNull();

        if (dragHandle1BoundingBox === null) {
            return;
        }

        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2 + 100
        );
        await page.mouse.up();

        const expectedHeights = [
            viewPortSize.height / 3 - 0.5 + 100,
            viewPortSize.height / 3 - 1 - 100,
            viewPortSize.height / 3 - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: viewPortSize.width, height: expectedHeights[0] },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: 0, y: expectedHeights[0] + 1 },
                { width: viewPortSize.width, height: expectedHeights[1] },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: 0, y: expectedHeights[0] + expectedHeights[1] + 2 },
                { width: viewPortSize.width, height: expectedHeights[2] },
                3.0
            )
        ).toBeTruthy();
    });

    test("Resizing not violating bounds horizontally", async ({ page, mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "horizontal",
            minSizes: [300, 0, 0],
            sizesInPercent: [10, 80, 10],
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);
        const [dragHandle1, dragHandle2] = await makeDragHandleLocatorsAndAssertTheirExistence(resizablePanels);

        const dragHandle1BoundingBox = await dragHandle1.boundingBox();
        expect(dragHandle1BoundingBox).not.toBeNull();

        if (dragHandle1BoundingBox === null) {
            return;
        }

        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(-100, dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2);
        await page.mouse.up();

        let expectedWidths = [0, viewPortSize.width - 0.1 * viewPortSize.width - 1.5, 0.1 * viewPortSize.width - 0.5];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: expectedWidths[0], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: expectedWidths[0] + 1, y: 0 },
                { width: expectedWidths[1], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: expectedWidths[0] + expectedWidths[1] + 2, y: 0 },
                { width: expectedWidths[2], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();

        await resizablePanels.update(
            <div className="w-screen h-screen" id="container">
                <ResizablePanels
                    direction="horizontal"
                    id="resizable-panels-test"
                    sizesInPercent={[10, 78, 12]}
                    minSizes={[0, 0, 300]}
                >
                    <div id="first" className="w-full h-full" />
                    <div id="second" className="w-full h-full" />
                    <div id="third" className="w-full h-full" />
                </ResizablePanels>
            </div>
        );

        const dragHandle2BoundingBox = await dragHandle2.boundingBox();
        expect(dragHandle2BoundingBox).not.toBeNull();

        if (dragHandle2BoundingBox === null) {
            return;
        }

        await page.mouse.move(
            dragHandle2BoundingBox.x + dragHandle2BoundingBox.width / 2,
            dragHandle2BoundingBox.y + dragHandle2BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(viewPortSize.width + 100, dragHandle2BoundingBox.y + dragHandle2BoundingBox.height / 2);
        await page.mouse.up();

        expectedWidths = [0.1 * viewPortSize.width - 0.5, viewPortSize.width - 0.1 * viewPortSize.width - 1.5, 0];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: expectedWidths[0], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: expectedWidths[0] + 1, y: 0 },
                { width: expectedWidths[1], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: expectedWidths[0] + expectedWidths[1] + 2, y: 0 },
                { width: expectedWidths[2], height: viewPortSize.height },
                3.0
            )
        ).toBeTruthy();
    });

    test("Resizing not violating bounds vertically", async ({ page, mount }) => {
        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "vertical",
            minSizes: [300, 0, 0],
            sizesInPercent: [10, 80, 10],
        });
        const [content1, content2, content3] = await makeContentLocatorsAndAssertTheirExistence(resizablePanels);
        const [dragHandle1, dragHandle2] = await makeDragHandleLocatorsAndAssertTheirExistence(resizablePanels);

        const dragHandle1BoundingBox = await dragHandle1.boundingBox();
        expect(dragHandle1BoundingBox).not.toBeNull();

        if (dragHandle1BoundingBox === null) {
            return;
        }

        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2, -100);
        await page.mouse.up();

        let expectedHeights = [
            0,
            viewPortSize.height - 0.1 * viewPortSize.height - 1.5,
            0.1 * viewPortSize.height - 0.5,
        ];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: viewPortSize.width, height: expectedHeights[0] },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: 0, y: expectedHeights[0] + 1 },
                { width: viewPortSize.width, height: expectedHeights[1] },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: 0, y: expectedHeights[0] + expectedHeights[1] + 2 },
                { width: viewPortSize.width, height: expectedHeights[2] },
                3.0
            )
        ).toBeTruthy();

        await resizablePanels.update(
            <div className="w-screen h-screen" id="container">
                <ResizablePanels
                    direction="vertical"
                    id="resizable-panels-test"
                    sizesInPercent={[10, 78, 12]}
                    minSizes={[0, 0, 300]}
                >
                    <div id="first" className="w-full h-full" />
                    <div id="second" className="w-full h-full" />
                    <div id="third" className="w-full h-full" />
                </ResizablePanels>
            </div>
        );

        const dragHandle2BoundingBox = await dragHandle2.boundingBox();
        expect(dragHandle2BoundingBox).not.toBeNull();

        if (dragHandle2BoundingBox === null) {
            return;
        }

        await page.mouse.move(
            dragHandle2BoundingBox.x + dragHandle2BoundingBox.width / 2,
            dragHandle2BoundingBox.y + dragHandle2BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2, viewPortSize.height + 100);
        await page.mouse.up();

        expectedHeights = [0.1 * viewPortSize.height - 0.5, viewPortSize.height - 0.1 * viewPortSize.height - 1.5, 0];

        expect(
            await assertExpectedPositionAndSize(
                content1,
                { x: 0, y: 0 },
                { width: viewPortSize.width, height: expectedHeights[0] },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content2,
                { x: 0, y: expectedHeights[0] + 1 },
                { width: viewPortSize.width, height: expectedHeights[1] },
                3.0
            )
        ).toBeTruthy();

        expect(
            await assertExpectedPositionAndSize(
                content3,
                { x: 0, y: expectedHeights[0] + expectedHeights[1] + 2 },
                { width: viewPortSize.width, height: expectedHeights[2] },
                3.0
            )
        ).toBeTruthy();
    });

    test("'onSizesChange' callback correctly called", async ({ page, mount }) => {
        let callbackSizes: number[] = [];

        function onSizesChangeCallback(sizes: number[]) {
            callbackSizes = sizes;
        }

        const resizablePanels = await mountComponentAndAssertItsRenderedCorrectly(mount, {
            direction: "horizontal",
            onSizesChange: onSizesChangeCallback,
        });
        const [dragHandle1, dragHandle2] = await makeDragHandleLocatorsAndAssertTheirExistence(resizablePanels);

        const dragHandle1BoundingBox = await dragHandle1.boundingBox();
        const dragHandle2BoundingBox = await dragHandle2.boundingBox();

        expect(dragHandle1BoundingBox).not.toBeNull();
        expect(dragHandle2BoundingBox).not.toBeNull();

        if (dragHandle1BoundingBox === null || dragHandle2BoundingBox === null) {
            return;
        }

        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
            dragHandle1BoundingBox.x + dragHandle1BoundingBox.width / 2 - 100,
            dragHandle1BoundingBox.y + dragHandle1BoundingBox.height / 2
        );
        await page.mouse.up();

        let expectedWidths = [
            viewPortSize.width / 3 - 0.5 - 100,
            viewPortSize.width / 3 - 1 + 100,
            viewPortSize.width / 3 - 0.5,
        ];

        for (let i = 0; i < 3; i++) {
            expect(fuzzyCompare(callbackSizes[i], (expectedWidths[i] / viewPortSize.width) * 100, 1.0)).toBeTruthy();
        }

        await page.mouse.move(
            dragHandle2BoundingBox.x + dragHandle2BoundingBox.width / 2,
            dragHandle2BoundingBox.y + dragHandle2BoundingBox.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
            dragHandle2BoundingBox.x + dragHandle2BoundingBox.width / 2 + 100,
            dragHandle2BoundingBox.y + dragHandle2BoundingBox.height / 2
        );
        await page.mouse.up();

        expectedWidths = [
            viewPortSize.width / 3 - 0.5 - 100,
            viewPortSize.width / 3 - 1 + 200,
            viewPortSize.width / 3 - 0.5 - 100,
        ];

        for (let i = 0; i < 3; i++) {
            expect(fuzzyCompare(callbackSizes[i], (expectedWidths[i] / viewPortSize.width) * 100, 1.0)).toBeTruthy();
        }
    });
});
