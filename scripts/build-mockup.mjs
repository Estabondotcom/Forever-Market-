import {build} from 'esbuild';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('mockup/assets',{recursive:true});
await build({entryPoints:['preview/entry.tsx'],bundle:true,minify:true,format:'esm',target:['es2022'],platform:'browser',jsx:'automatic',outfile:'mockup/assets/app.js',define:{'process.env.NODE_ENV':'"production"'},legalComments:'eof'});
const css=(await readFile('src/app/globals.css','utf8')).replace('@import "tailwindcss";','');
await writeFile('mockup/assets/app.css',css);
await writeFile('mockup/index.html',`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="description" content="Interactive sample-data preview of Forever: Farmer’s Market. No live auction data."><title>Forever: Farmer’s Market — Interactive Mockup</title><link rel="stylesheet" href="./assets/app.css"></head><body><div id="app"></div><noscript>This interactive mockup requires JavaScript. All displayed data is synthetic sample data, not live AH observations.</noscript><script type="module" src="./assets/app.js"></script></body></html>\n`);
console.log('Built mockup/ from the real dashboard; demo-only, no API requests or credentials.');
