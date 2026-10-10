import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import offer from '../course-offer.js';

export const DEFAULT_COURSE_ID = 'gate-cs-2027';
export const DEFAULT_COURSE_TITLE = 'GATE CS 2027';
export const DEFAULT_PRICE_MINOR = 49900;
export const DURATION_MONTHS = 12;
export const FREE_PREVIEW_IDS = ['0-propositions', '3-c-memory', '10-quantitative'];
export const FREE_PRACTICE_LIMIT = 10;
export const FREE_PYQ_ID = 'pyq-2026_CS1-GA-3';
const PREMIUM_LESSON_FIELDS = ['studyCards', 'examClinic', 'premiumTopics'];

function previewLesson(lesson) {
  const preview = structuredClone(lesson);
  for (const key of PREMIUM_LESSON_FIELDS) delete preview[key];
  return preview;
}

export function courseSettings(env = process.env, now = Date.now()) {
  const mode = (env.GATEWISE_COURSE_MODE || 'open').trim();
  if (!['open', 'protected'].includes(mode)) throw new Error('GATEWISE_COURSE_MODE must be open or protected.');
  const courseId = (env.GATEWISE_COURSE_ID || DEFAULT_COURSE_ID).trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(courseId)) throw new Error('GATEWISE_COURSE_ID must use 1–80 lowercase letters, digits, underscores or hyphens.');
  return { mode, courseId, ...offer.quote(offer.fromEnv(env), now), currency: 'INR', durationMonths: DURATION_MONTHS };
}

export function publicCloudSettings(env = process.env) {
  const url = (env.GATEWISE_SUPABASE_URL || '').trim();
  const publishableKey = (env.GATEWISE_SUPABASE_PUBLISHABLE_KEY || '').trim();
  if (!!url !== !!publishableKey) throw new Error('Set both GATEWISE_SUPABASE_URL and GATEWISE_SUPABASE_PUBLISHABLE_KEY, or neither for guest mode.');
  if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) throw new Error('Use your Supabase project HTTPS URL.');
  if (publishableKey && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    let role;
    try { role = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url')).role; } catch {}
    if (publishableKey.split('.').length !== 3 || role !== 'anon') throw new Error('Use a publishable key or legacy anon key. Never use a secret/service-role key.');
  }
  return { url: url.replace(/\/$/, ''), publishableKey };
}

export function publicCourseSettings(env = process.env, cloud = publicCloudSettings(env)) {
  const settings = courseSettings(env);
  if (settings.mode === 'protected' && (!cloud.url || !cloud.publishableKey)) throw new Error('Protected mode requires GATEWISE_SUPABASE_URL and GATEWISE_SUPABASE_PUBLISHABLE_KEY.');
  const paymentKeys = ['GATEWISE_RAZORPAY_KEY_ID', 'GATEWISE_RAZORPAY_KEY_SECRET', 'GATEWISE_RAZORPAY_WEBHOOK_SECRET', 'GATEWISE_SUPABASE_SERVICE_ROLE_KEY'];
  const checkoutEnabled = settings.mode === 'protected' && paymentKeys.every(name => typeof env[name] === 'string' && !!env[name].trim())
    && /^rzp_(test|live)_[A-Za-z0-9]+$/.test(env.GATEWISE_RAZORPAY_KEY_ID.trim())
    && isServiceRoleKey(env.GATEWISE_SUPABASE_SERVICE_ROLE_KEY.trim());
  return { ...settings, checkoutEnabled };
}

