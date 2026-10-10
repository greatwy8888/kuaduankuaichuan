import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const file='android/app/src/main/AndroidManifest.xml';
if (!existsSync(file)) throw new Error('AndroidManifest.xml not found; run cap add android first.');
let xml=await readFile(file,'utf8');
if (xml.includes('android:usesCleartextTraffic=')) xml=xml.replace(/android:usesCleartextTraffic="[^"]*"/, 'android:usesCleartextTraffic="true"');
else xml=xml.replace('<application', '<application android:usesCleartextTraffic="true"');
await writeFile(file,xml);
console.log('Enabled HTTP access for private LAN host connections.');
