//#! /usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var generator_1 = require("./src/generator");
var config;
var configPath = path.resolve(process.cwd(), process.argv[2] || 'webapi-config.json');
try {
    if (!fs.existsSync(configPath)) {
        throw new Error("File not found.");
    }
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}
catch (e) {
    console.log("WEBAPI-NG2: Can't load config " + configPath + ". " + e + ".");
    process.exit(1);
}
new generator_1.Generator()
    .configure(config)
    .enableFormatting()
    .build()
    .then(function (_a) {
    var path = _a[0], host = _a[1];
    console.log("WEBAPI-NG2: Client generated at \"" + path + "\" from \"" + host + "\".");
})
    .catch(function (error) {
    console.log("WEBAPI-NG2: " + error + ".");
});
//# sourceMappingURL=index.js.map