export function isServiceRoleKey(key) {
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return true;
  try { return key.split('.').length === 3 && JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role'; } catch { return false; }
}

export function serviceCloudSettings(env = process.env) {
  const url = (env.GATEWISE_SUPABASE_URL || '').trim();
  const serviceRoleKey = (env.GATEWISE_SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) throw new Error('Set GATEWISE_SUPABASE_URL to your Supabase project HTTPS URL.');
  if (!isServiceRoleKey(serviceRoleKey)) throw new Error('Set GATEWISE_SUPABASE_SERVICE_ROLE_KEY to a server secret/service-role key.');
  return { url: url.replace(/\/$/, ''), serviceRoleKey };
}

const list = (value, name) => {
  if (!Array.isArray(value)) throw new Error(`Course catalog ${name} must be an array.`);
  return value;
};

export async function readCourseCatalog(root) {
  const names = ['syllabus', 'questions', 'pyqs', 'lesson-questions', 'topic-coverage'];
  const [values, info] = await Promise.all([
    Promise.all(names.map(name => readFile(resolve(root, 'data', `${name}.json`), 'utf8').then(JSON.parse))),
    readFile(resolve(root, 'data/catalog-info.json'), 'utf8').then(JSON.parse).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    })
  ]);
  const catalog = validateCourseCatalog(Object.fromEntries(names.map((name, i) => [name, values[i]])));
  if (info !== null) {
    validatePublicCatalog(catalog, info);
    catalog.publicOnly = true;
    catalog.info = info;
  }
  return catalog;
}

export function validatePublicCatalog(catalog, info) {
  if (info?.kind !== 'protected-preview' || info.courseId !== DEFAULT_COURSE_ID
      || !Number.isSafeInteger(info.questionCount) || info.questionCount < FREE_PRACTICE_LIMIT
      || !Number.isSafeInteger(info.pyqCount) || info.pyqCount < 1
      || info.pyqCount > info.questionCount
      || info.lessonCount !== catalog.syllabus.flatMap(s => s.lessons).length) {
    throw new Error('The public preview catalog metadata is invalid.');
  }
  const expected = protectedCatalog(catalog);
  if (catalog.syllabus.some(s => s.lessons.some(l => l.premiumPreviewLessons !== undefined))) {
    throw new Error('The public release contains restricted preview supplements.');
  }
  for (const name of ['syllabus', 'questions', 'pyqs', 'lesson-questions', 'topic-coverage']) {
    if (JSON.stringify(catalog[name]) !== JSON.stringify(expected[name])) {
      throw new Error(`The public release contains restricted ${name} content. Export fresh previews from the private authoring workspace.`);
    }
  }
  if (catalog.questions.length + catalog.pyqs.length + catalog['lesson-questions'].length !== FREE_PRACTICE_LIMIT) {
    throw new Error('The public release must contain exactly 10 sample questions.');
  }
}

export function validateCourseCatalog(catalog) {
  const subjects = list(catalog.syllabus, 'syllabus');
  const ids = new Set(), subjectIds = new Set(), previewIds = new Set();
  if (!subjects.length) throw new Error('Course catalog must contain subjects.');
  for (const subject of subjects) {
    if (!Number.isInteger(subject.id) || subjectIds.has(subject.id) || typeof subject.name !== 'string') throw new Error('Course catalog subject IDs and names are invalid.');
    subjectIds.add(subject.id);
    const lessons = list(subject.lessons, 'lessons');
    if (!lessons.length) throw new Error('Each subject must contain lessons.');
    for (const lesson of lessons) {
      if (typeof lesson.id !== 'string' || !lesson.id || ids.has(lesson.id) || typeof lesson.title !== 'string') throw new Error('Course catalog lesson IDs and titles are invalid.');
      ids.add(lesson.id);
      list(lesson.topics, 'lesson topics');
      list(lesson.examples, 'lesson examples');
      list(lesson.tutorials || [], 'lesson tutorials');
    }
  }
  for (const id of FREE_PREVIEW_IDS) {
    if (!ids.has(id)) throw new Error('The course is missing a configured free preview.');
    previewIds.add(id);
  }
  for (const resource of ['questions', 'pyqs', 'lesson-questions']) {
    const rows = list(catalog[resource], resource), seen = new Set();
    for (const row of rows) {
      if (!subjectIds.has(row.subject) || row.id === undefined || seen.has(row.id)) throw new Error(`Course catalog ${resource} IDs or subject references are invalid.`);
      if (resource === 'lesson-questions' && !ids.has(row.lesson)) throw new Error('Course checks must reference known lessons.');
      seen.add(row.id);
    }
  }
  list(catalog['topic-coverage'], 'topic coverage');
  return { ...catalog, previewIds };
}

export function workedExampleCount(lesson) {
  return lesson.examples.length + (lesson.tutorials || []).reduce((n, tutorial) => n + 1 + (tutorial.depth || []).reduce((m, pack) => m + pack.examples.length, 0), 0);
}

