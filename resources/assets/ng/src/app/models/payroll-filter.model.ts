import { Moment } from '@app/shared/moment-extensions';

export interface PayrollFilter {
    activeFilters:PayrollFilterType[]
    startDate:Date|Moment|string,
    endDate:Date|Moment|string,
    agentId?:number,
    weekEnding?:Date|Moment|string,
    isAutomated?:boolean,
    isReleased?:boolean,
    automatedRelease?:Date|Moment|string
    clientId?:number
}

export enum PayrollFilterType {
    startDate,
    endDate,
    agent,
    client,
    weekEnding,
    isAutomated,
    isReleased,
    automatedRelease
}