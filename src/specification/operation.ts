import { OperationParameter } from './operation-parameter';

export interface Operation {
    method: string;
    name: string;
    parameters?: OperationParameter[];
    responseType: string;
    path: string;
    summary?: string;
}