function topicReference(value) {
  const out = {};
  for (const key of ['lesson', 'targetLesson', 'tutorial', 'anchor', 'studyAnchor']) if (typeof value?.[key] === 'string') out[key] = value[key];
  return out;
}

function shortIntuition(value) {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  if (text.length <= 160) return text;
  const prefix = text.slice(0, 157);
  return prefix.slice(0, prefix.lastIndexOf(' ') > 100 ? prefix.lastIndexOf(' ') : prefix.length) + '…';
}

export function protectedCatalog(catalog) {
  const { previewIds } = catalog;
  const syllabus = catalog.syllabus.map(subject => ({
    id: subject.id, name: subject.name, icon: subject.icon, description: subject.description,
    lessons: subject.lessons.map(lesson => {
      if (previewIds.has(lesson.id)) {
        return { ...previewLesson(lesson), isPreview: true };
      }
      return {
        id: lesson.id, title: lesson.title, topics: [...lesson.topics], intuition: shortIntuition(lesson.intuition),
        minutes: lesson.minutes, workedExampleCount: Number.isSafeInteger(lesson.workedExampleCount) ? lesson.workedExampleCount : workedExampleCount(lesson), locked: true, isPreview: false,
        sections: [], examples: [], tutorials: [], checks: [], revision: [], pitfalls: [], method: '',
        topicCoverage: Object.fromEntries(Object.entries(lesson.topicCoverage || {}).map(([topic, ref]) => [topic, topicReference(ref)]))
      };
    })
  }));
  const lessonQuestions = catalog['lesson-questions'].filter(question => previewIds.has(question.lesson));
  const pyqs = catalog.pyqs.filter(q => q.id === FREE_PYQ_ID);
  if (pyqs.length !== 1) throw new Error('The configured free PYQ sample is missing.');
  const sampleSubjects = [0, 3, 10, 1, 2, 4, 5, 6, 7, 8, 9];
  const questions = sampleSubjects.map(subject => catalog.questions.find(q => q.subject === subject && !q.premium))
    .filter(Boolean).slice(0, Math.max(0, FREE_PRACTICE_LIMIT - lessonQuestions.length - pyqs.length));
  const topicCoverage = catalog['topic-coverage'].map(row => ({
    ...topicReference(row), ...(typeof row.topic === 'string' ? { topic: row.topic } : {}),
    ...(Array.isArray(row.exampleTypes) ? { exampleTypes: row.exampleTypes.filter(kind => ['fundamental', 'application', 'trap'].includes(kind)) } : {})
  }));
  return { syllabus, questions, pyqs, 'lesson-questions': lessonQuestions, 'topic-coverage': topicCoverage };
}

export function courseRows(catalog, courseId) {
  if (catalog.publicOnly) throw new Error('A preview-only checkout cannot publish the full course. Use the private authoring workspace; the paid content already lives in Supabase.');
  // Preview rows are readable through RLS even without a pass. Keep their paid
  // additions on a restricted row in the same subject; paid hydration restores
  // them by lesson ID. This also keeps all resources as their existing arrays.
  const lessons = catalog.syllabus.flatMap(subject => {
    const supplements = subject.lessons.filter(l => catalog.previewIds.has(l.id)).map(l => ({
      id: l.id, ...Object.fromEntries(PREMIUM_LESSON_FIELDS.filter(key => l[key] !== undefined).map(key => [key, structuredClone(l[key])]))
    }));
    const restricted = subject.lessons.find(l => !catalog.previewIds.has(l.id));
    if (supplements.length && !restricted) throw new Error('Premium preview additions require a restricted lesson in the same subject.');
    return subject.lessons.map(lesson => ({
      course_id: courseId, lesson_id: lesson.id, subject_id: subject.id,
      payload: catalog.previewIds.has(lesson.id) ? previewLesson(lesson) : {
        ...lesson, ...(lesson.id === restricted?.id && supplements.length ? { premiumPreviewLessons: supplements } : {})
      }, is_preview: catalog.previewIds.has(lesson.id)
    }));
  });
  return {
    lessons,
    resources: ['questions', 'pyqs', 'lesson-questions'].map(resourceId => ({ course_id: courseId, resource_id: resourceId, payload: catalog[resourceId] }))
  };
}
