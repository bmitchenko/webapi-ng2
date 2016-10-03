import { ActionDescription } from './action-description';

export interface ControllerDescriptor {
    actions: ActionDescription[];
    name: string;
}