import { ChildProcess, exec, ExecOptions } from 'child_process';
var killProcess = require('tree-kill');

/**
 * Launches and teminates 'dotnet' process.
 */
export class DotNetProcess {
    private _process?: ChildProcess;
    private _isKilled = false;

    constructor(private _workingDirectory: string) {
    }

    /**
     * Launches 'dotnet' process and returns it's listening host and port.
     */
    public launch(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            var options: ExecOptions = {
                cwd: this._workingDirectory
            };

            this._process = exec("dotnet run", options, (error, stdout, stderr) => {
                if (error && !this._isKilled) {
                    reject(error);
                } else {
                    if (stderr) {
                        console.log(stderr);
                    }
                }
            });

            this._process.stdout.on('data', (s: string) => {
                let lines = s.split('\r\n');
                let prefix = 'Now listening on:';
                let listeningLine = lines.filter(x => x.startsWith(prefix))[0];

                if (listeningLine != undefined) {
                    resolve(listeningLine.substr(prefix.length).trim());
                }
            });
        });
    }

    /**
     * Terminates 'dotnet' process.
     */
    public terminate(): void {
        if (this._process != undefined) {
            this._isKilled = true;
            killProcess(this._process.pid);
        }

        this._process = undefined;
    }
}
