-- Run in Supabase SQL Editor after creating at least TWO confirmed test users.
-- This transaction rolls back its data changes. Do not run on an empty Auth project.
begin;
do $$ begin
  if (select count(*) from auth.users) < 2 then raise exception 'Create two test users first'; end if;
end $$;
select set_config('gatewise.user_a', (select id::text from auth.users order by created_at limit 1), true);
select set_config('gatewise.user_b', (select id::text from auth.users order by created_at limit 1 offset 1), true);
select set_config('request.jwt.claim.sub', current_setting('gatewise.user_a'), true);
set local role authenticated;
select public.save_study_progress(0, '{"progress":{"name":"Isolation test A"}}');
do $$ begin
  if exists (select 1 from public.study_progress where user_id <> auth.uid()) then raise exception 'RLS leaked another user'; end if;
  begin
    insert into public.study_progress(user_id, data)
      values (current_setting('gatewise.user_b')::uuid, '{}');
    raise exception 'RLS allowed an insertion for another user';
  exception when insufficient_privilege then null;
  end;
  if public.save_study_progress(-999, '{}') <> -1 then raise exception 'Revision conflict was not rejected'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('gatewise.user_b'), true);
do $$ begin
  if exists (select 1 from public.study_progress where user_id = current_setting('gatewise.user_a')::uuid) then raise exception 'User B can read user A'; end if;
  update public.study_progress set data='{}' where user_id=current_setting('gatewise.user_a')::uuid;
  if found then raise exception 'User B can update user A'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.study_progress;
    raise exception 'Anonymous access allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
