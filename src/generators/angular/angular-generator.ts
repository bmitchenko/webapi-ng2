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
            for (let schemaName in specification.schema) {
                let schema = specification.schema[schemaName];
                script += '\n\r' + this.getSchema(schema);
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
        `;

        return result;
    }

    private getImports(): string {
        let result = `
            import { Injectable } from '@angular/core';
            import { Http, ResponseContentType, URLSearchParams } from '@angular/http';
            import { Observable } from 'rxjs/Observable';
            import 'rxjs/add/operator/catch';
            import 'rxjs/add/operator/map';
            import 'rxjs/add/operator/toPromise';
        `;

        return result;
    }

    private getOptions(config: GeneratorConfig): string {
        let result = `
            @Injectable()
            export class ` + config.outputClass + `Options {
                public basePath = '';
                public loginUrl: string;
            }`;

        return result;
    }

    private getBaseClass(config: GeneratorConfig): string {
        let returnType = config.usePromises ? 'Promise<T>' : 'Observable<T>';
        let toPromise = config.usePromises ? '.toPromise()' : '';

        let result = `
            @Injectable()
            export abstract class ` + config.outputClass + `Base {
                private dateFormat = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*/;

                constructor(public http: Http, public options: ` + config.outputClass + `Options) {
                    this.reviver = this.reviver.bind(this);
                }

                protected request<T>(path: string, method: string, urlParams?: any, body?: any): ` + returnType + ` {
                    let url = path;
                    const search = new URLSearchParams();

                    if (urlParams !== undefined) {
                        Object.getOwnPropertyNames(urlParams).forEach((paramName) => {
                            if (url.indexOf(` + "`{${paramName}}`" + `) !== -1) {
                                url = url.replace(` + "`{${paramName}}`" + `, urlParams[paramName]);
                            } else {
                                this.addSearchParam(search, paramName, urlParams[paramName]);
                            }
                        });
                    }

                    const request = this.http.request(this.options.basePath + url, {
                        body: body,
                        method: method,
                        search: search
                    });

                    return request
                        .map(x => {
                            if (this.isJsonResponse(x)) {
                                return this.parseJson(x.text());
                            }

                            const text = x.text();

                            if (text) {
                                return text;
                            }

                            return undefined;
                        })
                        .catch(x => {
                            if (this.isJsonResponse(x)) {
                                throw this.parseJson(x.text()).message;
                            }

                            throw x.text() || x.statusText;
                        })
                        ` + toPromise + `;
                }

                private isJsonResponse(response: any): boolean {
                    const contentType = response.headers.get('content-type');

                    if (contentType && contentType.indexOf('application/json') !== -1) {
                        return true;
                    }

                    return false;
                }

                private parseJson(text: string): any {
                    return JSON.parse(text, this.reviver);
                }

                private reviver(key, value) {
                    if (typeof value === 'string' && this.dateFormat.test(value)) {
                        return new Date(value);
                    }

                    return value;
                }

                private addSearchParam(search: URLSearchParams, name: string, value: any): void {
                    if (value instanceof Array) {
                        value.forEach((v, i) => {
                            this.addSearchParam(search, ` + "`${name}[${i}]`" + `, v);
                        });
                    } else {
                        if (value instanceof Date) {
                            search.append(name, value.toUTCString());
                        } else {
                            if (value instanceof Object) {
                                Object.getOwnPropertyNames(value).forEach((propertyName) => {
                                    this.addSearchParam(search, ` + "`${name}.${propertyName}`" + `, value[propertyName]);
                                });
                            } else {
                                search.append(name, value);
                            }
                        }
                    }
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
            className += 'Service';
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
            // tslint:disable-next-line:max-line-length
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

