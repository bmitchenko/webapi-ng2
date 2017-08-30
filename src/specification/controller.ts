import { Operation } from './operation';

export interface Controller {
    operations: Operation[];
    name: string;
}

