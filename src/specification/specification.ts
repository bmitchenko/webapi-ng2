import { Controller } from './controller';
import { Schema } from './schema';

export interface Specification {
    controllers: Controller[];
    schema?: Schema[];
}
