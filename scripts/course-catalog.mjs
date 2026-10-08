import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const DEFAULT_COURSE_ID = 'gate-cs-2027';
export const DEFAULT_COURSE_TITLE = 'GATE CS 2027';
export const DEFAULT_PRICE_MINOR = 49900;
export const DURATION_MONTHS = 12;

export function courseSettings(env = process.env) {
  const mode = (env.GATEWISE_COURSE_MODE || 'open').trim();
  if (!['open', 'protected'].includes(mode)) throw new Error('GATEWISE_COURSE_MODE must be open or protected.');
  const courseId = (env.GATEWISE_COURSE_ID || DEFAULT_COURSE_ID).trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(courseId)) throw new Error('GATEWISE_COURSE_ID must use 1–80 lowercase letters, digits, underscores or hyphens.');
  const rawPrice = (env.GATEWISE_COURSE_PRICE_MINOR || String(DEFAULT_PRICE_MINOR)).trim();
  if (!/^\d+$/.test(rawPrice)) throw new Error('GATEWISE_COURSE_PRICE_MINOR must be a positive integer in paise.');
  const priceMinor = Number(rawPrice);
  if (!Number.isSafeInteger(priceMinor) || priceMinor < 1 || priceMinor > 100000000) throw new Error('GATEWISE_COURSE_PRICE_MINOR must be between 1 and 100000000 paise.');
  return { mode, courseId, priceMinor, currency: 'INR', durationMonths: DURATION_MONTHS };
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
  const values = await Promise.all(names.map(name => readFile(resolve(root, 'data', `${name}.json`), 'utf8').then(JSON.parse)));
  return validateCourseCatalog(Object.fromEntries(names.map((name, i) => [name, values[i]])));
}

export function validateCourseCatalog(catalog) {
  const subjects = list(catalog.syllabus, 'syllabus');
  const ids = new Set(), subjectIds = new Set(), previewIds = new Set();
  if (!subjects.length) throw new Error('Course catalog must contain subjects.');
  for (const subject of subjects) {
    if (!Number.isInteger(subject.id) || subjectIds.has(subject.id) || typeof subject.name !== 'string') throw new Error('Course catalog subject IDs and names are invalid.');
    subjectIds.add(subject.id);
    const lessons = list(subject.lessons, 'lessons');
    if (!lessons.length) throw new Error('Each subject must contain a preview lesson.');
    for (const lesson of lessons) {
      if (typeof lesson.id !== 'string' || !lesson.id || ids.has(lesson.id) || typeof lesson.title !== 'string') throw new Error('Course catalog lesson IDs and titles are invalid.');
      ids.add(lesson.id);
      list(lesson.topics, 'lesson topics');
      list(lesson.examples, 'lesson examples');
      list(lesson.tutorials || [], 'lesson tutorials');
    }
    previewIds.add(lessons[0].id);
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
      if (previewIds.has(lesson.id)) return { ...structuredClone(lesson), isPreview: true };
      return {
        id: lesson.id, title: lesson.title, topics: [...lesson.topics], intuition: shortIntuition(lesson.intuition),
        minutes: lesson.minutes, workedExampleCount: workedExampleCount(lesson), locked: true, isPreview: false,
        sections: [], examples: [], tutorials: [], checks: [], revision: [], pitfalls: [], method: '',
        topicCoverage: Object.fromEntries(Object.entries(lesson.topicCoverage || {}).map(([topic, ref]) => [topic, topicReference(ref)]))
      };
    })
  }));
  const counts = new Map();
  const questions = catalog.questions.filter(question => {
    const count = counts.get(question.subject) || 0;
    counts.set(question.subject, count + 1);
    return count < 2;
  });
  const pyqs = catalog.pyqs.filter(question => question.verified === true);
  const lessonQuestions = catalog['lesson-questions'].filter(question => previewIds.has(question.lesson));
  const topicCoverage = catalog['topic-coverage'].map(row => ({
    ...topicReference(row), ...(typeof row.topic === 'string' ? { topic: row.topic } : {}),
    ...(Array.isArray(row.exampleTypes) ? { exampleTypes: row.exampleTypes.filter(kind => ['fundamental', 'application', 'trap'].includes(kind)) } : {})
  }));
  return { syllabus, questions, pyqs, 'lesson-questions': lessonQuestions, 'topic-coverage': topicCoverage };
}

export function courseRows(catalog, courseId) {
  return {
    lessons: catalog.syllabus.flatMap(subject => subject.lessons.map(lesson => ({
      course_id: courseId, lesson_id: lesson.id, subject_id: subject.id,
      payload: lesson, is_preview: catalog.previewIds.has(lesson.id)
    }))),
    resources: ['questions', 'pyqs', 'lesson-questions'].map(resourceId => ({ course_id: courseId, resource_id: resourceId, payload: catalog[resourceId] }))
  };
}
