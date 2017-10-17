"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
var killProcess = require('tree-kill');
/**
 * Launches and teminates 'dotnet' process.
 */
var DotNetProcess = /** @class */ (function () {
    function DotNetProcess(_workingDirectory) {
        this._workingDirectory = _workingDirectory;
        this._isKilled = false;
    }
    /**
     * Launches 'dotnet' process and returns it's listening host and port.
     */
    DotNetProcess.prototype.launch = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var options = {
                cwd: _this._workingDirectory
            };
            _this._process = child_process_1.exec("dotnet run", options, function (error, stdout, stderr) {
                if (error && !_this._isKilled) {
                    reject(error);
                }
                else {
                    if (stderr) {
                        console.log(stderr);
                    }
                }
            });
            _this._process.stdout.on('data', function (s) {
                var lines = s.split('\r\n');
                var prefix = 'Now listening on:';
                var listeningLine = lines.filter(function (x) { return x.startsWith(prefix); })[0];
                if (listeningLine != undefined) {
                    resolve(listeningLine.substr(prefix.length).trim());
                }
            });
        });
    };
    /**
     * Terminates 'dotnet' process.
     */
    DotNetProcess.prototype.terminate = function () {
        if (this._process != undefined) {
            this._isKilled = true;
            killProcess(this._process.pid);
        }
        this._process = undefined;
    };
    return DotNetProcess;
}());
exports.DotNetProcess = DotNetProcess;
//# sourceMappingURL=dotnet-process.js.map