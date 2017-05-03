//#! /usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Generator } from './src/generator';
import { GeneratorConfig } from './src/generator-config';

var config: GeneratorConfig | undefined;
var configPath = path.resolve(process.cwd(), process.argv[2] || 'webapi-config.json');

try {
    if (!fs.existsSync(configPath)) {
        throw new Error(`File not found.`);
    }

    config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as GeneratorConfig;
} catch (e) {
    console.log(`WEBAPI-NG2: Can't load config ${configPath}. ${e}.`);
    process.exit(1);
}

new Generator()
    .configure(config!)
    .enableFormatting()
    .build()
    .then(([path, host]) => {
        console.log(`WEBAPI-NG2: Client generated at "${path}" from "${host}".`);
    })
    .catch((error) => {
        console.log(`WEBAPI-NG2: ${error}.`);
    });