#! /usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Generator } from './src/generator';
import { GeneratorConfig } from './src/generator-config';

let config: GeneratorConfig | GeneratorConfig[] | undefined;
let configPath = path.resolve(process.cwd(), process.argv[2] || 'webapi-config.json');

try {
    if (!fs.existsSync(configPath)) {
        throw new Error(`File not found.`);
    }

    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
    console.log(`WEBAPI-NG: Can't load config ${configPath}. ${e}.`);
    process.exit(1);
}

if (config == undefined) {
    throw Error(`WEBAPI-NG: Config file is empty.`);
}

if (!(config instanceof Array)) {
    config = [config];
}

for (let c of config) {
    new Generator()
        .configure(c)
        .enableFormatting()
        .build()
        .then(([path, host]) => {
            console.log(`WEBAPI-NG: Client generated at "${path}" from "${host}".`);
        })
        .catch((error) => {
            console.log(`WEBAPI-NG: ${error}.`);
        });
}


