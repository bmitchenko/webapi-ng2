"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var url = require("url");
var dotnet_process_1 = require("./dotnet-process");
var child_process_1 = require("child_process");
var swagger_core_adapter_1 = require("./adapters/swagger-core.adapter");
var angular_generator_1 = require("./generators/angular/angular-generator");
var request = require("request");
//var Promise = require('promise');
var Generator = /** @class */ (function () {
    function Generator() {
        this._format = false;
    }
    Generator.prototype.configure = function (config) {
        this._config = config;
        return this;
    };
    Generator.prototype.enableFormatting = function () {
        this._format = true;
        return this;
    };
    Generator.prototype.build = function () {
        var _this = this;
        return this.validateConfig()
            .then(function (x) { return _this.startServer(); })
            .then(function (x) { return _this.loadSpecification(); })
            .then(function (x) { return _this.stopServer(); })
            .then(function (x) { return _this.generateScript(); })
            .then(function (x) { return _this.formatScript(); })
            .then(function () {
            return [_this._outputFile, url.resolve(_this._host, _this._config.path)];
        });
    };
    Generator.prototype.validateConfig = function () {
        if (this._config == undefined) {
            return Promise.reject('No config provided.');
        }
        if (this._config.host == undefined && this._config.projectPath == undefined) {
            return Promise.reject('Host or project path is required.');
        }
        return Promise.resolve();
    };
    Generator.prototype.startServer = function () {
        var _this = this;
        if (this._config == undefined || this._config.projectPath == undefined) {
            return Promise.resolve();
        }
        this._server = new dotnet_process_1.DotNetProcess(this._config.projectPath);
        return this._server.launch().then(function (hostname) {
            _this._host = hostname;
        });
    };
    Generator.prototype.stopServer = function () {
        if (this._server != undefined) {
            this._server.terminate();
        }
        return Promise.resolve();
    };
    Generator.prototype.loadSpecification = function () {
        var _this = this;
        if (this._host == undefined) {
            this._host = this._config.host;
        }
        var specificationUrl = url.resolve(this._host, this._config.path);
        return new Promise(function (resolve, reject) {
            var options = {
                url: specificationUrl,
                json: true
            };
            if (_this._config != undefined && _this._config.username != undefined) {
                options.auth = {
                    user: _this._config.username,
                    password: _this._config.password
                };
            }
            request(options, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    _this._response = body;
                    resolve(body);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    Generator.prototype.generateScript = function () {
        var script = undefined;
        var adapter;
        switch (this._config.specification) {
            // case 'api-explorer':
            //     generator = new ApiExplorerGenerator();
            //     script = generator.generate(this._specification, this._config!);
            //     break;
            case 'swagger-core':
                adapter = new swagger_core_adapter_1.SwaggerCoreAdapter();
                // generator = new ApiExplorerGenerator();
                // let adapter = new SwaggerCoreAdapter();
                // this._specification = adapter.getApiDescription(this._specification);
                // script = generator.generate(this._specification, this._config!);
                break;
            default:
                throw new Error("Specification \"" + this._config.specification + "\" is not supported.");
        }
        this._specification = adapter.getSpecification(this._response);
        var generator = new angular_generator_1.AngularGenerator();
        script = generator.generate(this._specification, this._config);
        if (this._config.outputFile) {
            this._outputFile = path.resolve(this._config.outputFile);
        }
        else {
            this._outputFile = path.resolve("./" + (this._config.outputClass || 'ApiClient'));
        }
        fs.writeFileSync(this._outputFile, script, {
            encoding: 'utf8'
        });
        return Promise.resolve();
    };
    Generator.prototype.formatScript = function () {
        if (this._format) {
            child_process_1.execSync('tsfmt --no-tsconfig -r ' + this._outputFile);
        }
        return Promise.resolve();
    };
    return Generator;
}());
exports.Generator = Generator;
//# sourceMappingURL=generator.js.map