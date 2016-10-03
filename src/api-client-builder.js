"use strict";
var fs = require('fs');
var path = require('path');
var url = require('url');
var dotnet_process_1 = require('./dotnet-process');
var child_process_1 = require('child_process');
var api_explorer_generator_1 = require('./generators/api-explorer/api-explorer-generator');
var request = require("request");
//var Promise = require('promise');
var ApiClientBuilder = (function () {
    function ApiClientBuilder() {
        this._format = false;
    }
    ApiClientBuilder.prototype.configure = function (config) {
        this._config = config;
        return this;
    };
    ApiClientBuilder.prototype.enableFormatting = function () {
        this._format = true;
        return this;
    };
    ApiClientBuilder.prototype.build = function () {
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
    ApiClientBuilder.prototype.validateConfig = function () {
        if (this._config == undefined) {
            return Promise.reject('No config provided.');
        }
        if (this._config.host == undefined && this._config.projectPath == undefined) {
            return Promise.reject('Host or project path is required.');
        }
        return Promise.resolve();
    };
    ApiClientBuilder.prototype.startServer = function () {
        var _this = this;
        if (this._config == undefined || this._config.projectPath == undefined) {
            return Promise.resolve();
        }
        this._server = new dotnet_process_1.DotNetProcess(this._config.projectPath);
        return this._server.launch().then(function (hostname) {
            _this._host = hostname;
        });
    };
    ApiClientBuilder.prototype.stopServer = function () {
        if (this._server != undefined) {
            this._server.terminate();
        }
        return Promise.resolve();
    };
    ApiClientBuilder.prototype.loadSpecification = function () {
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
            request(options, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    _this._apiDescription = body;
                    resolve(body);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    ApiClientBuilder.prototype.generateScript = function () {
        var script = undefined;
        switch (this._config.specification) {
            case 'api-explorer':
                var generator = new api_explorer_generator_1.ApiExplorerGenerator();
                script = generator.generate(this._apiDescription, this._config);
                break;
            default:
                throw new Error("Specification \"" + this._config.specification + "\" is not supported.");
        }
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
    ApiClientBuilder.prototype.formatScript = function () {
        if (this._format) {
            child_process_1.execSync('tsfmt -r ' + this._outputFile);
        }
        return Promise.resolve();
    };
    return ApiClientBuilder;
}());
exports.ApiClientBuilder = ApiClientBuilder;
//# sourceMappingURL=api-client-builder.js.map