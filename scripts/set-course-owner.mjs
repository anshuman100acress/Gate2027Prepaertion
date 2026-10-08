import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { courseAdmin, requireResult } from './course-admin.mjs';

export function ownerUserId(args) {
  if (args.length !== 2 || args[0] !== '--user' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args[1])) throw new Error('Usage: node scripts/set-course-owner.mjs --user <existing Supabase auth user UUID>.');
  return args[1].toLowerCase();
}

export async function assignCourseOwner(userId, { env = process.env, client } = {}) {
  const canonicalId = ownerUserId(['--user', userId]);
  const admin = client || courseAdmin(env);
  const data = requireResult(await admin.auth.admin.getUserById(canonicalId), 'Auth user verification');
  if (!data?.user?.id || data.user.id.toLowerCase() !== canonicalId) throw new Error('Auth user verification returned no matching user. No role was assigned.');
  const assigned = requireResult(await admin.rpc('assign_course_owner', { p_user_id: canonicalId }), 'Audited owner assignment');
  if (assigned?.userId !== canonicalId || assigned?.role !== 'owner') throw new Error('Owner assignment returned an unexpected result. Inspect the service-only audit before retrying.');
  return assigned;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const userId = ownerUserId(process.argv.slice(2));
    const assigned = await assignCourseOwner(userId);
    console.log(`Verified ${assigned.userId}; owner role ${assigned.changed ? 'assigned' : 'confirmed'} and audit recorded.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
