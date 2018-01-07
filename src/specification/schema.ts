import { Attribute } from './attribute';
import { EnumValue } from './enum-value';
import { Property } from './property';
import { SchemaType } from './schema-type';

export interface Schema {
    attributes?: Attribute[];
    extends?: string[]
    name: string;
    properties?: Property[];
    type: SchemaType;
    values?: EnumValue[];
}
