from typing import List

from primary.services.smda_access.types import WellboreTrajectory, WellboreHeader


def reduce_child_wellbore_trajectories(
    wellbore_headers: List[WellboreHeader], wellbore_trajectories: List[WellboreTrajectory]
) -> List[WellboreTrajectory]:
    """
    Reduce the child wellbore trajectories to the parent wellbore trajectory by removing all common
    points from the child wellbore trajectory.

    Args:
        wellbore_headers: List of well headers
        wellbore_trajectories: List of wellbore trajectories

    Returns:
        List of reduced wellbore trajectories
    """
    adjusted_wellbore_trajectories: List[WellboreTrajectory] = []

    for wellbore_header in wellbore_headers:
        trajectory = [x for x in wellbore_trajectories if x.wellbore_uuid == wellbore_header.wellbore_uuid][0]
        parent_wellbore = wellbore_header.parent_wellbore
        kickoff_md = wellbore_header.kickoff_depth_md

        if parent_wellbore is None:
            adjusted_wellbore_trajectories.append(trajectory)
            continue

        # Reduce child wellbore trajectory length
        adjusted_trajectory = WellboreTrajectory(
            wellbore_uuid=trajectory.wellbore_uuid,
            unique_wellbore_identifier=trajectory.unique_wellbore_identifier,
            tvd_msl_arr=[],
            md_arr=[],
            easting_arr=[],
            northing_arr=[],
        )
        for i, md in enumerate(trajectory.md_arr):
            if md < kickoff_md:
                continue

            if md != kickoff_md:
                factor = (trajectory.md_arr[i] - kickoff_md) / (trajectory.md_arr[i] - trajectory.md_arr[i - 1])
                adjusted_trajectory.md_arr.append(kickoff_md)
                adjusted_trajectory.tvd_msl_arr.append(
                    trajectory.tvd_msl_arr[i - 1] + factor * (trajectory.tvd_msl_arr[i] - trajectory.tvd_msl_arr[i - 1])
                )
                adjusted_trajectory.easting_arr.append(
                    trajectory.easting_arr[i - 1] + factor * (trajectory.easting_arr[i] - trajectory.easting_arr[i - 1])
                )
                adjusted_trajectory.northing_arr.append(
                    trajectory.northing_arr[i - 1]
                    + factor * (trajectory.northing_arr[i] - trajectory.northing_arr[i - 1])
                )

            adjusted_trajectory.tvd_msl_arr.extend(trajectory.tvd_msl_arr[i:-1])
            # What is the convention here? Should we keep the original md or adjust it by kickoff depth?
            adjusted_trajectory.md_arr.extend(trajectory.md_arr[i:-1])
            adjusted_trajectory.easting_arr.extend(trajectory.easting_arr[i:-1])
            adjusted_trajectory.northing_arr.extend(trajectory.northing_arr[i:-1])
            break

        adjusted_wellbore_trajectories.append(adjusted_trajectory)

    return adjusted_wellbore_trajectories
