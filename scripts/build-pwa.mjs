import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function buildPwa(output, { cloud, course }, sourceRoot) {
  const html = await readFile(resolve(output, 'index.html'), 'utf8');
  const linked = [...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|png|webmanifest))"/g)].map(match => match[1]);
  const fonts = (await readdir(resolve(output, 'vendor/katex/fonts'))).filter(name => name.endsWith('.woff2')).map(name => `vendor/katex/fonts/${name}`);
  const assets = [...new Set(['./', 'index.html', ...linked, ...fonts, 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'data/syllabus.json', 'data/questions.json', 'data/pyqs.json', 'data/lesson-questions.json', 'data/papers.json'])].filter(path => !['cloud-config.js', 'course-config.js'].includes(path));
  // Offline configuration is constructed from the same publishable-only build settings.
  const offline = {
    'cloud-config.js': `window.GATEWISE_CLOUD = ${JSON.stringify(cloud)};\n`,
    'course-config.js': `window.GATEWISE_COURSE = ${JSON.stringify(course)};\nwindow.GATEWISE_OFFLINE_BOOT = true;\n`
  };
  const template = await readFile(resolve(sourceRoot, 'service-worker.js'), 'utf8');
  const digest = createHash('sha256').update(template).update(JSON.stringify(offline));
  for (const path of assets) digest.update(path).update(await readFile(resolve(output, path === './' ? 'index.html' : path)));
  const worker = template.replace('__GATEWISE_VERSION__', digest.digest('hex').slice(0, 20)).replace('__GATEWISE_PUBLIC_ASSETS__', JSON.stringify(assets)).replace('__GATEWISE_OFFLINE_CONFIG__', JSON.stringify(offline));
  await writeFile(resolve(output, 'service-worker.js'), worker);
  return assets;
}
