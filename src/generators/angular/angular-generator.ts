import { GeneratorConfig } from '../../generator-config';

import {
    Attribute,
    AttributeParameter,
    Controller,
    EnumValue,
    Operation,
    OperationParameter,
    Property,
    Schema,
    SchemaType,
    Specification
} from '../../specification';

export class AngularGenerator {
    private _script: string;

    public generate(specification: Specification, config: GeneratorConfig): string {
        //         if (apiDescription.definitions != undefined) {
        //             this.mapDefinitions(apiDescription.definitions);
        //         }

        let script =
            this.getHeader() + '\n\r' +
            this.getImports() + '\n\r' +
            this.getOptions(config) + '\n\r' +
            this.getBaseClass(config) + '\n\r';

        for (let controller of specification.controllers) {
            script += '\n\r' + this.getController(controller, config);
        }

        if (specification.schema != undefined) {
            const enumTypes: Schema[] = [];

            for (let schemaName in specification.schema) {
                let schema = specification.schema[schemaName];
                script += '\n\r' + this.getSchema(schema);

                if (schema.type == SchemaType.Enumeration) {
                    enumTypes.push(schema);
                }
            }

            if (enumTypes.length > 0) {
                script += '\n\r' + this.getEnumService(enumTypes);
            }
        }

        return script;
    }

    private getHeader(): string {
        let result = `
            //
            // This file is autogenerated.
            // See http://github.com/bmitchenko/webapi-ng2 for details.
            //
            // tslint:disable:max-line-length
            `;

        return result;
    }

    private getImports(): string {
        let result = `
            import { Injectable } from '@angular/core';
            import { HttpClient, HttpParams, HttpEvent, HttpResponse, HttpErrorResponse, HttpRequest, HttpHeaders } from '@angular/common/http';
        `;

        return result;
    }

    private getOptions(config: GeneratorConfig): string {
        let result = `
            @Injectable()
            export class ` + config.outputClass + `Options {
                public basePath = '';
                public loginUrl: string;
                public dateSerialization: 'local' | 'utc' = 'utc';
            }`;

        return result;
    }

    private getEnumService(enumTypes: Schema[]): string {
        const enumMetadata: string[] = [];

        for (const enumType of enumTypes) {
            let displayName: string | undefined;

            if (enumType.attributes != undefined) {
                displayName = this.getDisplayName(enumType.attributes);
            }

            if (displayName == undefined) {
                displayName = enumType.name;
            }

            let values: string[] = [];

            if (enumType.values != undefined) {
                for (const enumValue of enumType.values) {
                    let valueDisplayName: string | undefined;

                    if (enumValue.attributes != undefined) {
                        valueDisplayName = this.getDisplayName(enumValue.attributes);
                    }

                    if (valueDisplayName == undefined) {
                        valueDisplayName = enumValue.name;
                    }

                    values.push(`{ value: ${enumType.name}.${enumValue.name}, displayName: '${valueDisplayName}' }`);
                }
            }

            enumMetadata.push(`
                {
                    type: ${enumType.name},
                    displayName: '${displayName}',
                    values: [
                        ${values.join(',\r')}
                    ]
                }`);
        }

        let result = `
            export interface EnumValue<T> {
                displayName: string;
                value: T;
            }
    
            interface EnumMetadata<T> {
                displayName: string;
                type: any;
                values: EnumValue<T>[];
            }

            export const ENUM_METADATA: EnumMetadata<any>[] = [
                ${enumMetadata.join(',')}
            ];

            @Injectable()
            export class EnumService {
                public getDisplayName(enumType: any): string {
                    const metadata = this.findEnum<any>(enumType);
                    
                    return metadata.displayName;
                }
        
                public getValueDisplayName(enumType: any, enumValue: number): string {
                    const metadata = this.findEnum<any>(enumType);

                    const exactValue = metadata.values.find(x => x.value === enumValue);
            
                    if (exactValue != undefined) {
                        return exactValue.displayName;
                    }
            
                    const result = metadata.values
                        // tslint:disable-next-line:no-bitwise
                        .filter(x => x.value !== 0 && (x.value & enumValue) === x.value)
                        .map(x => x.displayName);
            
                    return result.join(', ');
                }
        
                public getValues<T>(enumType: any): EnumValue<T>[] {
                    const metadata = this.findEnum<any>(enumType);
                    
                    return metadata.values;
                }
        
                private findEnum<T>(enumType: any): EnumMetadata<T> {
                    const metadata = ENUM_METADATA.find(x => x.type === enumType);
        
                    if (metadata == undefined) {
                        throw Error('Metadata for enum type not found.');
                    }
        
                    return metadata;
                }            
            }`;

        return result;
    }

