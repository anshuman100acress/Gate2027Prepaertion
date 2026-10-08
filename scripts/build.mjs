import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { publicCloudSettings, publicCourseSettings, readCourseCatalog, protectedCatalog } from './course-catalog.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const options = { absWorkingDir: projectRoot, entryPoints: ['scripts/supabase-entry.js'], bundle: true, minify: true, platform: 'browser', target: 'es2022', legalComments: 'external' };

async function buildVendor() {
  await mkdir(resolve(projectRoot, 'vendor/supabase'), { recursive: true });
  await build({ ...options, outfile: resolve(projectRoot, 'vendor/supabase/supabase.js') });
  await cp(resolve(projectRoot, 'node_modules/@supabase/supabase-js/LICENSE'), resolve(projectRoot, 'vendor/supabase/LICENSE'));
  let notices = '';
  for (const name of ['@supabase/auth-js', '@supabase/functions-js', '@supabase/postgrest-js', '@supabase/realtime-js', '@supabase/storage-js', '@supabase/phoenix', 'iceberg-js', 'tslib']) {
    const file = name === '@supabase/phoenix' ? 'LICENSE.md' : name === 'tslib' ? 'LICENSE.txt' : 'LICENSE';
    notices += `\n===== ${name} =====\n${await readFile(resolve(projectRoot, `node_modules/${name}/${file}`), 'utf8')}\n`;
    if (name === 'tslib') notices += await readFile(resolve(projectRoot, 'node_modules/tslib/CopyrightNotice.txt'), 'utf8');
  }
  await writeFile(resolve(projectRoot, 'vendor/supabase/THIRD_PARTY_NOTICES.txt'), notices.replaceAll('\r\n', '\n').trimEnd() + '\n');
  const metadata = JSON.parse(await readFile(resolve(projectRoot, 'node_modules/@supabase/supabase-js/package.json'), 'utf8'));
  await writeFile(resolve(projectRoot, 'vendor/supabase/VERSION.txt'), `${metadata.version}\nBuilt with npm run vendor:cloud; see package-lock.json for dependencies.\n`);
}

function outputPath(value) {
  const path = resolve(projectRoot, value || 'dist');
  const insideRoot = relative(projectRoot, path);
  const containsRoot = relative(path, projectRoot);
  if (!insideRoot || (!containsRoot.startsWith('..') && !isAbsolute(containsRoot))) throw new Error('Build output must not replace the project or a parent directory.');
  if (!insideRoot.startsWith('..') && !isAbsolute(insideRoot) && !['dist', 'scratch'].includes(insideRoot.split(/[\\/]/)[0])) throw new Error('Use dist/, scratch/ or a directory outside the project for build output.');
  return path;
}

export async function buildSite({ outdir = 'dist', env = process.env, catalogRoot = projectRoot } = {}) {
  const cloud = publicCloudSettings(env);
  const course = publicCourseSettings(env, cloud);
  const output = outputPath(outdir);
  const catalog = await readCourseCatalog(catalogRoot);
  const data = course.mode === 'protected' ? protectedCatalog(catalog) : catalog;
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const name of ['index.html', 'style.css', 'app.js', 'pastpapers.js', 'learning.js', 'labs.js', 'math.js', 'progress-merge.js', 'progress-store.js', 'cloud.js', 'cloud.css', 'course.js', 'course.css', 'notes.js', 'notes.css', 'sticky-notes.js', 'sticky-notes.css', 'study-time.js', 'study-tools.js', 'study-tools.css', 'syllabus.pdf', 'papers', 'vendor']) await cp(resolve(projectRoot, name), resolve(output, name), { recursive: true });
  await mkdir(resolve(output, 'data'));
  for (const name of ['syllabus', 'questions', 'pyqs', 'lesson-questions', 'topic-coverage']) await writeFile(resolve(output, 'data', `${name}.json`), JSON.stringify(data[name]) + '\n');
  await cp(resolve(catalogRoot, 'data/papers.json'), resolve(output, 'data/papers.json'));
  await build({ ...options, outfile: resolve(output, 'vendor/supabase/supabase.js') });
  await writeFile(resolve(output, 'cloud-config.js'), `window.GATEWISE_CLOUD = ${JSON.stringify(cloud)};\n`);
  await writeFile(resolve(output, 'course-config.js'), `window.GATEWISE_COURSE = ${JSON.stringify(course)};\n`);
  return { output, cloud, course };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args[0] === '--vendor' && args.length === 1) {
      publicCloudSettings();
      await buildVendor();
    } else {
      if (args.length && (args[0] !== '--outdir' || args.length !== 2 || !args[1])) throw new Error('Usage: node scripts/build.mjs [--outdir directory] or --vendor.');
      const result = await buildSite({ outdir: args[1] });
      console.log(`Built ${result.output} in ${result.course.mode} course mode with ${result.cloud.url ? 'Supabase accounts and progress sync' : 'local guest mode (cloud variables not set)'}.`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
