import { Viewport } from "@deck.gl/core";

import { isEqual } from "lodash";
import RBush from "rbush";

import { Vec2, Vec3 } from "./definitions";
import {
    calcDistance,
    clamp,
    edgeOfRectangle,
    getLabelQuadrant,
    labelAngles,
    labelAnglesMap,
    mixVec2,
    occlusionTest,
} from "./helpers";
import { AnnotationInstance, ScreenPositionCandidate } from "./types";

const viewportX = [-0.99, 0.99];
const viewportY = [-0.99, 0.99];
const collisionMargin = 1;
const collisionMargin2 = collisionMargin * 2;

const healthChangeRate = 3;
const transitionRate = 5;

let prevTime = 0;
let _transform: string, _opacity: string, _zIndex: string;
let x: number, y: number;

const nearTree = new RBush(); // used for near annotations
const distantTree = new RBush(); // used for distant annotations

function calculateLabelPosition(
    instance: AnnotationInstance,
    positionSlot: number,
    size: Vec2,
    viewportOffset: Vec2 = [0, 0]
) {
    const scale = instance.state.scaleFactor!;
    const positionOptions = labelAnglesMap[instance.state.quadrant!];

    const angle = labelAngles[positionOptions[positionSlot]];

    const labelWidth = instance.state.labelWidth || 0;
    const labelHeight = instance.state.labelHeight || 0;
    const scaledWidth = labelWidth * scale;
    const scaledHeight = labelHeight * scale;

    const labelEdge = edgeOfRectangle([scaledWidth, scaledHeight], angle);

    const direction: Vec2 = [Math.cos(angle), -Math.sin(angle)];
    const offset = instance.organizer.getParams().labelOffset! * scale;

    const anchorPosition: Vec2 = [
        (instance.state.screenPosition![0] * 0.5 + 0.5) * size[0] + direction[0] * offset,
        (-instance.state.screenPosition![1] * 0.5 + 0.5) * size[1] + direction[1] * offset,
    ];

    instance.state.anchorPosition = anchorPosition;

    instance.state.scaledOffset = [(labelWidth - scaledWidth) / 2, (labelHeight - scaledHeight) / 2];

    instance.state.labelPosition = [
        anchorPosition[0] - scaledWidth / 2 + labelEdge[0] + viewportOffset[0],
        anchorPosition[1] - scaledHeight / 2 + labelEdge[1] + viewportOffset[1],
    ];
}

function setTransition(
    instance: AnnotationInstance,
    assignedSlot: number,
    prevLabelPosition: Vec2 | null,
    prevAnchorPosition: Vec2 | null
) {
    if (
        instance.state.visible &&
        (instance.state.positionSlot !== assignedSlot ||
            (instance.state.prevQuadrant && instance.state.prevQuadrant !== instance.state.quadrant)) &&
        prevLabelPosition
    ) {
        instance.state.inTransition = true;
        instance.state.transitionTime = 0;
        instance.state.prevLabelPosition = prevLabelPosition;
        if (prevAnchorPosition) instance.state.prevAnchorPosition = prevAnchorPosition;
    }
}

/**
 * PRE-PROCESS INSTANCES
 */
