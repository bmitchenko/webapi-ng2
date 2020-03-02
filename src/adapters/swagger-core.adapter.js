"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var specification_1 = require("../specification");
var SwaggerCoreAdapter = /** @class */ (function () {
    function SwaggerCoreAdapter() {
    }
    SwaggerCoreAdapter.prototype.getSpecification = function (response) {
        var controllerOperations = {};
        for (var pathKey in response.paths) {
            var path = response.paths[pathKey];
            for (var method in path) {
                var operation = path[method];
                var controllerName = operation['core:controller'];
                var operationName = operation['core:name'];
                if (controllerOperations[controllerName] == undefined) {
                    controllerOperations[controllerName] = [];
                }
                var controller = controllerOperations[controllerName];
                var parameters = operation['core:parameters'];
                if (parameters != undefined && typeof parameters === 'string') {
                    parameters = JSON.parse(parameters);
                }
                controller.push({
                    method: method,
                    name: operationName,
                    parameters: parameters,
                    path: pathKey,
                    responseType: operation['core:return-type'],
                    summary: operation['summary']
                });
            }
        }
        var schema = [];
        var coreTypes = response['core:types'];
        for (var coreTypeName in coreTypes) {
            var coreType = coreTypes[coreTypeName];
            if (typeof coreType === 'string') {
                coreType = JSON.parse(coreType);
            }
            schema.push({
                attributes: coreType.attributes,
                extends: coreType.extends,
                name: coreType.name,
                properties: coreType.properties,
                type: coreType.type == 'enum' ? specification_1.SchemaType.Enumeration : specification_1.SchemaType.Object,
                values: coreType.enumValues
            });
        }
        var controllers = [];
        for (var controllerName in controllerOperations) {
            controllers.push({
                name: controllerName,
                operations: controllerOperations[controllerName]
            });
        }
        var specification = {
            controllers: controllers,
            schema: schema
        };
        return specification;
    };
    return SwaggerCoreAdapter;
}());
exports.SwaggerCoreAdapter = SwaggerCoreAdapter;
//# sourceMappingURL=swagger-core.adapter.js.map