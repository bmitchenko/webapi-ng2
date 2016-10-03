import { DefinitionAttribute } from './definition-attribute';

export interface DefinitionValue {
    attributes?: DefinitionAttribute[];
    name: string;
    value: number;
}