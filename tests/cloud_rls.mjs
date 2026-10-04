// Execute the real migration in an embedded Postgres, with Supabase's auth API stubbed.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users(id uuid primary key, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  insert into auth.users(id) values ('${a}'), ('${b}');
`);
await db.exec(await readFile('supabase/migrations/202610040001_progress.sql', 'utf8'));
const identity = async uid => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || '']); await db.exec(`set role ${uid ? 'authenticated' : 'anon'}`); };
const save = async (revision, data) => (await db.query('select public.save_study_progress($1, $2::jsonb) as revision', [revision, JSON.stringify(data)])).rows[0].revision;
await identity(a);
assert.equal(Number(await save(0, { progress: { notes: { rank: 'private A' } } })), 1);
assert.equal(Number(await save(1, { progress: { notes: { rank: 'updated A' } } })), 2);
assert.equal(Number(await save(1, { progress: { notes: { rank: 'stale write' } } })), -1, 'stale revision must not overwrite');
assert.equal((await db.query('select data from public.study_progress')).rows[0].data.progress.notes.rank, 'updated A');
await assert.rejects(() => db.query('insert into public.study_progress(user_id, data) values ($1, $2::jsonb)', [b, '{}']), error => error.code === '42501');
await identity(b);
assert.equal((await db.query('select * from public.study_progress')).rows.length, 0, 'user B must not see A');
assert.equal((await db.query('update public.study_progress set data=\'{}\' where user_id=$1 returning user_id', [a])).rows.length, 0, 'user B must not update A');
assert.equal(Number(await save(0, { progress: { notes: { rank: 'private B' } } })), 1);
await assert.rejects(() => db.query('update public.study_progress set user_id=$1 where user_id=$2', [a, b]), error => error.code === '42501');
await assert.rejects(() => save(1, []), error => error.code === '23514');
await assert.rejects(() => save(1, { huge: 'x'.repeat(5242881) }), error => error.code === '23514');
await identity(null);
await assert.rejects(() => db.query('select * from public.study_progress'), error => error.code === '42501');
await assert.rejects(() => save(0, {}), error => error.code === '42501');
await db.exec('reset role');
await db.query('delete from auth.users where id=$1', [a]);
assert.equal((await db.query('select * from public.study_progress where user_id=$1', [a])).rows.length, 0, 'account deletion must delete cloud progress');
// Also execute the deploy-time isolation check itself using two remaining test users.
await db.query('insert into auth.users(id) values ($1)', [a]);
await db.exec(await readFile('supabase/tests/isolation.sql', 'utf8'));
await db.close();
console.log('Postgres RLS checks passed: owner-only read/write, anonymous denial, revision conflicts, payload constraints and deletion.');
