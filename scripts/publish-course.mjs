import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseAdmin, requireResult } from './course-admin.mjs';
import { courseSettings, DEFAULT_COURSE_TITLE, readCourseCatalog, courseRows } from './course-catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function publishCourse({ env = process.env, client, catalogRoot = root } = {}) {
  const { courseId } = courseSettings(env);
  const title = (env.GATEWISE_COURSE_TITLE || DEFAULT_COURSE_TITLE).trim();
  if (!title || title.length > 200 || /[\u0000-\u001f\u007f]/.test(title)) throw new Error('GATEWISE_COURSE_TITLE must contain 1–200 printable characters.');
  const catalog = await readCourseCatalog(catalogRoot);
  const rows = courseRows(catalog, courseId);
  const admin = client || courseAdmin(env);
  requireResult(await admin.from('courses').upsert({ id: courseId, title, enabled: true }, { onConflict: 'id' }), 'Course registration');
  // Each lesson carries its original payload and stable lesson ID; resources
  // remain arrays so the protected client can hydrate its existing banks.
  for (let offset = 0; offset < rows.lessons.length; offset += 12) {
    requireResult(await admin.from('course_lessons').upsert(rows.lessons.slice(offset, offset + 12), { onConflict: 'course_id,lesson_id' }), 'Lesson publication');
  }
  requireResult(await admin.from('course_resources').upsert(rows.resources, { onConflict: 'course_id,resource_id' }), 'Resource publication');
  return { courseId, lessons: rows.lessons.length, previews: catalog.previewIds.size, resources: rows.resources.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/publish-course.mjs (configuration is read from environment variables).');
    const result = await publishCourse();
    console.log(`Published ${result.courseId}: ${result.lessons} lessons (${result.previews} previews) and ${result.resources} resources.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
