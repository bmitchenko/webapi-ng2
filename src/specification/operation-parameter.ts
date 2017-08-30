export interface OperationParameter {
    name: string;
    in: 'query' | 'form' | 'body' | 'path' | 'header';
    required: boolean;
    default?: any;
    type: string;
}