    private getDisplayName(attributes: Attribute[]): string | undefined {
        const displayAttribute = attributes.find(x => x.name == 'DisplayName');

        if (displayAttribute != undefined) {
            if (displayAttribute.parameters != undefined) {
                const nameParameter = displayAttribute.parameters.find(x => x.name == 'displayName');

                if (nameParameter != undefined) {
                    return nameParameter.value;
                }
            }
        }

        return undefined;
    }

    private getBaseClass(config: GeneratorConfig): string {
        let returnType = config.usePromises ? 'Promise<T>' : 'Observable<T>';
        let toPromise = config.usePromises ? '.toPromise()' : '';

        let result = `
            @Injectable()
            export abstract class ` + config.outputClass + `Base {
                private dateFormat = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*/;

                constructor(public http: HttpClient, public options: ` + config.outputClass + `Options) {
                    this.reviver = this.reviver.bind(this);
                }

                protected request<T>(path: string, method: string, urlParams?: any, body?: any): Promise<T> {
                    let url = path;
                    let params = new HttpParams();
            
                    if (urlParams !== undefined) {
                        Object.getOwnPropertyNames(urlParams).forEach((paramName) => {
                            if (url.indexOf(` + "`{${paramName}}`" + `) !== -1) {
                                url = url.replace(` + "`{${paramName}}`" + `, urlParams[paramName]);
                            } else {
                                params = this.addSearchParam(params, paramName, urlParams[paramName]);
                            }
                        });
                    }

                    body = this.serializeBody(body);
            
                    const request = new HttpRequest<any>(method, this.options.basePath + url, body, {
                        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
                        params: params,
                        responseType: 'text'
                    });
            
                    const promise = new Promise<any>((resolve, reject) => {
                        this.http.request(request).subscribe((event: HttpEvent<any>) => {
                            if (event instanceof HttpResponse) {
                                resolve(this.extractBody(event));
                            }
                        }, (error: HttpErrorResponse | Error) => {
                            if (error instanceof Error) {
                                reject(error);
                            } else {
                                reject(this.extractError(error));
                            }
                        });
                    });
            
                    return promise;
                }

                private extractBody(response: HttpResponse<any>): any {
                    let body = response.body;
            
                    if (typeof body === 'string') {
                        if (this.isJsonResponse(response)) {
                            try {
                                body = this.parseJson(body);
                            } catch (e) {
                            }
                        }
                    }
            
                    return body;
                }
            
                private extractError(response: HttpErrorResponse): Error {
                    let error: Error;

                    if (response.error instanceof Error) {
                        error = response.error;
                    } else {
                        if (this.isJsonResponse(response)) {
                            let body = response.error;
            
                            if (typeof body === 'string') {
                                body = this.parseJson(body);
                            }
            
                            error = new Error(body.message);
            
                            if ('errorCode' in body) {
                                error['errorCode'] = body.errorCode;
                            }
            
                            if ('validationErrors' in body) {
                                error['validationErrors'] = body.validationErrors;
                            }
                        } else {
                            error = new Error(response.error);
                        }
                    }
            
                    error['httpStatusCode'] = response.status;
            
                    return error;
                }

                private serializeBody(body?: any) {
                    if (body == undefined) {
                        return body;
                    }
            
                    if (typeof body !== 'object') {
                        return body;
                    }
            
                    return JSON.stringify(body, (key, value) => {
                        if (typeof value === 'string' && this.dateFormat.test(value)) {
                            return this.serializeDate(new Date(value));
                        }
            
                        return value;
                    });
                }
    
                private serializeDate(d: Date): string {
                    let result: string;
            
                    const n = x => x < 10 ? '0' + x.toString() : x.toString();
            
                    if (this.options.dateSerialization === 'local') {
                        result =
                            n(d.getMonth() + 1) + '/' +
                            n(d.getDate()) + '/' +
                            d.getFullYear() + ' ' +
                            n(d.getHours()) + ':' +
                            n(d.getMinutes()) + ':' +
                            n(d.getSeconds());
                    } else {
                        result = d.toJSON();
                    }
            
                    return result;
                }                

                private isJsonResponse(response: HttpResponse<any> | HttpErrorResponse): boolean {
                    const contentType = response.headers.get('content-type');
            
                    if (contentType && contentType.indexOf('application/json') !== -1) {
                        return true;
                    }
            
                    return false;
                }
            
                private parseJson(text: string): any {
                    return JSON.parse(text, this.reviver);
                }
            
                private reviver(key: any, value: any) {
                    if (typeof value === 'string' && this.dateFormat.test(value)) {
                        return this.parseDate(value);
                    }
            
                    return value;
                }
            
                private parseDate(s: string): Date {
                    const a = s.split(/[^0-9]/) as any;
                    const d = new Date(a[0], a[1] - 1, a[2], a[3], a[4], a[5]);
                    return d;
                }
            
                private addSearchParam(params: HttpParams, name: string, value: any): HttpParams {
                    if (value instanceof Array) {
                        value.forEach((v, i) => {
                            params = this.addSearchParam(params, ` + "`${name}[${i}]`" + `, v);
                        });
                    } else {
                        if (value instanceof Date) {
                            params = params.append(name, value.toUTCString());
                        } else {
                            if (value instanceof Object) {
                                Object.getOwnPropertyNames(value).forEach((propertyName) => {
                                    params = this.addSearchParam(params, ` + "`${name}.${propertyName}`" + `, value[propertyName]);
                                });
                            } else {
                                if (value != undefined) {
                                    params = params.append(name, value);
                                }
                            }
                        }
                    }
            
                    return params;
                }
            }`;

        return result;
    }

