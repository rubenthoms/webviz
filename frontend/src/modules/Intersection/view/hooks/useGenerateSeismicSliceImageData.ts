import React from "react";

import { generateSeismicSliceImage } from "@equinor/esv-intersection";
import { SeismicSliceImageData, SeismicSliceImageOptions } from "@modules/Intersection/typesAndEnums";

import { isEqual } from "lodash";

export enum SeismicSliceImageStatus {
    SUCCESS = "success",
    LOADING = "loading",
    ERROR = "error",
}

/**
 * Hook to generate seismic slice image for async utility.
 *
 * Returns image, synched image options used to generate the image, and image status.
 */
export function useGenerateSeismicSliceImageData(options: SeismicSliceImageOptions | null): {
    imageData: SeismicSliceImageData | null;
    status: SeismicSliceImageStatus;
} {
    const [prevData, setPrevData] = React.useState<any>(null);
    const [image, setImage] = React.useState<ImageBitmap | null>(null);
    const [imageStatus, setImageStatus] = React.useState<SeismicSliceImageStatus>(SeismicSliceImageStatus.SUCCESS);

    if (options !== null && !isEqual(options, prevData)) {
        console.debug(options.trajectory[0], options.trajectory[options.trajectory.length - 1]);
        setPrevData(options);
        setImageStatus(SeismicSliceImageStatus.LOADING);

        const colormap = options.colorScale.getColorPalette().getColors();

        // Async generation of seismic slice image
        generateSeismicSliceImage({ ...options }, options.trajectory, colormap, {
            isLeftToRight: true,
        })
            .then((result) => {
                setImage(result ?? null);
                setImageStatus(SeismicSliceImageStatus.SUCCESS);
            })
            .catch(() => {
                setImage(null);
                setImageStatus(SeismicSliceImageStatus.ERROR);
            });
    }

    if (imageStatus === SeismicSliceImageStatus.LOADING) {
        return { imageData: null, status: imageStatus };
    }

    return { imageData: options ? { ...options, image } : null, status: imageStatus };
}
