import { ActionDescription } from './action-description';
import { ActionParameterDescription } from './action-parameter-description';
import { ApiDescription } from './api-description';
import { ControllerDescriptor } from './controller-description';
import { Definition } from './definition';
import { DefinitionAttribute } from './definition-attribute';
import { DefinitionAttributeParameter } from './definition-attribute-parameter';
import { DefinitionProperty } from './definition-property';
import { DefinitionType } from './definition-type';
import { DefinitionValue } from './definition-value';
import { GeneratorConfig } from '../../generator-config';
import { ParameterSource } from './parameter-source';

export class ApiExplorerGenerator {
    private _definitions: { [name: string]: string } = {};

    public generate(apiDescription: ApiDescription, config: GeneratorConfig): string {
        if (apiDescription.definitions != undefined) {
            this.mapDefinitions(apiDescription.definitions);
        }

        let script =
            this.getImports(config) + '\n\r' +
            this.getApi(apiDescription, config) + '\n\r' +
            this.getApiConnection(apiDescription, config) + '\n\r' +
            this.getControllers(apiDescription, config) + '\n\r' +
            this.getModels(apiDescription) + '\n\r' +
            this.getEnums(apiDescription);

        return script;
    }

    private mapDefinitions(definition: Definition[]): void {
        var map = new Map<string, Definition>();

        definition.forEach((type) => {
            map.set(type.name, type);
        });

        definition.forEach((type) => {
            this.mapDefinition(type, map);
        });

        this._definitions['void'] = 'void';
    }

    private mapDefinition(definition: Definition, definitionMap: Map<string, Definition>): string {
        var mappedType = (this._definitions[definition.name]);

        if (mappedType != undefined) {
            return mappedType;
        }

        switch (definition.type) {
            case DefinitionType.Class: mappedType = this.mapObject(definition, definitionMap); break;
            case DefinitionType.Collection: mappedType = this.mapCollection(definition, definitionMap); break;
            case DefinitionType.Enum: mappedType = this.mapEnum(definition, definitionMap); break;
            case DefinitionType.Interface: mappedType = this.mapObject(definition, definitionMap); break;
            case DefinitionType.Primitive: mappedType = this.mapPrimitive(definition, definitionMap); break;
            default: break;
        }

        if (mappedType == undefined) {
            throw new Error(`Cannot map type ${definition.name}.`);
        }

        this._definitions[definition.name] = mappedType;

        return mappedType;
    }

    private mapCollection(definition: Definition, definitionMap: Map<string, Definition>): string {
        let collectionTypeName = definition.name.substr(0, definition.name.length - 2);

        if (!definitionMap.has(collectionTypeName)) {
            throw new Error(`Type ${collectionTypeName} not found.`);
        }

        let collectionType = this.mapDefinition(definitionMap.get(collectionTypeName), definitionMap);

        return `Array<${collectionType}>`;
    }

    private mapEnum(definition: Definition, definitionMap: Map<string, Definition>): string {
        return definition.name;
    }

    private mapPrimitive(definition: Definition, definitionMap: Map<string, Definition>): string {
        switch (definition.name.toLowerCase()) {
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
            case 'int16':
            case 'int32':
            case 'int64':
            case 'float':
            case 'decimal':
            case 'double':
                return 'number';

            case 'void':
                return 'void';

            case 'object':
                return 'any';

            default:
                throw new Error(`Type not found ${definition.name}.`);
        }
    }

    private mapObject(definition: Definition, definitionMap: Map<string, Definition>): string {
        let name = definition.name;

        if (name.indexOf('<') == -1) {
            return name;
        }

        let genericArguments = name
            .split('<')[1]
            .replace('>', '')
            .split(',')
            .map(x => x.trim());

        if (!genericArguments.some(a => definitionMap.has(a))) {
            return name;
        }

        let genericTypes: Definition[] = [];

        genericArguments.forEach((argument) => {
            if (!definitionMap.has(argument)) {
                throw new Error(`Type ${argument} not found.`);
            }

            genericTypes.push(definitionMap.get(argument));
        });

        let genericParameters = genericTypes
            .map(x => this.mapDefinition(x, definitionMap))
            .join(', ');

        name = name
            .split('<')[0];

        return `${name}<${genericParameters}>`;
    }

