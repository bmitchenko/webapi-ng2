import { ControllerDescriptor } from './controller-description';
import { Definition } from './definition';

export interface ApiDescription {
    controllers: ControllerDescriptor[];
    definitions?: Definition[];
}