export function preprocessInstances(instances: AnnotationInstance[], viewport: Viewport, maxVisible: number) {
    const deltaTime = Date.now() - prevTime;

    const fov = 2.0 * Math.atan(1.0 / viewport.projectionMatrix[5]);
    const fovRad = (fov * Math.PI) / 180.0;

    let nInViewSpace = 0;
    const inViewspace: AnnotationInstance[] = [];

    instances.forEach((instance, i) => {
        instance.state.capped = false;
        instance.state._needsUpdate = false;
        if (!instance.state.visible) {
            instance.state.health = 0;
            instance.state.prevAnchorPosition = undefined;
            instance.state.prevLabelPosition = undefined;
        }

        if (instance.state.kill) {
            if (instance.state.health === 0) {
                instance.state.kill = false;
                instance.state.visible = false;
            } else if (instance.state.health > 0) {
                instance.state.health = Math.max(0, instance.state.health - deltaTime * healthChangeRate);
            }
        } else if (instance.state.health < 1) {
            instance.state.health = Math.min(1, Math.max(0, instance.state.health + deltaTime * healthChangeRate));
        }

        if (instance.state.inTransition) {
            instance.state.transitionTime! += deltaTime * transitionRate;
            if (instance.state.transitionTime! >= 1) {
                instance.state.inTransition = false;
                instance.state.transitionTime = 0;
                instance.state.prevAnchorPosition = undefined;
                instance.state.prevLabelPosition = undefined;
            }
        }

        let positions: Vec3[] = [instance.annotation.position];
        if (instance.annotation.alternativePositions) {
            positions.push(...instance.annotation.alternativePositions);
        }

        let scaleFactor = 0.25;
        let distance = 0;
        let isInViewSpace = false;
        let position: Vec3 = [0, 0, 0];

        const candidates: ScreenPositionCandidate[] = [];

        for (let j = 0; j < positions.length; j++) {
            const candidate: ScreenPositionCandidate = {
                originalIndex: j,
                screenPosition: [0, 0, 0],
                rank: 0,
                quadrant: 0,
                distance: 0,
                scaleFactor: 0,
                inViewSpace: false,
            };

            position = positions[j];
            const cameraPosition = viewport.cameraPosition as Vec3;
            distance = calcDistance(position, cameraPosition);
            scaleFactor = Math.max(
                0.25,
                Math.min(1, (1 / (2 * Math.tan(fovRad / 2) * distance)) * instance.organizer.getParams().distanceFactor)
            );

            const screenPosition = viewport.project(position) as Vec3;
            screenPosition[0] = (2.0 * screenPosition[0]) / viewport.width - 1.0;
            screenPosition[1] = 1.0 - (2.0 * screenPosition[1]) / viewport.height;

            isInViewSpace =
                screenPosition[2] >= 0 &&
                screenPosition[2] <= 1 &&
                screenPosition[0] >= viewportX[0] &&
                screenPosition[0] <= viewportX[1] &&
                screenPosition[1] >= viewportY[0] &&
                screenPosition[1] <= viewportY[1] &&
                (!instance.organizer.getParams().minDistance ||
                    distance >= instance.organizer.getParams().minDistance) &&
                (!instance.organizer.getParams().maxDistance || distance <= instance.organizer.getParams().maxDistance);

            candidate.screenPosition = screenPosition;
            candidate.distance = distance;
            candidate.scaleFactor = scaleFactor;
            candidate.inViewSpace = isInViewSpace;

            candidates.push(candidate);
        }

        instance.state.screenPositionCandidates = candidates;

        const minOneCandidateInViewSpace = candidates.filter((el) => el.inViewSpace).length > 0;

        if (instance.state.cooldown && instance.state.visible === false) {
            instance.state.cooldown = Math.max(0, instance.state.cooldown - deltaTime);
            instance.rank = 0;
        } else {
            // calculate heuristics
            for (let j = 0; j < candidates.length; j++) {
                const candidate = candidates[j];

                const hPositionPenalty = clamp(
                    (candidate.screenPosition[0] ** 2 + candidate.screenPosition[1] ** 2) / 2,
                    0,
                    1
                );
                const hDistancePenalty = candidate.distance / instance.organizer.getParams().maxDistance;
                candidate.rank = 1000;
                candidate.rank += instance.priority * 1000 - (hPositionPenalty * 100 + hDistancePenalty * 100);

                if (instance.state.visible) {
                    candidate.rank += 100;
                } else {
                    candidate.rank -= 100;
                }

                candidate.rank += instances.length - i;

                if (instance.state.boost) {
                    candidate.rank += 100000;
                }

                if (j === instance.state.screenPositionCandidatesLastIndex) {
                    candidate.rank += 1000;
                }

                if (candidate.inViewSpace && nInViewSpace < maxVisible && instance.annotation.direction) {
                    candidate.quadrant = getLabelQuadrant(
                        candidate.screenPosition,
                        position,
                        instance.annotation.direction,
                        viewport.project
                    );
                }
            }

            const lastCandidate =
                instance.state.screenPositionCandidates[instance.state.screenPositionCandidatesLastIndex];
            if (nInViewSpace < maxVisible && minOneCandidateInViewSpace) {
                nInViewSpace++;
                instance.state.prevQuadrant = instance.state.prevQuadrant;
                instance.state.quadrant = lastCandidate.quadrant;
            } else {
                instance.state.visible = false;
                instance.state.quadrant = 0;
                if (i >= maxVisible) {
                    instance.state.capped = true;
                }
            }

            instance.state.screenPosition = lastCandidate.screenPosition;
            instance.state.scaleFactor = lastCandidate.scaleFactor;
            instance.state.distance = lastCandidate.distance;

            /*
            instance.rank = 1000;
            instance.rank += instance.priority * 1000 - (hPositionPenalty * 100 + hDistancePenalty);

            if (instance.state.visible) {
                instance.rank += 100;
            } else {
                instance.rank -= 100;
            }

            if (isInViewSpace && nInViewSpace < maxVisible) {
                nInViewSpace++;
                instance.state.prevQuadrant = instance.state.quadrant;
                instance.state.quadrant = instance.annotation.direction
                    ? getLabelQuadrant(screenPosition, position, instance.annotation.direction, viewport.project)
                    : 0;
            } else {
                instance.state.quadrant = 0;
                instance.state.visible = false;
                if (i >= maxVisible) {
                    instance.state.capped = true;
                }
            }
            */
        }

        if (instance.state.boost) {
            instance.state.kill = false;
            instance.state.cooldown = 0;
            instance.state.visible = true;
            instance.rank += 100000;
            instance.state.positionSlot = 0;
            instance.state.boost = false;
        }

        if (minOneCandidateInViewSpace && !instance.state.capped) {
            inViewspace.push(instance);
        } else {
            if (instance.state._visibility !== "hidden") {
                instance.state.visible = false;
                instance.state._visibility = "hidden";
                instance.state._needsUpdate = true;
            }
        }
    });

    prevTime = Date.now();

    return inViewspace;
}

