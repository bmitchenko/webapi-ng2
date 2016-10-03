import { DefinitionAttributeParameter } from './definition-attribute-parameter';

export interface DefinitionAttribute {
    name: string;
    parameters?: DefinitionAttributeParameter[];
}