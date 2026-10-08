-- Course content access and trusted payment confirmation.
-- Safe to rerun. Run through the Supabase SQL Editor or a linked migration tool.
-- Existing study_progress policies and RPCs are intentionally not altered here.
begin;

create table if not exists public.courses (
  id text primary key check (char_length(id) between 1 and 128),
  title text not null check (char_length(title) between 1 and 256),
  enabled boolean not null default true
);

create table if not exists public.account_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'learner' check (role in ('learner', 'owner'))
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Financial orders prevent accidental course deletion. Disable a course instead.
  course_id text not null references public.courses(id) on delete restrict,
  amount integer not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  duration_months integer not null default 12 check (duration_months = 12),
  provider_order_id text unique
    check (provider_order_id is null or char_length(provider_order_id) between 1 and 256),
  provider_payment_id text unique
    check (provider_payment_id is null or char_length(provider_payment_id) between 1 and 256),
  status text not null default 'created' check (status in ('created', 'paid', 'refunded', 'failed')),
  created_at timestamptz not null default now(),
  unique (id, user_id, course_id),
  check (status not in ('paid', 'refunded') or
         (provider_order_id is not null and provider_payment_id is not null))
);

create table if not exists public.course_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  valid_from timestamptz not null,
  valid_until timestamptz not null,
  revoked_at timestamptz,
  source_order uuid unique,
  check (valid_until > valid_from),
  foreign key (source_order, user_id, course_id)
    references public.payment_orders(id, user_id, course_id) on delete cascade
);

create table if not exists public.payment_events (
  event_id text primary key check (char_length(event_id) between 1 and 256),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  provider_order_id text not null check (char_length(provider_order_id) between 1 and 256),
  provider_payment_id text not null check (char_length(provider_payment_id) between 1 and 256),
  event_kind text not null check (event_kind in ('captured', 'refunded')),
  created_at timestamptz not null default now()
);

