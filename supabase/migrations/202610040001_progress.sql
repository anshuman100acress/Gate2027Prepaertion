-- Run once in Supabase SQL Editor, or use `supabase db push` with a linked project.
create table if not exists public.study_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 5242880),
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.study_progress enable row level security;
revoke all on public.study_progress from anon, authenticated;
grant select, insert, update on public.study_progress to authenticated;
create policy "Read own preparation" on public.study_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own preparation" on public.study_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own preparation" on public.study_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Compare-and-swap prevents simultaneous devices overwriting an unseen revision.
-- Security invoker retains RLS; the caller cannot choose another user's ID.
create or replace function public.save_study_progress(p_expected_revision bigint, p_data jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare saved_revision bigint;
begin
  if auth.uid() is null then raise exception 'Sign in to save progress' using errcode = '42501'; end if;
  if p_expected_revision = 0 then
    insert into public.study_progress (user_id, data, revision)
      values (auth.uid(), p_data, 1) on conflict (user_id) do nothing
      returning revision into saved_revision;
  else
    update public.study_progress set data = p_data, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = p_expected_revision
      returning revision into saved_revision;
  end if;
  return coalesce(saved_revision, -1);
end;
$$;
revoke all on function public.save_study_progress(bigint, jsonb) from public, anon;
grant execute on function public.save_study_progress(bigint, jsonb) to authenticated;