    private getController(controller: Controller, config: GeneratorConfig): string {
        let operations: string[] = [];

        if (controller.operations != undefined) {
            for (let operation of controller.operations) {
                operations.push(this.getOperation(operation, config));
            }
        }

        let className = controller.name;

        if (!className.endsWith('Service')) {
            const suffix = config.suffix == undefined ? 'Service' : config.suffix;
            className += suffix;
        }

        let result = `
            @Injectable()
            export class ${className} extends ` + config.outputClass + `Base {
                ${operations.join('')}
            }`;

        return result;
    }

    private getOperation(operation: Operation, config: GeneratorConfig): string {
        let path = operation.path;
        let method = operation.method;
        let urlParams = '';
        let bodyParam: string | undefined = undefined;

        let name = this.camelCase(operation.name);
        let returnTypeArgument = this.mapType(operation.responseType);
        let returnType = config.usePromises ? `Promise<${returnTypeArgument}>` : `Observable<${returnTypeArgument}>`;
        let parameters: string[] = [];

        if (operation.parameters != undefined) {
            for (let parameter of operation.parameters) {
                let source = parameter.in.toLowerCase();

                if (source == 'body') {
                    bodyParam = parameter.name;
                }

                if (source == 'query' || source == 'path') {
                    if (urlParams.length > 0) {
                        urlParams += ', ';
                    }

                    urlParams += `${parameter.name}: ${parameter.name}`;
                }

                parameters.push(this.getOperationParameter(parameter));
            }
        }

        let requestParameters = `'${path}', '${method}'`;

        if (urlParams.length > 0 || bodyParam != undefined) {
            requestParameters += `, { ${urlParams} }`;
        }

        if (bodyParam != undefined) {
            requestParameters += `, ${bodyParam}`;
        }

        let operationMethod = `
            public ${name}(${parameters.join()}): ${returnType} {
                return this.request<${returnTypeArgument}>(${requestParameters});
            }
        `;

        if (operation.summary) {
            operationMethod = `/** ${operation.summary} */ ${operationMethod}`;
        }

        return operationMethod;
    }

    private getOperationParameter(operationParameter: OperationParameter): string {
        let parameter = operationParameter.name;

        if (!operationParameter.required && operationParameter.default == undefined) {
            parameter += '?';
        }

        let parameterType = this.mapType(operationParameter.type);

        parameter += `: ${parameterType}`;

        if (!operationParameter.required) {
            let defaultValue = operationParameter.default;

            if (defaultValue != undefined) {
                if (parameterType == 'string') {
                    defaultValue = `'${defaultValue}'`;
                }

                parameter += ` = ${defaultValue}`;
            }
        }

        return parameter;
    }

