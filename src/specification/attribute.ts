import { AttributeParameter } from './attribute-parameter';

export interface Attribute {
    name: string;
    parameters?: AttributeParameter[];
}