/**
 * OCCLUSION TEST
 */
export async function occlustionTestIntstances(
    candidates: { instance: AnnotationInstance; position: Vec3 }[],
    depthBuffer: Float32Array,
    depthBufferWidth: number,
    depthBufferHeight: number
) {
    candidates.forEach((candidate) => {
        const isOccluded = occlusionTest(candidate.position, depthBufferWidth, depthBufferHeight, depthBuffer);

        if (!candidate.instance.state.occluded && isOccluded) {
            candidate.instance.state.kill = true;
        }
        candidate.instance.state.occluded = isOccluded;
    });
}

let lastArr: string[] = [];

/**
 * POST PROCESS INSTANCES
 */
export function postProcessInstances(instances: AnnotationInstance[], size: Vec2, offset: Vec2) {
    nearTree.clear();
    distantTree.clear();

    const instanceCandidates: ({ instance: AnnotationInstance } & ScreenPositionCandidate)[] = [];
    for (let i = 0; i < instances.length; i++) {
        const instance = instances[i];
        const screenPositionCandidates = instance.state.screenPositionCandidates;
        for (let j = 0; j < screenPositionCandidates.length; j++) {
            instanceCandidates.push({ instance, ...screenPositionCandidates[j] });
        }
    }

    instanceCandidates.sort((a, b) => b.rank + b.instance.rank - (a.rank + a.instance.rank));

    const idArr = instanceCandidates.map((d) => d.instance.id);
    if (!isEqual(lastArr, idArr)) {
        lastArr = idArr;
    }

    const handledInstanceIds = new Set<string>();
    for (const instanceCandidate of instanceCandidates) {
        if (!instanceCandidate.inViewSpace) {
            continue;
        }

        const instance = instanceCandidate.instance;
        if (handledInstanceIds.has(instance.id)) {
            continue;
        }

        const prevLabelPosition: Vec2 | null = instance.state.labelPosition ? [...instance.state.labelPosition] : null;
        const prevAnchorPosition: Vec2 | null = instance.state.anchorPosition
            ? [...instance.state.anchorPosition]
            : null;

        const currentSlot = instance.state.positionSlot || 0;
        const element = instance.ref?.current;

        if (element) {
            instance.state.labelWidth = element.clientWidth;
            instance.state.labelHeight = element.clientHeight;
        }

        if (instance.state.kill || instance.state.occluded) {
            calculateLabelPosition(instance, currentSlot, size, offset);
            setTransition(instance, currentSlot, prevLabelPosition, prevAnchorPosition);
            handledInstanceIds.add(instance.id);
        } else if (!instance.state.cooldown) {
            const slots = currentSlot === 0 ? [0, 1] : [1, 0];

            // calculate label size
            const labelWidth = instance.state.labelWidth;
            const labelHeight = instance.state.labelHeight;

            const scaledWidth = labelWidth * instance.state.scaleFactor!;
            const scaledHeight = labelHeight * instance.state.scaleFactor!;

            let positionFound = false;
            for (let i = 0; i < slots.length; i++) {
                instance.state.screenPosition = instanceCandidate.screenPosition;
                instance.state.quadrant = instanceCandidate.quadrant;
                calculateLabelPosition(instance, slots[i], size, offset);

                // test for overlaps
                const rect = {
                    minX: instance.state.labelPosition![0] - collisionMargin,
                    minY: instance.state.labelPosition![1] - collisionMargin,
                    maxX: instance.state.labelPosition![0] + scaledWidth + collisionMargin2,
                    maxY: instance.state.labelPosition![1] + scaledHeight + collisionMargin2,
                };

                const collisionTree = instanceCandidate.scaleFactor! >= 0.5 ? nearTree : distantTree;

                if (!collisionTree.collides(rect)) {
                    collisionTree.insert(rect);
                    positionFound = true;
                    instance.state.screenPositionCandidatesLastIndex = instanceCandidate.originalIndex;
                    setTransition(instance, slots[i], prevLabelPosition, prevAnchorPosition);
                    instance.state.positionSlot = slots[i];
                    break;
                }
            }

            if (!positionFound) {
                instance.state.kill = true;
                instance.state.cooldown = 2.5;
            } else {
                instance.state.visible = true;
                instance.state.kill = false;
                instance.state.cooldown = 0;
                handledInstanceIds.add(instance.id);
            }
        } else {
            instance.state.visible = false;
            handledInstanceIds.add(instance.id);
        }

        if (instance.state.visible) {
            instance.state.zIndex = instance.state.labelHovered
                ? 1000000
                : instance.state.kill
                ? 0
                : Math.round((1 / instance.state.distance!) * 100000);
            instance.state.opacity = Math.max(0.75, instance.state.scaleFactor!) * instance.state.health;

            if (instance.state.inTransition && instance.state.prevLabelPosition) {
                [x, y] = mixVec2(
                    instance.state.prevLabelPosition,
                    instance.state.labelPosition!,
                    instance.state.transitionTime
                );
            } else {
                [x, y] = instance.state.labelPosition!;
            }

            instance.state.labelX = x - instance.state.scaledOffset![0];
            instance.state.labelY = y - instance.state.scaledOffset![1];

            if (element) {
                _transform = `translate(${instance.state.labelX}px,${instance.state.labelY}px) scale(${instance.state
                    .scaleFactor!})`;
                if (_transform !== instance.state._transform) {
                    instance.state._transform = _transform;
                    instance.state._needsUpdate = true;
                }
                _opacity = `${instance.state.opacity!}`;
                if (_opacity !== instance.state._opacity) {
                    instance.state._opacity = _opacity;
                    instance.state._needsUpdate = true;
                }
                _zIndex = `${instance.state.zIndex!}`;
                if (_zIndex !== instance.state._zIndex) {
                    instance.state._zIndex = _zIndex;
                    instance.state._needsUpdate = true;
                }
                if (instance.state._visibility !== "visible") {
                    instance.state._visibility = "visible";
                    instance.state._needsUpdate = true;
                }
            }
        } else if (instance.state._visibility !== "hidden") {
            instance.state._visibility = "hidden";
            instance.state._needsUpdate = true;
        }
    }
    /*
    instances.forEach((instance) => {
        const prevLabelPosition: Vec2 | null = instance.state.labelPosition ? [...instance.state.labelPosition] : null;
        const prevAnchorPosition: Vec2 | null = instance.state.anchorPosition
            ? [...instance.state.anchorPosition]
            : null;

        const currentSlot = instance.state.positionSlot || 0;
        const element = instance.ref?.current;

        if (element) {
            instance.state.labelWidth = element.clientWidth;
            instance.state.labelHeight = element.clientHeight;
        }

        if (instance.state.kill || instance.state.occluded) {
            calculateLabelPosition(instance, currentSlot, size, offset);
            setTransition(instance, currentSlot, prevLabelPosition, prevAnchorPosition);
        } else if (!instance.state.cooldown) {
            let positionFound = false;

            const slots = currentSlot === 0 ? [0, 1] : [1, 0];

            // calculate label size
            const labelWidth = instance.state.labelWidth;
            const labelHeight = instance.state.labelHeight;

            const scaledWidth = labelWidth * instance.state.scaleFactor!;
            const scaledHeight = labelHeight * instance.state.scaleFactor!;

            const sortedCandidates = instance.state.screenPositionCandidates.sort((a, b) => b.rank - a.rank);

            for (let i = 0; i < slots.length; i++) {
                for (let j = 0; j < sortedCandidates.length; j++) {
                    const candidate = sortedCandidates[j];
                    instance.state.screenPosition = candidate.screenPosition;
                    instance.state.quadrant = candidate.quadrant;
                    instance.state.prevQuadrant = candidate.quadrant;
                    calculateLabelPosition(instance, slots[i], size, offset);

                    // test for overlaps
                    const rect = {
                        minX: instance.state.labelPosition![0] - collisionMargin,
                        minY: instance.state.labelPosition![1] - collisionMargin,
                        maxX: instance.state.labelPosition![0] + scaledWidth + collisionMargin2,
                        maxY: instance.state.labelPosition![1] + scaledHeight + collisionMargin2,
                    };

                    const collisionTree = candidate.scaleFactor! >= 0.5 ? nearTree : distantTree;

                    if (!collisionTree.collides(rect)) {
                        collisionTree.insert(rect);
                        positionFound = true;
                        instance.state.screenPositionCandidatesLastIndex = candidate.originalIndex;
                        setTransition(instance, slots[i], prevLabelPosition, prevAnchorPosition);
                        instance.state.positionSlot = slots[i];
                        break;
                    }
                }
                if (positionFound) break;
            }

            if (!positionFound) {
                instance.state.kill = true;
                instance.state.cooldown = 2.5;
            } else {
                instance.state.visible = true;
            }
        } else {
            instance.state.visible = false;
        }

        if (instance.state.visible) {
            instance.state.zIndex = instance.state.labelHovered
                ? 1000000
                : instance.state.kill
                ? 0
                : Math.round((1 / instance.state.distance!) * 100000);
            instance.state.opacity = Math.max(0.75, instance.state.scaleFactor!) * instance.state.health;

            if (instance.state.inTransition && instance.state.prevLabelPosition) {
                [x, y] = mixVec2(
                    instance.state.prevLabelPosition,
                    instance.state.labelPosition!,
                    instance.state.transitionTime
                );
            } else {
                [x, y] = instance.state.labelPosition!;
            }

            instance.state.labelX = x - instance.state.scaledOffset![0];
            instance.state.labelY = y - instance.state.scaledOffset![1];

            if (element) {
                _transform = `translate(${instance.state.labelX}px,${instance.state.labelY}px) scale(${instance.state
                    .scaleFactor!})`;
                if (_transform !== instance.state._transform) {
                    instance.state._transform = _transform;
                    instance.state._needsUpdate = true;
                }
                _opacity = `${instance.state.opacity!}`;
                if (_opacity !== instance.state._opacity) {
                    instance.state._opacity = _opacity;
                    instance.state._needsUpdate = true;
                }
                _zIndex = `${instance.state.zIndex!}`;
                if (_zIndex !== instance.state._zIndex) {
                    instance.state._zIndex = _zIndex;
                    instance.state._needsUpdate = true;
                }
                if (instance.state._visibility !== "visible") {
                    instance.state._visibility = "visible";
                    instance.state._needsUpdate = true;
                }
            }
        } else if (instance.state._visibility !== "hidden") {
            instance.state._visibility = "hidden";
            instance.state._needsUpdate = true;
        }
    });
    */
}

export function updateInstanceDOMElements(instances: AnnotationInstance[]) {
    instances
        .filter((d) => d.state._needsUpdate)
        .forEach((instance) => {
            const element = instance.ref?.current;
            if (element) {
                if (instance.state._transform) element.style.transform = instance.state._transform;
                if (instance.state._opacity) element.style.opacity = instance.state._opacity;
                if (instance.state._zIndex) element.style.zIndex = instance.state._zIndex;
                if (instance.state._visibility) element.style.visibility = instance.state._visibility;
            }
        });
}