    private getSchema(schema: Schema): string {
        if (schema.type === SchemaType.Enumeration) {
            return this.getEnum(schema);
        }

        return this.getInterface(schema);
    }

    private getEnum(schema: Schema): string {
        let values: string[] = [];

        if (schema.values != undefined) {
            for (let enumValue of schema.values) {
                if (enumValue.value != undefined) {
                    values.push(`${enumValue.name} = ${enumValue.value}`);
                } else {
                    values.push(enumValue.name);
                }
            }
        }

        let result = `
            export enum ${schema.name} {
                ${values.join(', \n')}
            }`;

        return result;
    }

    private getInterface(schema: Schema): string {
        let base = '';
        let properties: string[] = [];

        if (schema.extends != undefined) {
            base = `extends ${schema.extends.map(x => this.mapType(x)).join(', ')}`;
        }

        if (schema.properties != undefined) {
            for (let property of schema.properties) {
                let propertyName = this.camelCase(property.name);
                let propertyType = this.mapType(property.type);

                if (property.nullable) {
                    propertyName += '?';
                }

                properties.push(`${propertyName}: ${propertyType};`);
            }
        }

        let result = `
            export interface ${schema.name} ${base} {
                ${properties.join('\n')}
            }`;

        return result;
    }

    private mapType(coreType: string): string {
        // collection;

        if (coreType.endsWith('[]')) {
            let collectionType = this.mapType(coreType.substr(0, coreType.length - 2));
            return `${collectionType}[]`;
        }

        // generic type;

        if (coreType.endsWith('>')) {
            let genericType = this.parseGenericType(coreType);
            let genericArguments = genericType.arguments
                .map(x => this.mapType(x))
                .join(', ');

            return `${genericType.name}<${genericArguments}>`;
        }

        // primitive;

        switch (coreType.toLowerCase()) {
            case 'guid':
            case 'string':
                return 'string';

            case 'datetime':
                return 'Date';

            case 'bool':
            case 'boolean':
                return 'boolean';

            case 'byte':
            case 'short':
            case 'int':
            case 'integer':
            case 'int16':
            case 'int32':
            case 'int64':
            case 'float':
            case 'decimal':
            case 'double':
            case 'single':
                return 'number';

            case 'void':
                return 'void';

            case 'object':
                return 'any';

            default:
                break;
        }

        // interface;

        return coreType;
    }

    private parseGenericType(typeName: string): { name: string, arguments: string[] } {
        let open = typeName.indexOf('<');
        let genericName = typeName.substr(0, open);
        let genericArguments: string[] = [];
        let splitters
        let level = 0;
        let buf = '';

        for (let i = open + 1; i < typeName.length - 1; i++) {
            let c = typeName[i];

            if (c == '<') {
                level++;
            } else if (c == '>') {
                level--;
            } else if (c == ',' && level == 0) {
                genericArguments.push(buf.trim());
                buf = '';
            }

            if (c != ',' || level > 0) {
                buf += c;
            }
        }

        genericArguments.push(buf.trim());

        return { arguments: genericArguments, name: genericName };
    }

    private camelCase(text: string): string {
        return text.substr(0, 1).toLowerCase() + text.substr(1);
    }
}




//     private getApi(apiDescription: ApiDescription, config: GeneratorConfig): string {
//         let fields: string[] = [];
//         let properties: string[] = [];

//         if (apiDescription.controllers != undefined) {
//             apiDescription.controllers.forEach((controller) => {
//                 var className = controller.name + 'Controller'; 
//                 var fieldName = '_' + this.camelCase(controller.name);

//                 fields.push(`private ${fieldName}: ${className};`);

//                 var property = `public get ${this.camelCase(controller.name)}(): ${className} {
//                         if (this.${fieldName} == undefined) {
//                             this.${fieldName} = new ${className}(this._connection);
//                         }

//                         return this.${fieldName};
//                     }`;

//                 properties.push(property);
//             });
//         }

//         return `
//             @Injectable()
//             export class ${config.outputClass} {
//                 private _connection: ApiConnection;
//                 ${fields.join('\n')}

//                 constructor (http: Http) {
//                     this._connection = new ApiConnection(http, '');
//                 }

//                 public get basePath(): string {
//                     return this._connection.basePath;
//                 }

//                 public set basePath(basePath: string) {
//                     this._connection.basePath = basePath;
//                 }

//                 ${properties.join('\n')}
//             }`;
//     }
