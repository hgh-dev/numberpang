import { mkdir, copyFile, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const files = ['index.html', 'style.css', 'app.js', 'engine.js', 'manifest.webmanifest', 'sw.js'];
for (const file of files) await copyFile(new URL(file, root), new URL(file, output));
await cp(new URL('icons/', root), new URL('icons/', output), { recursive: true });
// 배포할 때마다 파일 내용에서 캐시 버전을 만들어 업데이트 누락을 방지합니다.
const hash = createHash('sha256');
for (const file of [...files, 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png']) hash.update(await readFile(new URL(file, root)));
const version = hash.digest('hex').slice(0, 16);
const worker = await readFile(new URL('sw.js', output), 'utf8');
await writeFile(new URL('sw.js', output), worker.replace(/const CACHE='[^']+';/, `const CACHE='numberpang-${version}';`));
await writeFile(new URL('.nojekyll', output), '');
console.log(`정적 배포 파일 생성 완료: dist/ (캐시 ${version})`);
