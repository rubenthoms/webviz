/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Observations } from '../models/Observations';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ObservationsService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get Observations
     * Retrieve all observations found in sumo case
     * @param caseUuid Sumo case uuid
     * @param ensembleName Ensemble name
     * @returns Observations Successful Response
     * @throws ApiError
     */
    public getObservations(
        caseUuid: string,
        ensembleName: string,
    ): CancelablePromise<Observations> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/observations/observations/',
            query: {
                'case_uuid': caseUuid,
                'ensemble_name': ensembleName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
