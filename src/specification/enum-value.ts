import { Attribute } from './attribute';

export interface EnumValue {
    attributes?: Attribute[];
    name: string;
    value: number;
}

