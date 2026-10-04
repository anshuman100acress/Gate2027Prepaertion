import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const url = (process.env.GATEWISE_SUPABASE_URL || '').trim();
const key = (process.env.GATEWISE_SUPABASE_PUBLISHABLE_KEY || '').trim();
if (!!url !== !!key) throw new Error('Set both GATEWISE_SUPABASE_URL and GATEWISE_SUPABASE_PUBLISHABLE_KEY, or neither for guest mode.');
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) throw new Error('Use your Supabase project HTTPS URL.');
if (key && !key.startsWith('sb_publishable_')) {
  let role; try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role; } catch {}
  if (role !== 'anon') throw new Error('Use a publishable key or legacy anon key. Never use a secret/service-role key.');
}
const options = { entryPoints: ['scripts/supabase-entry.js'], bundle: true, minify: true, platform: 'browser', target: 'es2022', legalComments: 'external' };
if (process.argv.includes('--vendor')) {
  await mkdir('vendor/supabase', { recursive: true });
  await build({ ...options, outfile: 'vendor/supabase/supabase.js' });
  await cp('node_modules/@supabase/supabase-js/LICENSE', 'vendor/supabase/LICENSE');
  let notices = '';
  for (const name of ['@supabase/auth-js', '@supabase/functions-js', '@supabase/postgrest-js', '@supabase/realtime-js', '@supabase/storage-js', '@supabase/phoenix', 'iceberg-js', 'tslib']) {
    const file = name === '@supabase/phoenix' ? 'LICENSE.md' : name === 'tslib' ? 'LICENSE.txt' : 'LICENSE';
    notices += `\n===== ${name} =====\n${await readFile(`node_modules/${name}/${file}`, 'utf8')}\n`;
    if (name === 'tslib') notices += await readFile('node_modules/tslib/CopyrightNotice.txt', 'utf8');
  }
  await writeFile('vendor/supabase/THIRD_PARTY_NOTICES.txt', notices.replaceAll('\r\n', '\n').trimEnd() + '\n');
  const metadata = JSON.parse(await readFile('node_modules/@supabase/supabase-js/package.json', 'utf8'));
  await writeFile('vendor/supabase/VERSION.txt', `${metadata.version}\nBuilt with npm run vendor:cloud; see package-lock.json for dependencies.\n`);
} else {
  await rm('dist', { recursive: true, force: true });
  await mkdir('dist');
  for (const name of ['index.html', 'style.css', 'app.js', 'pastpapers.js', 'learning.js', 'labs.js', 'math.js', 'progress-merge.js', 'progress-store.js', 'cloud.js', 'cloud.css', 'study-time.js', 'study-tools.js', 'study-tools.css', 'syllabus.pdf', 'papers', 'vendor']) await cp(name, `dist/${name}`, { recursive: true });
  await mkdir('dist/data');
  for (const name of ['syllabus.json', 'questions.json', 'papers.json', 'pyqs.json', 'lesson-questions.json', 'topic-coverage.json']) await cp(`data/${name}`, `dist/data/${name}`);
  await build({ ...options, outfile: 'dist/vendor/supabase/supabase.js' });
  await writeFile('dist/cloud-config.js', `window.GATEWISE_CLOUD = ${JSON.stringify({ url: url.replace(/\/$/, ''), publishableKey: key })};\n`);
  console.log(`Built dist/ with ${url ? 'Supabase accounts and progress sync' : 'local guest mode (cloud variables not set)'}.`);
}
