import { DefinitionAttribute } from './definition-attribute';

export interface DefinitionProperty {
    attributes?: DefinitionAttribute[];
    name: string;
    isNullable?: boolean;
    type: string;
}