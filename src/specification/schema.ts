import { EnumValue } from './enum-value';
import { Property } from './property';
import { SchemaType } from './schema-type';

export interface Schema {
    extends?: string[]
    name: string;
    properties?: Property[];
    type: SchemaType;
    values?: EnumValue[];
}
