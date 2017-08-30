import { Attribute } from './attribute';

export interface Property {
    attributes?: Attribute[];
    name: string;
    nullable?: boolean;
    type: string;
}

