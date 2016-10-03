import { ParameterSource } from './parameter-source';

export interface ActionParameterDescription {
    name: string;
    source: ParameterSource;
    isRequired: boolean;
    defaultValue?: any;
    type: string;
}