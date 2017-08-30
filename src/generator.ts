import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as url from 'url';

import { GeneratorConfig } from './generator-config';
import { DotNetProcess } from './dotnet-process';
import { execSync, ExecOptions } from 'child_process';
import { Specification } from './specification';
import { SwaggerCoreAdapter } from './adapters/swagger-core.adapter';
import { AngularGenerator } from './generators/angular/angular-generator';

var request = require("request");
//var Promise = require('promise');

export class Generator {
    private _config?: GeneratorConfig;
    private _format = false;
    private _host?: string;
    private _outputFile: string;
    private _response?: any;
    private _server?: DotNetProcess;
    private _specification: Specification;

    public configure(config: GeneratorConfig): Generator {
        this._config = config;
        return this;
    }

    public enableFormatting(): Generator {
        this._format = true;
        return this;
    }

    public build(): Promise<string[]> {
        return this.validateConfig()
            .then(x => this.startServer())
            .then(x => this.loadSpecification())
            .then(x => this.stopServer())
            .then(x => this.generateScript())
            .then(x => this.formatScript())
            .then(() => {
                return [this._outputFile, url.resolve(this._host!, this._config!.path)];
            });
    }

    private validateConfig(): Promise<any> {
        if (this._config == undefined) {
            return Promise.reject('No config provided.');
        }

        if (this._config.host == undefined && this._config.projectPath == undefined) {
            return Promise.reject('Host or project path is required.');
        }

        return Promise.resolve();
    }

    private startServer(): Promise<any> {
        if (this._config == undefined || this._config.projectPath == undefined) {
            return Promise.resolve();
        }

        this._server = new DotNetProcess(this._config.projectPath);

        return this._server.launch().then((hostname) => {
            this._host = hostname;
        })
    }

    private stopServer(): Promise<any> {
        if (this._server != undefined) {
            this._server.terminate();
        }

        return Promise.resolve();
    }

    private loadSpecification(): Promise<string> {
        if (this._host == undefined) {
            this._host = this._config!.host!;
        }

        var specificationUrl = url.resolve(this._host, this._config!.path);

        return new Promise<any>((resolve, reject) => {
            let options: any = {
                url: specificationUrl,
                json: true
            };

            if (this._config != undefined && this._config.username != undefined) {
                options.auth = {
                    user: this._config.username,
                    password: this._config.password
                };
            }

            request(options, (error: any, response: any, body: any) => {
                if (!error && response.statusCode === 200) {
                    this._response = body;
                    resolve(body);
                } else {
                    reject(error);
                }
            })
        });
    }

    private generateScript(): Promise<any> {
        var script: string | undefined = undefined;
        var adapter: any;

        switch (this._config!.specification) {
            // case 'api-explorer':
            //     generator = new ApiExplorerGenerator();
            //     script = generator.generate(this._specification, this._config!);
            //     break;
            case 'swagger-core':
                adapter = new SwaggerCoreAdapter();
                // generator = new ApiExplorerGenerator();
                // let adapter = new SwaggerCoreAdapter();
                // this._specification = adapter.getApiDescription(this._specification);
                // script = generator.generate(this._specification, this._config!);
                break;
            default:
                throw new Error(`Specification "${this._config!.specification}" is not supported.`);
        }

        this._specification = adapter.getSpecification(this._response);

        var generator = new AngularGenerator();

        script = generator.generate(this._specification, this._config!);

        if (this._config!.outputFile) {
            this._outputFile = path.resolve(this._config!.outputFile);
        }
        else {
            this._outputFile = path.resolve(`./${this._config!.outputClass || 'ApiClient'}`);
        }

        fs.writeFileSync(this._outputFile, script, {
            encoding: 'utf8'
        });

        return Promise.resolve();
    }

    private formatScript(): Promise<any> {
        if (this._format) {
            execSync('tsfmt -r ' + this._outputFile);
        }

        return Promise.resolve();
    }
}