    private getImports(config: GeneratorConfig): string {
        let imports = `
            // 
            // This file is autogenerated. 
            // See http://github.com/bmitchenko/webapp-ng2 for details. 
            //

            import { Injectable } from '@angular/core';
            import { Http, ResponseContentType, URLSearchParams } from '@angular/http';
            import { Observable } from 'rxjs';
        `;

        return imports;
    }

    private getApi(apiDescription: ApiDescription, config: GeneratorConfig): string {
        let fields: string[] = [];
        let properties: string[] = [];

        if (apiDescription.controllers != undefined) {
            apiDescription.controllers.forEach((controller) => {
                var className = controller.name + 'Controller'; 
                var fieldName = '_' + this.camelCase(controller.name);

                fields.push(`private ${fieldName}: ${className};`);

                var property = `public get ${this.camelCase(controller.name)}(): ${className} {
                        if (this.${fieldName} == undefined) {
                            this.${fieldName} = new ${className}(this._connection);
                        }

                        return this.${fieldName};
                    }`;

                properties.push(property);
            });
        }

        return `
            @Injectable()
            export class ${config.outputClass} {
                private _connection: ApiConnection;
                ${fields.join('\n')}

                constructor (http: Http) {
                    this._connection = new ApiConnection(http, '');
                }
                
                public get basePath(): string {
                    return this._connection.basePath;
                }

                public set basePath(basePath: string) {
                    this._connection.basePath = basePath;
                }
                
                ${properties.join('\n')}
            }`;
    }

    private getApiConnection(apiDescription: ApiDescription, config: GeneratorConfig): string {
        let returnType = config.usePromises ? 'Promise<T>' : 'Observable<T>';
        let toPromise = config.usePromises ? '.toPromise()' : '';

        return `
            export class ApiConnection {
                constructor(public http: Http, public basePath: string) {
                }

                public request<T>(pattern: string, method: string, routeParams?: any, body?: any): ` + returnType + ` {
                    let url = pattern;
                    let search = new URLSearchParams();

                    if (routeParams != undefined) {
                        Object.getOwnPropertyNames(routeParams).forEach((paramName) => {
                            if (url.indexOf(` + "`{${paramName}}`" + `) != -1) {
                                url = url.replace(` + "`{${paramName}}`" + `, routeParams[paramName]);
                            }
                            else {
                                this.addSearchParam(search, paramName, routeParams[paramName]);
                            }
                        });
                    }

                    let request = this.http.request(this.basePath + url, {
                        body: body,
                        method: method,
                        responseType: ResponseContentType.Json,
                        search: search
                    });

                    return request.map(x => x.json())` + toPromise + `;
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
                            }
                            else {
                                search.append(name, value);
                            }
                        }
                    }
                }
            }`;
    }

    private getControllers(apiDescription: ApiDescription, config: GeneratorConfig): string {
        let controllers = '';

        if (apiDescription.controllers != undefined) {
            apiDescription.controllers.forEach((controller) => {
                controllers += `
                    export class ${controller.name}Controller {
                        constructor(private _connection: ApiConnection) {
                        }

                        ${this.getControllerMethods(controller, config)}
                    }
                `;
            });
        }

        return controllers;
    }

