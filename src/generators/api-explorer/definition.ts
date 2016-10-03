import { DefinitionProperty } from './definition-property';
import { DefinitionType } from './definition-type';
import { DefinitionValue } from './definition-value';

export interface Definition {
    extends?: string[]
    name: string;
    properties?: DefinitionProperty[];
    type: DefinitionType;
    values?: DefinitionValue[];
}