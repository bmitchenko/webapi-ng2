"use strict";
var definition_type_1 = require('./definition-type');
var parameter_source_1 = require('./parameter-source');
var ApiExplorerGenerator = (function () {
    function ApiExplorerGenerator() {
        this._definitions = {};
    }
    ApiExplorerGenerator.prototype.generate = function (apiDescription, config) {
        if (apiDescription.definitions != undefined) {
            this.mapDefinitions(apiDescription.definitions);
        }
        var script = this.getImports(config) + '\n\r' +
            this.getApi(apiDescription, config) + '\n\r' +
            this.getApiConnection(apiDescription, config) + '\n\r' +
            this.getControllers(apiDescription, config) + '\n\r' +
            this.getModels(apiDescription) + '\n\r' +
            this.getEnums(apiDescription);
        return script;
    };
    ApiExplorerGenerator.prototype.mapDefinitions = function (definition) {
        var _this = this;
        var map = new Map();
        definition.forEach(function (type) {
            map.set(type.name, type);
        });
        definition.forEach(function (type) {
            _this.mapDefinition(type, map);
        });
        this._definitions['void'] = 'void';
    };
    ApiExplorerGenerator.prototype.mapDefinition = function (definition, definitionMap) {
        var mappedType = (this._definitions[definition.name]);
        if (mappedType != undefined) {
            return mappedType;
        }
        switch (definition.type) {
            case definition_type_1.DefinitionType.Class:
                mappedType = this.mapObject(definition, definitionMap);
                break;
            case definition_type_1.DefinitionType.Collection:
                mappedType = this.mapCollection(definition, definitionMap);
                break;
            case definition_type_1.DefinitionType.Enum:
                mappedType = this.mapEnum(definition, definitionMap);
                break;
            case definition_type_1.DefinitionType.Interface:
                mappedType = this.mapObject(definition, definitionMap);
                break;
            case definition_type_1.DefinitionType.Primitive:
                mappedType = this.mapPrimitive(definition, definitionMap);
                break;
            default: break;
        }
        if (mappedType == undefined) {
            throw new Error("Cannot map type " + definition.name + ".");
        }
        this._definitions[definition.name] = mappedType;
        return mappedType;
    };
    ApiExplorerGenerator.prototype.mapCollection = function (definition, definitionMap) {
        var collectionTypeName = definition.name.substr(0, definition.name.length - 2);
        if (!definitionMap.has(collectionTypeName)) {
            throw new Error("Type " + collectionTypeName + " not found.");
        }
        var collectionType = this.mapDefinition(definitionMap.get(collectionTypeName), definitionMap);
        return "Array<" + collectionType + ">";
    };
    ApiExplorerGenerator.prototype.mapEnum = function (definition, definitionMap) {
        return definition.name;
    };
    ApiExplorerGenerator.prototype.mapPrimitive = function (definition, definitionMap) {
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
                throw new Error("Type not found " + definition.name + ".");
        }
    };
    ApiExplorerGenerator.prototype.mapObject = function (definition, definitionMap) {
        var _this = this;
        var name = definition.name;
        if (name.indexOf('<') == -1) {
            return name;
        }
        var genericArguments = name
            .split('<')[1]
            .replace('>', '')
            .split(',')
            .map(function (x) { return x.trim(); });
        if (!genericArguments.some(function (a) { return definitionMap.has(a); })) {
            return name;
        }
        var genericTypes = [];
        genericArguments.forEach(function (argument) {
            if (!definitionMap.has(argument)) {
                throw new Error("Type " + argument + " not found.");
            }
            genericTypes.push(definitionMap.get(argument));
        });
        var genericParameters = genericTypes
            .map(function (x) { return _this.mapDefinition(x, definitionMap); })
            .join(', ');
        name = name
            .split('<')[0];
        return name + "<" + genericParameters + ">";
    };
    ApiExplorerGenerator.prototype.getImports = function (config) {
        var imports = "\n            // \n            // This file is autogenerated. \n            // See http://github.com/bmitchenko/webapp-ng2 for details. \n            //\n\n            import { Injectable } from '@angular/core';\n            import { Http, ResponseContentType, URLSearchParams } from '@angular/http';\n            import { Observable } from 'rxjs';\n        ";
        return imports;
    };
    ApiExplorerGenerator.prototype.getApi = function (apiDescription, config) {
        var _this = this;
        var fields = [];
        var properties = [];
        if (apiDescription.controllers != undefined) {
            apiDescription.controllers.forEach(function (controller) {
                var className = controller.name + 'Controller';
                var fieldName = '_' + _this.camelCase(controller.name);
                fields.push("private " + fieldName + ": " + className + ";");
                var property = "public get " + _this.camelCase(controller.name) + "(): " + className + " {\n                        if (this." + fieldName + " == undefined) {\n                            this." + fieldName + " = new " + className + "(this._connection);\n                        }\n\n                        return this." + fieldName + ";\n                    }";
                properties.push(property);
            });
        }
        return "\n            @Injectable()\n            export class " + config.outputClass + " {\n                private _connection: ApiConnection;\n                " + fields.join('\n') + "\n\n                constructor (http: Http) {\n                    this._connection = new ApiConnection(http, '');\n                }\n                \n                public get basePath(): string {\n                    return this._connection.basePath;\n                }\n\n                public set basePath(basePath: string) {\n                    this._connection.basePath = basePath;\n                }\n                \n                " + properties.join('\n') + "\n            }";
    };
    ApiExplorerGenerator.prototype.getApiConnection = function (apiDescription, config) {
        var returnType = config.usePromises ? 'Promise<T>' : 'Observable<T>';
        var toPromise = config.usePromises ? '.toPromise()' : '';
        return "\n            export class ApiConnection {\n                constructor(public http: Http, public basePath: string) {\n                }\n\n                public request<T>(pattern: string, method: string, routeParams?: any, body?: any): " + returnType + " {\n                    let url = pattern;\n                    let search = new URLSearchParams();\n\n                    if (routeParams != undefined) {\n                        Object.getOwnPropertyNames(routeParams).forEach((paramName) => {\n                            if (url.indexOf(" + "`{${paramName}}`" + ") != -1) {\n                                url = url.replace(" + "`{${paramName}}`" + ", routeParams[paramName]);\n                            }\n                            else {\n                                this.addSearchParam(search, paramName, routeParams[paramName]);\n                            }\n                        });\n                    }\n\n                    let request = this.http.request(this.basePath + url, {\n                        body: body,\n                        method: method,\n                        responseType: ResponseContentType.Json,\n                        search: search\n                    });\n\n                    return request.map(x => x.json())" + toPromise + ";\n                }\n\n                private addSearchParam(search: URLSearchParams, name: string, value: any): void {\n                    if (value instanceof Array) {\n                        value.forEach((v, i) => {\n                            this.addSearchParam(search, " + "`${name}[${i}]`" + ", v);\n                        });\n                    } else {\n                        if (value instanceof Date) {\n                            search.append(name, value.toUTCString());\n                        } else {\n                            if (value instanceof Object) {\n                                Object.getOwnPropertyNames(value).forEach((propertyName) => {\n                                    this.addSearchParam(search, " + "`${name}.${propertyName}`" + ", value[propertyName]);\n                                });\n                            }\n                            else {\n                                search.append(name, value);\n                            }\n                        }\n                    }\n                }\n            }";
    };
    ApiExplorerGenerator.prototype.getControllers = function (apiDescription, config) {
        var _this = this;
        var controllers = '';
        if (apiDescription.controllers != undefined) {
            apiDescription.controllers.forEach(function (controller) {
                controllers += "\n                    export class " + controller.name + "Controller {\n                        constructor(private _connection: ApiConnection) {\n                        }\n\n                        " + _this.getControllerMethods(controller, config) + "\n                    }\n                ";
            });
        }
        return controllers;
    };
    ApiExplorerGenerator.prototype.getControllerMethods = function (controllerDescription, config) {
        var _this = this;
        if (controllerDescription.actions == undefined) {
            return '';
        }
        var actions = '';
        controllerDescription.actions.forEach(function (action) {
            var params = [];
            var bodyParam = 'undefined';
            if (action.parameters != undefined) {
                action.parameters.forEach(function (actionParameter) {
                    var param = {
                        defaultValue: actionParameter.defaultValue,
                        fromBody: actionParameter.source == parameter_source_1.ParameterSource.Body,
                        name: actionParameter.name,
                        type: _this._definitions[actionParameter.type]
                    };
                    if (param.type == 'string' && param.defaultValue != undefined) {
                        param.defaultValue = "'" + param.defaultValue + "''";
                    }
                    if (!actionParameter.isRequired) {
                        param.name += '?';
                    }
                    if (actionParameter.source == parameter_source_1.ParameterSource.Body) {
                        bodyParam = actionParameter.name;
                    }
                    params.push(param);
                });
            }
            var methodParams = params.map(function (p) {
                if (p.defaultValue != undefined) {
                    return p.name + ": " + p.type + " = " + p.defaultValue;
                }
                return p.name + ": " + p.type;
            }).join(', ');
            var routeParams = params
                .filter(function (p) { return !p.fromBody; })
                .map(function (p) {
                return p.name + ": " + p.name;
            })
                .join(', ');
            if (routeParams) {
                routeParams = "{ " + routeParams + " }";
            }
            else {
                routeParams = 'undefined';
            }
            var returnTypeArgument = 'void';
            if (action.responseType != undefined) {
                returnTypeArgument = _this._definitions[action.responseType];
            }
            var returnType = config.usePromises ? "Promise<" + returnTypeArgument + ">" : "Observable<" + returnTypeArgument + ">";
            actions += "\n                public " + _this.camelCase(action.name) + "(" + methodParams + "): " + returnType + " {\n                    return this._connection.request('" + action.route + "', '" + action.method + "', " + routeParams + ", " + bodyParam + ");\n                }\n            ";
        });
        return actions;
    };
    ApiExplorerGenerator.prototype.getModels = function (apiDescription) {
        var _this = this;
        if (apiDescription.definitions == undefined) {
            return '';
        }
        var classesAndInterfaces = apiDescription.definitions
            .filter(function (x) { return x.type == definition_type_1.DefinitionType.Class || x.type == definition_type_1.DefinitionType.Interface; });
        if (classesAndInterfaces.length == 0) {
            return '';
        }
        var models = [];
        classesAndInterfaces.forEach(function (definition) {
            if (definition.name.indexOf('<') != -1) {
                var genericArguments = definition.name
                    .split('<')[1]
                    .replace('>', '')
                    .split(',')
                    .map(function (x) { return x.trim(); });
                if (genericArguments.every(function (a) { return _this._definitions[a] != undefined; })) {
                    return;
                }
            }
            var properties = [];
            if (definition.properties != undefined) {
                definition.properties.forEach(function (propertyDescription) {
                    var name = _this.camelCase(propertyDescription.name);
                    if (propertyDescription.isNullable) {
                        name += '?';
                    }
                    var type = _this._definitions[propertyDescription.type];
                    if (type == undefined) {
                        type = propertyDescription.type;
                    }
                    var property = name + ": " + type + ";";
                    properties.push(property);
                });
            }
            var model = "export interface " + _this._definitions[definition.name];
            if (definition.extends != undefined && definition.extends.length > 0) {
                var baseTypes = definition.extends
                    .map(function (x) { return _this._definitions[x]; })
                    .join(', ');
                model += " extends " + baseTypes;
            }
            model += " {\n                " + properties.join('\n') + "\n            }";
            models.push(model);
        });
        return models.join('\n\n');
    };
    ApiExplorerGenerator.prototype.getEnums = function (apiDescription) {
        var enumDescriptions = apiDescription.definitions == undefined
            ? undefined
            : apiDescription.definitions.filter(function (x) { return x.type == definition_type_1.DefinitionType.Enum; });
        if (enumDescriptions == undefined || enumDescriptions.length == 0) {
            return '';
        }
        var tsEnums = [];
        enumDescriptions.forEach(function (enumDescription) {
            var values = [];
            if (enumDescription.values != undefined) {
                enumDescription.values.forEach(function (valueDescription) {
                    if (valueDescription.value != undefined) {
                        values.push(valueDescription.name + " = " + valueDescription.value);
                    }
                    else {
                        values.push("" + valueDescription.name);
                    }
                });
            }
            var tsEnum = "export enum " + enumDescription.name + " {\n                " + values.join(', \n') + "\n            }";
            tsEnums.push(tsEnum);
        });
        return tsEnums.join('\n\n');
    };
    ApiExplorerGenerator.prototype.camelCase = function (text) {
        return text.substr(0, 1).toLowerCase() + text.substr(1);
    };
    return ApiExplorerGenerator;
}());
exports.ApiExplorerGenerator = ApiExplorerGenerator;
//# sourceMappingURL=api-explorer-generator.js.map