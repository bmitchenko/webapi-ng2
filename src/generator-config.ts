/**
 * Web API client generator configuration.
 */
export interface GeneratorConfig {
    /**
     * Specification schema. Default is 'api-explorer'. 
     */
    specification?: "api-explorer" | "swagger-core";

    /**
     * Host and port of the Web API.
     */
    host?: string;

    /**
     * Relative URL to get specification.
     */
    path: string;

    /**
     * Indicates that ASP.NET Core project is local. It will be launched with 'dotnet run' command to get specification. 
     */
    projectPath?: string;

    /**
     * Relative path for the output file. Default path is "./{outputClass}.ts".
     */
    outputFile?: string;

    /**
     * Name of the generated class. Default name is 'ApiClient'.
     */
    outputClass?: string;

    /**
     * Use Promise<T> instead of Observable<T> in action results. Default is false.
     */
    usePromises?: boolean;
}