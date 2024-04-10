/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WellboreHeader } from '../models/WellboreHeader';
import type { WellborePicksAndStratigraphicUnits } from '../models/WellborePicksAndStratigraphicUnits';
import type { WellboreTrajectory } from '../models/WellboreTrajectory';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class WellService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Drilled Wellbore Headers
     * Get wellbore headers for all wells in the field
     * @param caseUuid Sumo case uuid
     * @returns WellboreHeader Successful Response
     * @throws ApiError
     */
    public getDrilledWellboreHeaders(
        caseUuid: string,
    ): CancelablePromise<Array<WellboreHeader>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/drilled_wellbore_headers/',
            query: {
                'case_uuid': caseUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Field Well Trajectories
     * Get well trajectories for field
     * @param caseUuid Sumo case uuid
     * @param uniqueWellboreIdentifiers Optional subset of well names
     * @returns WellboreTrajectory Successful Response
     * @throws ApiError
     */
    public getFieldWellTrajectories(
        caseUuid: string,
        uniqueWellboreIdentifiers?: Array<string>,
    ): CancelablePromise<Array<WellboreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/field_well_trajectories/',
            query: {
                'case_uuid': caseUuid,
                'unique_wellbore_identifiers': uniqueWellboreIdentifiers,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Well Trajectories
     * Get well trajectories
     * @param wellboreUuids Wellbore uuids
     * @returns WellboreTrajectory Successful Response
     * @throws ApiError
     */
    public getWellTrajectories(
        wellboreUuids: Array<string>,
    ): CancelablePromise<Array<WellboreTrajectory>> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/well_trajectories/',
            query: {
                'wellbore_uuids': wellboreUuids,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Wellbore Picks And Stratigraphic Units
     * Get well bore picks for a single well bore
     * @param caseUuid Sumo case uuid
     * @param wellboreUuid Wellbore uuid
     * @returns WellborePicksAndStratigraphicUnits Successful Response
     * @throws ApiError
     */
    public getWellborePicksAndStratigraphicUnits(
        caseUuid: string,
        wellboreUuid: string,
    ): CancelablePromise<WellborePicksAndStratigraphicUnits> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/well/wellbore_picks_and_stratigraphic_units/',
            query: {
                'case_uuid': caseUuid,
                'wellbore_uuid': wellboreUuid,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
