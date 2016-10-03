import { ActionParameterDescription } from './action-parameter-description';

export interface ActionDescription {
    name: string;
    route: string;
    method: string;
    parameters?: ActionParameterDescription[];
    responseType?: string;
}