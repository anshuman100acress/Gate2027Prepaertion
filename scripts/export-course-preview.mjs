import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_COURSE_ID, readCourseCatalog, protectedCatalog } from './course-catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function exportCoursePreview({ catalogRoot = root, outdir } = {}) {
  if (!outdir) throw new Error('Choose a separate output folder for the public preview catalog.');
  const output = resolve(outdir);
  if (output === resolve(catalogRoot)) throw new Error('Do not replace the private authoring catalog with previews.');
  const catalog = await readCourseCatalog(catalogRoot);
  if (catalog.publicOnly) throw new Error('Export course previews from the private authoring workspace.');
  const preview = protectedCatalog(catalog);
  const info = {
    kind: 'protected-preview', courseId: DEFAULT_COURSE_ID,
    lessonCount: catalog.syllabus.flatMap(s => s.lessons).length,
    questionCount: catalog.questions.length + catalog.pyqs.length + catalog['lesson-questions'].length,
    pyqCount: catalog.pyqs.length
  };
  await mkdir(resolve(output, 'data'), { recursive: true });
  for (const [name, data] of Object.entries(preview)) {
    await writeFile(resolve(output, 'data', `${name}.json`), JSON.stringify(data) + '\n');
  }
  const papers = JSON.parse(await readFile(resolve(catalogRoot, 'data/papers.json'), 'utf8'));
  await writeFile(resolve(output, 'data/papers.json'), JSON.stringify(papers) + '\n');
  await writeFile(resolve(output, 'data/catalog-info.json'), JSON.stringify(info, null, 2) + '\n');
  return { output, ...info };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--outdir') throw new Error('Usage: node scripts/export-course-preview.mjs --outdir /separate/release/folder');
    const result = await exportCoursePreview({ outdir: args[1] });
    console.log(`Exported public previews to ${result.output}: 3 lessons and 10 sample questions, including 1 PYQ MCQ.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
