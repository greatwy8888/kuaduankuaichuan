import { cp, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
await mkdir('www', { recursive: true });
for (const file of ['index.html','styles.css','app.js','manifest.webmanifest']) await copyFile(file, 'www/' + file);
if (existsSync('assets')) await cp('assets','www/assets',{recursive:true});
console.log('Android web assets prepared.');
