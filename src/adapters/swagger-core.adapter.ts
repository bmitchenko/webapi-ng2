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
} from '../specification';

export class SwaggerCoreAdapter {
    public getSpecification(response: any): Specification {
        let controllerOperations: { [name: string]: Operation[] } = {};

        for (let pathKey in response.paths) {
            let path = response.paths[pathKey];

            for (let method in path) {
                let operation = path[method];
                let controllerName = operation['core:controller'];
                let operationName = operation['core:name'];

                if (controllerOperations[controllerName] == undefined) {
                    controllerOperations[controllerName] = [];
                }

                let controller = controllerOperations[controllerName];

                let parameters = operation['core:parameters'];

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

        let schema: Schema[] = [];
        let coreTypes = response['core:types'];

        if (typeof coreTypes === 'string') {
            coreTypes = JSON.parse(coreTypes);
        }

        for (let coreTypeName in coreTypes) {
            let coreType = coreTypes[coreTypeName];

            schema.push({
                attributes: coreType.attributes,
                extends: coreType.extends,
                name: coreType.name,
                properties: coreType.properties,
                type: coreType.type == 'enum' ? SchemaType.Enumeration : SchemaType.Object,
                values: coreType.enumValues
            });
        }

        let controllers: Controller[] = [];

        for (let controllerName in controllerOperations) {
            controllers.push({
                name: controllerName,
                operations: controllerOperations[controllerName]
            });
        }

        let specification: Specification = {
            controllers: controllers,
            schema: schema
        };

        return specification;
    }
}