create table if not exists public.course_lessons (
  course_id text not null references public.courses(id) on delete cascade,
  lesson_id text not null check (char_length(lesson_id) between 1 and 256),
  subject_id integer not null check (subject_id >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  is_preview boolean not null default false,
  primary key (course_id, lesson_id)
);

create table if not exists public.course_resources (
  course_id text not null references public.courses(id) on delete cascade,
  resource_id text not null check (resource_id in ('questions', 'pyqs', 'lesson-questions')),
  payload jsonb not null check (jsonb_typeof(payload) in ('array', 'object')),
  primary key (course_id, resource_id)
);

create table if not exists public.access_audit (
  id bigint generated always as identity primary key,
  action text not null check (char_length(action) between 1 and 128),
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  course_id text references public.courses(id) on delete set null,
  order_id uuid references public.payment_orders(id) on delete set null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists course_entitlements_active_lookup
  on public.course_entitlements (user_id, course_id, valid_until) where revoked_at is null;
create index if not exists payment_orders_user_course
  on public.payment_orders (user_id, course_id, created_at);
create index if not exists payment_events_provider_order
  on public.payment_events (provider_order_id);
create index if not exists access_audit_subject_created
  on public.access_audit (subject_user_id, created_at);

insert into public.courses (id, title, enabled)
  values ('gate-cs-2027', 'GATE CS 2027', true)
  on conflict (id) do nothing;

alter table public.courses enable row level security;
alter table public.account_roles enable row level security;
alter table public.course_entitlements enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_resources enable row level security;
alter table public.access_audit enable row level security;

-- Client roles only receive the narrow read privileges governed by the policies below.
revoke all on table public.courses, public.account_roles, public.course_entitlements,
  public.payment_orders, public.payment_events, public.course_lessons,
  public.course_resources, public.access_audit from public, anon, authenticated;
grant select on table public.courses, public.course_lessons, public.course_resources to anon, authenticated;
grant select on table public.account_roles, public.course_entitlements, public.payment_orders to authenticated;
grant all on table public.courses, public.account_roles, public.course_entitlements,
  public.payment_orders, public.payment_events, public.course_lessons,
  public.course_resources, public.access_audit to service_role;
revoke all on sequence public.access_audit_id_seq from public, anon, authenticated;
grant usage, select on sequence public.access_audit_id_seq to service_role;

-- All identity comes from the authenticated request. There is no user-id argument.
create or replace function public.has_course_access(p_course_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.courses c where c.id = p_course_id and c.enabled
    )
    and (
      exists (
        select 1 from public.account_roles r
          where r.user_id = auth.uid() and r.role = 'owner'
      )
      or exists (
        select 1 from public.course_entitlements e
          where e.user_id = auth.uid() and e.course_id = p_course_id
            and e.revoked_at is null and e.valid_from <= statement_timestamp()
            and e.valid_until > statement_timestamp()
      )
    );
$$;
revoke all on function public.has_course_access(text) from public, anon, authenticated;
grant execute on function public.has_course_access(text) to anon, authenticated, service_role;

create or replace function public.course_access(p_course_id text)
returns jsonb
language plpgsql stable security definer set search_path = '' set timezone = 'UTC'
as $$
declare
  v_user_id uuid := auth.uid();
  v_owner boolean := false;
  v_valid_until timestamptz;
begin
  select exists (
    select 1 from public.account_roles r where r.user_id = v_user_id and r.role = 'owner'
  ) into v_owner;
  if not v_owner then
    select max(e.valid_until) into v_valid_until
      from public.course_entitlements e
      where e.user_id = v_user_id and e.course_id = p_course_id
        and e.revoked_at is null and e.valid_from <= statement_timestamp()
        and e.valid_until > statement_timestamp();
  end if;
  return jsonb_build_object(
    'courseId', p_course_id,
    'role', case when v_owner then 'owner' else 'learner' end,
    'hasAccess', public.has_course_access(p_course_id),
    'validUntil', v_valid_until
  );
end;
$$;
revoke all on function public.course_access(text) from public, anon, authenticated;
grant execute on function public.course_access(text) to anon, authenticated, service_role;

drop policy if exists "Public course metadata" on public.courses;
create policy "Public course metadata" on public.courses
  for select to anon, authenticated using (true);

drop policy if exists "Read own account role" on public.account_roles;
create policy "Read own account role" on public.account_roles
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Read own course entitlement" on public.course_entitlements;
create policy "Read own course entitlement" on public.course_entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Read own payment orders" on public.payment_orders;
create policy "Read own payment orders" on public.payment_orders
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Preview or authorized course lesson" on public.course_lessons;
create policy "Preview or authorized course lesson" on public.course_lessons
  for select to anon, authenticated using (
    exists (select 1 from public.courses c where c.id = course_id and c.enabled)
    and (is_preview or public.has_course_access(course_id))
  );

drop policy if exists "Authorized course resources" on public.course_resources;
create policy "Authorized course resources" on public.course_resources
  for select to anon, authenticated using (
    exists (select 1 from public.courses c where c.id = course_id and c.enabled)
    and public.has_course_access(course_id)
  );

-- Service-role-only: owner assignment and its audit succeed or fail together.
-- The server script additionally confirms the UUID using auth.admin.getUserById.
create or replace function public.assign_course_owner(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_previous_role text;
begin
  if p_user_id is null then
    raise exception 'A user UUID is required' using errcode = '22023';
  end if;
  -- Serialize assignments for this account, including its first role row.
  perform 1 from auth.users u where u.id = p_user_id for update;
  if not found then
    raise exception 'Auth user does not exist' using errcode = 'P0002';
  end if;
  select r.role into v_previous_role from public.account_roles r where r.user_id = p_user_id;
  insert into public.account_roles (user_id, role) values (p_user_id, 'owner')
    on conflict (user_id) do update set role = excluded.role;
  insert into public.access_audit (action, actor_user_id, subject_user_id, details)
    values ('owner_assigned', auth.uid(), p_user_id,
      jsonb_build_object('previousRole', v_previous_role, 'role', 'owner', 'source', 'service_role'));
  return jsonb_build_object('userId', p_user_id, 'role', 'owner',
    'changed', v_previous_role is distinct from 'owner');
end;
$$;
revoke all on function public.assign_course_owner(uuid) from public, anon, authenticated;
grant execute on function public.assign_course_owner(uuid) to service_role;

-- The webhook has already verified the provider signature and payment entity.
-- This RPC then verifies that entity against server-created order data, atomically.
-- p_order_id is the provider order ID, not the internal UUID.
create or replace function public.apply_course_payment(
  p_event_id text,
  p_payload_hash text,
  p_order_id text,
  p_payment_id text,
  p_amount integer,
  p_currency text,
  p_event_kind text
)
returns jsonb
language plpgsql security definer set search_path = '' set timezone = 'UTC'
as $$
declare
  v_order public.payment_orders%rowtype;
  v_event public.payment_events%rowtype;
  v_inserted_event text;
  v_duplicate boolean := false;
  v_confirmed_at timestamptz;
  v_owner boolean := false;
  v_enabled boolean := false;
  v_has_access boolean := false;
  v_valid_until timestamptz;
begin
  if p_event_id is null or char_length(p_event_id) not between 1 and 256
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_order_id is null or char_length(p_order_id) not between 1 and 256
    or p_payment_id is null or char_length(p_payment_id) not between 1 and 256
    or p_amount is null or p_amount <= 0
    or p_currency is null or p_currency !~ '^[A-Z]{3}$'
    or p_event_kind is null or p_event_kind not in ('captured', 'refunded') then
    raise exception 'Invalid payment event parameters' using errcode = '22023';
  end if;

  select o.* into v_order from public.payment_orders o
    where o.provider_order_id = p_order_id for update;
  if not found then
    raise exception 'Unknown provider order' using errcode = 'P0002';
  end if;
  if v_order.amount <> p_amount or v_order.currency <> p_currency then
    raise exception 'Payment amount or currency does not match the trusted order' using errcode = '22023';
  end if;
  if v_order.provider_payment_id is not null and v_order.provider_payment_id <> p_payment_id then
    raise exception 'Payment ID does not match the bound order payment' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.payment_orders o
      where o.provider_payment_id = p_payment_id and o.id <> v_order.id
  ) then
    raise exception 'Payment ID is already bound to another order' using errcode = '23505';
  end if;

  -- A conflicting concurrent insert waits for its transaction, then resolves here.
  insert into public.payment_events
    (event_id, payload_hash, provider_order_id, provider_payment_id, event_kind)
    values (p_event_id, p_payload_hash, p_order_id, p_payment_id, p_event_kind)
    on conflict (event_id) do nothing returning event_id into v_inserted_event;
  if v_inserted_event is null then
    select e.* into v_event from public.payment_events e where e.event_id = p_event_id;
    if not found or v_event.payload_hash <> p_payload_hash
      or v_event.provider_order_id <> p_order_id
      or v_event.provider_payment_id <> p_payment_id
      or v_event.event_kind <> p_event_kind then
      raise exception 'Payment event ID conflicts with a different event fingerprint or identity' using errcode = '23505';
    end if;
    v_duplicate := true;
  else
    v_confirmed_at := clock_timestamp();
    if p_event_kind = 'refunded' then
      -- Any confirmed refund revokes this order's pass. Refund stays terminal even
      -- when its callback arrives before capture, or a later capture is retried.
      update public.payment_orders set provider_payment_id = p_payment_id, status = 'refunded'
        where id = v_order.id;
      update public.course_entitlements
        set revoked_at = coalesce(revoked_at, v_confirmed_at) where source_order = v_order.id;
      insert into public.access_audit
        (action, actor_user_id, subject_user_id, course_id, order_id, details)
        values ('payment_refunded', auth.uid(), v_order.user_id, v_order.course_id, v_order.id,
          jsonb_build_object('eventId', p_event_id, 'paymentId', p_payment_id,
            'amount', p_amount, 'currency', p_currency));
    elsif v_order.status <> 'refunded' and v_order.status <> 'paid' then
      update public.payment_orders set provider_payment_id = p_payment_id, status = 'paid'
        where id = v_order.id;
      insert into public.course_entitlements
        (user_id, course_id, valid_from, valid_until, source_order)
        values (v_order.user_id, v_order.course_id, v_confirmed_at,
          v_confirmed_at + make_interval(months => v_order.duration_months), v_order.id)
        on conflict (source_order) do nothing;
      insert into public.access_audit
        (action, actor_user_id, subject_user_id, course_id, order_id, details)
        values ('payment_captured', auth.uid(), v_order.user_id, v_order.course_id, v_order.id,
          jsonb_build_object('eventId', p_event_id, 'paymentId', p_payment_id,
            'amount', p_amount, 'currency', p_currency, 'durationMonths', v_order.duration_months));
    else
      -- New provider event IDs can describe the same payment. They are recorded,
      -- but paid passes never extend and refunded orders never regain access.
      insert into public.access_audit
        (action, actor_user_id, subject_user_id, course_id, order_id, details)
        values ('payment_capture_ignored', auth.uid(), v_order.user_id, v_order.course_id, v_order.id,
          jsonb_build_object('eventId', p_event_id, 'paymentId', p_payment_id,
            'terminalStatus', v_order.status));
    end if;
  end if;

  select o.* into v_order from public.payment_orders o where o.id = v_order.id;
  select exists (
    select 1 from public.account_roles r where r.user_id = v_order.user_id and r.role = 'owner'
  ) into v_owner;
  select exists (
    select 1 from public.courses c where c.id = v_order.course_id and c.enabled
  ) into v_enabled;
  if not v_owner then
    select max(e.valid_until) into v_valid_until from public.course_entitlements e
      where e.user_id = v_order.user_id and e.course_id = v_order.course_id
        and e.revoked_at is null and e.valid_from <= clock_timestamp()
        and e.valid_until > clock_timestamp();
  end if;
  v_has_access := v_enabled and (v_owner or v_valid_until is not null);
  return jsonb_build_object(
    'orderId', v_order.id, 'courseId', v_order.course_id, 'userId', v_order.user_id,
    'status', v_order.status, 'hasAccess', v_has_access,
    'validUntil', v_valid_until, 'duplicate', v_duplicate
  );
end;
$$;
revoke all on function public.apply_course_payment(text, text, text, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_course_payment(text, text, text, text, integer, text, text)
  to service_role;

commit;
