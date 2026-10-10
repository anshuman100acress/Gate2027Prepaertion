import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { readCourseCatalog } from '../scripts/course-catalog.mjs';
const build = (url, key) => spawnSync(process.execPath, ['scripts/build.mjs'], { encoding: 'utf8', env: { ...process.env, GATEWISE_SUPABASE_URL: url, GATEWISE_SUPABASE_PUBLISHABLE_KEY: key } });
const url = 'https://gatewise-test.supabase.co';
assert.equal(build(url, '').status, 1, 'partial configuration must fail');
assert.equal(build(url, 'sb_secret_do-not-publish').status, 1, 'secret keys must be rejected');
const jwt = role => ['test', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature'].join('.');
assert.equal(build(url, jwt('service_role')).status, 1, 'privileged legacy keys must be rejected');
assert.equal(build(url, jwt('anon')).status, 0, 'legacy anon key is supported');
assert.equal(build(url, 'sb_publishable_test').status, 0, 'publishable key is supported');
assert.match(await readFile('dist/cloud-config.js', 'utf8'), /sb_publishable_test/);
for (const file of ['dist/vendor/supabase/supabase.js', 'dist/vendor/katex/katex.min.js', 'dist/data/syllabus.json', 'dist/papers/2018_CS.pdf', 'dist/study-time.js', 'dist/study-tools.js', 'dist/study-tools.css', 'dist/notes.js', 'dist/notes.css', 'dist/sticky-notes.js', 'dist/sticky-notes.css']) await access(file);
for (const file of ['dist/.env', 'dist/tests', 'dist/supabase', 'dist/data/build.py', 'dist/node_modules']) await assert.rejects(() => access(file), 'development/private files must stay out of deployment');
if ((await readCourseCatalog(process.cwd())).publicOnly) {
  assert.equal(build('', '').status, 1, 'public preview release requires configured protected accounts');
} else {
  assert.equal(build('', '').status, 0, 'guest deployment is supported for the full private authoring catalog');
  assert.match(await readFile('dist/cloud-config.js', 'utf8'), /"url":""/);
}
console.log('Cloud build checks passed: public configuration, key rejection, runtime assets and protected-release configuration.');