    private getControllerMethods(controllerDescription: ControllerDescriptor, config: GeneratorConfig): string {
        if (controllerDescription.actions == undefined) {
            return '';
        }

        let actions = '';

        controllerDescription.actions.forEach((action) => {
            let params: { name: string, type: string, fromBody: boolean, defaultValue?: string }[] = [];
            let bodyParam = 'undefined';

            if (action.parameters != undefined) {
                action.parameters.forEach((actionParameter) => {
                    let param = {
                        defaultValue: actionParameter.defaultValue,
                        fromBody: actionParameter.source == ParameterSource.Body,
                        name: actionParameter.name,
                        type: this._definitions[actionParameter.type]
                    };

                    if (param.type == 'string' && param.defaultValue != undefined) {
                        param.defaultValue = `'${param.defaultValue}''`;
                    }

                    if (!actionParameter.isRequired) {
                        param.name += '?';
                    }

                    if (actionParameter.source == ParameterSource.Body) {
                        bodyParam = actionParameter.name;
                    }

                    params.push(param);
                });
            }

            let methodParams = params.map(p => {
                if (p.defaultValue != undefined) {
                    return `${p.name}: ${p.type} = ${p.defaultValue}`;
                }

                return `${p.name}: ${p.type}`;
            }).join(', ');

            let routeParams = params
                .filter(p => !p.fromBody)
                .map(p => {
                    return `${p.name}: ${p.name}`;
                })
                .join(', ');

            if (routeParams) {
                routeParams = `{ ${routeParams} }`;
            }
            else {
                routeParams = 'undefined';
            }

            let returnTypeArgument = 'void';

            if (action.responseType != undefined) {
                returnTypeArgument = this._definitions[action.responseType];
            }

            let returnType = config.usePromises ? `Promise<${returnTypeArgument}>` : `Observable<${returnTypeArgument}>`;

            actions += `
                public ${this.camelCase(action.name)}(${methodParams}): ${returnType} {
                    return this._connection.request('${action.route}', '${action.method}', ${routeParams}, ${bodyParam});
                }
            `;
        });

        return actions;
    }

    private getModels(apiDescription: ApiDescription): string {
        if (apiDescription.definitions == undefined) {
            return '';
        }

        let classesAndInterfaces = apiDescription.definitions
            .filter(x => x.type == DefinitionType.Class || x.type == DefinitionType.Interface);

        if (classesAndInterfaces.length == 0) {
            return '';
        }

        let models: string[] = [];

        classesAndInterfaces.forEach((definition) => {
            if (definition.name.indexOf('<') != -1) {
                let genericArguments = definition.name
                    .split('<')[1]
                    .replace('>', '')
                    .split(',')
                    .map(x => x.trim());

                if (genericArguments.every(a => this._definitions[a] != undefined)) {
                    return;
                }
            }

            let properties: string[] = [];

            if (definition.properties != undefined) {
                definition.properties.forEach((propertyDescription) => {
                    let name = this.camelCase(propertyDescription.name);

                    if (propertyDescription.isNullable) {
                        name += '?';
                    }

                    let type = this._definitions[propertyDescription.type];

                    if (type == undefined) {
                        type = propertyDescription.type;
                    }

                    let property = `${name}: ${type};`;

                    properties.push(property);
                });
            }

            let model = `export interface ${this._definitions[definition.name]}`;

            if (definition.extends != undefined && definition.extends.length > 0) {
                let baseTypes = definition.extends
                    .map(x => this._definitions[x])
                    .join(', ');

                model += ` extends ${baseTypes}`;
            }

            model += ` {
                ${properties.join('\n')}
            }`;

            models.push(model);
        });

        return models.join('\n\n');
    }

    private getEnums(apiDescription: ApiDescription): string {
        let enumDescriptions = apiDescription.definitions == undefined
            ? undefined
            : apiDescription.definitions.filter(x => x.type == DefinitionType.Enum);

        if (enumDescriptions == undefined || enumDescriptions.length == 0) {
            return '';
        }

        let tsEnums: string[] = [];

        enumDescriptions.forEach((enumDescription) => {
            let values: string[] = [];

            if (enumDescription.values != undefined) {
                enumDescription.values.forEach((valueDescription) => {
                    if (valueDescription.value != undefined) {
                        values.push(`${valueDescription.name} = ${valueDescription.value}`);
                    } else {
                        values.push(`${valueDescription.name}`);
                    }
                });
            }

            let tsEnum = `export enum ${enumDescription.name} {
                ${values.join(', \n')}
            }`;

            tsEnums.push(tsEnum);
        });

        return tsEnums.join('\n\n');
    }

    private camelCase(text: string): string {
        return text.substr(0, 1).toLowerCase() + text.substr(1);
    }
}