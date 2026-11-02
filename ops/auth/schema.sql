-- ============================================================================
-- 통합 회원 DB (Supabase) — QURATOR · Perpline · LUFT · 인생준준 · 체인브리프 공용
-- 2026-11-02 · 실행: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣기 → Run (한 번만)
-- 다시 실행해도 안전하도록 IF NOT EXISTS / CREATE OR REPLACE 를 썼다.
--
-- 구조
--   profiles             계정 1개 = 1행 (auth.users 와 같은 id). 최초 가입 사이트·출처
--   memberships          사이트별 가입 기록 (user_id, site) — 약관·개인정보 동의 일시·버전, UTM
--   marketing_consents   광고성 정보 수신 동의 '원장' — 채널별 변경을 덮어쓰지 않고 행 추가
--   marketing_consent_status (뷰) 채널별 현재 상태 + 2년 재확인 기한
--   perpline_uids        Perpline 거래소 UID 등록 (페이백 확인용)
--   qurator_subscriptions QURATOR 구독 (web/iap) — 결제 서버(서비스 롤)만 쓴다
--   luft_orders          (나중) 회원 주문 연결 — 비회원 주문은 계속 허용
--
-- 원칙
--   · 모든 테이블 RLS ON. 로그인한 본인 행만 읽는다. 쓰기는 아래 RPC(security definer)로만.
--   · 동의 일시는 브라우저가 아니라 DB 시각 now() 로 기록한다(위조 방지).
--   · IP·User-Agent 는 원문을 저장하지 않고 솔트를 섞은 SHA-256 해시만 저장한다.
--   · 마케팅 발송 시스템(ops/crm, public/crm — 별도 담당)은 marketing_consent_status 뷰를 서비스 롤로 읽는다.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- 내부 전용 스키마 (API 로 노출되지 않음): 해시 솔트
create schema if not exists sa_private;
revoke all on schema sa_private from public, anon, authenticated;
create table if not exists sa_private.salt (id int primary key default 1 check (id = 1), v text not null);
insert into sa_private.salt (id, v) values (1, encode(extensions.gen_random_bytes(32), 'hex')) on conflict (id) do nothing;

-- 허용 사이트 목록 (사이트를 추가하면 이 함수만 고친다)
create or replace function public.sa_valid_site(s text) returns boolean
language sql immutable as $$ select s in ('qurator','perpline','luft','lifejunjun','chainbrief') $$;

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text,                                   -- auth.users 이메일 사본 (CRM 발송용, 트리거로 동기화)
  display_name   text,
  first_site     text check (first_site is null or public.sa_valid_site(first_site)),
  first_source   text,                                   -- 최초 가입 출처 (utm_source / r / referral / direct)
  first_utm      jsonb not null default '{}'::jsonb,
  first_provider text,                                   -- google | kakao | apple | email | naver
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. memberships — 사이트별 가입 기록 + 필수 동의
-- ---------------------------------------------------------------------------
create table if not exists public.memberships (
  user_id            uuid not null references auth.users (id) on delete cascade,
  site               text not null check (public.sa_valid_site(site)),
  joined_at          timestamptz not null default now(),
  source             text,
  utm                jsonb not null default '{}'::jsonb,
  provider           text,
  terms_version      text not null,
  terms_agreed_at    timestamptz not null,
  privacy_version    text not null,
  privacy_agreed_at  timestamptz not null,
  age14_confirmed_at timestamptz not null,               -- 만 14세 이상 확인 (미만은 가입 불가 — 법정대리인 동의 절차 없음)
  last_seen_at       timestamptz not null default now(),
  primary key (user_id, site)
);
create index if not exists memberships_site_idx on public.memberships (site, joined_at desc);

-- ---------------------------------------------------------------------------
-- 3. marketing_consents — 광고성 정보 수신 동의 원장 (append-only)
--    정보통신망법 제50조: 사전 동의 · 2년마다 확인(시행령 제62조의3) · 처리결과 통지 · 수신거부 즉시 반영
-- ---------------------------------------------------------------------------
create table if not exists public.marketing_consents (
  id                   bigint generated always as identity primary key,
  user_id              uuid not null references auth.users (id) on delete cascade,
  channel              text not null check (channel in ('email','kakao','sms','night')),  -- night = 야간(21~08시) 수신
  granted              boolean not null,
  granted_at           timestamptz,                      -- granted=true 인 행: 동의 시각
  revoked_at           timestamptz,                      -- granted=false 인 행: 철회(수신거부) 시각
  source_site          text check (source_site is null or public.sa_valid_site(source_site)),
  ip_hash              text,
  ua_hash              text,
  consent_text_version text not null,                    -- 동의 문구 버전 (예: 2026-11-02)
  via                  text not null default 'signup' check (via in ('signup','settings','reconfirm','unsubscribe','admin')),
  created_at           timestamptz not null default now(),
  check ((granted and granted_at is not null and revoked_at is null) or (not granted and revoked_at is not null))
);
create index if not exists marketing_consents_user_idx on public.marketing_consents (user_id, channel, created_at desc);

-- 원장은 수정·삭제 금지 (탈퇴 시 계정 삭제에 따른 cascade 만 허용)
create or replace function public.sa_ledger_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then raise exception 'marketing_consents is append-only'; end if;
  return old;
end $$;
drop trigger if exists marketing_consents_no_update on public.marketing_consents;
create trigger marketing_consents_no_update before update on public.marketing_consents
  for each row execute function public.sa_ledger_guard();

-- 채널별 현재 상태 (최신 행). reconfirm_due = 마지막 동의(또는 재확인) + 2년
create or replace view public.marketing_consent_status with (security_invoker = true) as
select distinct on (mc.user_id, mc.channel)
  mc.user_id, mc.channel, mc.granted, mc.granted_at, mc.revoked_at, mc.source_site,
  mc.consent_text_version, mc.via, mc.created_at as changed_at,
  case when mc.granted then mc.created_at + interval '2 years' end as reconfirm_due
from public.marketing_consents mc
order by mc.user_id, mc.channel, mc.created_at desc, mc.id desc;

-- ---------------------------------------------------------------------------
-- 4. perpline_uids
-- ---------------------------------------------------------------------------
create table if not exists public.perpline_uids (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  exchange   text not null check (exchange ~ '^[a-z0-9_-]{2,20}$'),
  uid        text not null check (length(uid) between 3 and 40 and uid ~ '^[A-Za-z0-9_-]+$'),
  status     text not null default 'pending' check (status in ('pending','verified','rejected','removed')),
  note       text,                                       -- 운영자 메모 (서비스 롤만 수정)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exchange, uid)
);

-- ---------------------------------------------------------------------------
-- 5. qurator_subscriptions — 결제 웹훅(서비스 롤)만 쓰기. 탈퇴해도 거래 기록은 개인 식별 없이 남김
--    (전자상거래법 시행령 제6조: 대금결제·공급 기록 5년 보관)
-- ---------------------------------------------------------------------------
create table if not exists public.qurator_subscriptions (
  id                 bigint generated always as identity primary key,
  user_id            uuid references auth.users (id) on delete set null,
  plan               text not null,                      -- 예: daily_art_monthly
  status             text not null check (status in ('pending','active','past_due','canceled','expired')),
  source             text not null check (source in ('web','iap')),
  store              text check (store is null or store in ('toss','paypal','apple','google')),
  external_ref       text,                               -- 결제사 주문/구독 ID
  started_at         timestamptz,
  current_period_end timestamptz,
  canceled_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists qurator_subscriptions_user_idx on public.qurator_subscriptions (user_id);

-- 6. luft_orders — 나중에 만든다. (주문 테이블에 user_id uuid null references auth.users on delete set null 만 추가하면 연결됨)

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.memberships           enable row level security;
alter table public.marketing_consents    enable row level security;
alter table public.perpline_uids         enable row level security;
alter table public.qurator_subscriptions enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists "own profile name" on public.profiles;
create policy "own profile name" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;      -- 본인이 바꿀 수 있는 건 이름뿐

drop policy if exists "own memberships read" on public.memberships;
create policy "own memberships read" on public.memberships for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "own consents read" on public.marketing_consents;
create policy "own consents read" on public.marketing_consents for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "own uids read" on public.perpline_uids;
create policy "own uids read" on public.perpline_uids for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own uids add" on public.perpline_uids;
create policy "own uids add" on public.perpline_uids for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending' and note is null);
drop policy if exists "own uids remove pending" on public.perpline_uids;
create policy "own uids remove pending" on public.perpline_uids for delete to authenticated using (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "own subs read" on public.qurator_subscriptions;
create policy "own subs read" on public.qurator_subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- anon(로그인 안 한 방문자)은 어떤 테이블도 못 읽는다
revoke all on public.profiles, public.memberships, public.marketing_consents, public.perpline_uids, public.qurator_subscriptions from anon;
revoke all on public.marketing_consent_status from anon;
revoke insert, update, delete on public.memberships, public.marketing_consents, public.qurator_subscriptions from authenticated;

-- ---------------------------------------------------------------------------
-- 내부 도우미: 요청 헤더 해시
-- ---------------------------------------------------------------------------
create or replace function sa_private.hdr_hash(h text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare raw text; salt text;
begin
  begin
    raw := (current_setting('request.headers', true)::json) ->> h;
  exception when others then raw := null; end;
  if raw is null or raw = '' then return null; end if;
  if h = 'x-forwarded-for' then raw := trim(split_part(raw, ',', 1)); end if;
  select v into salt from sa_private.salt where id = 1;
  return encode(extensions.digest(raw || salt, 'sha256'), 'hex');
end $$;

-- 원장에 한 줄 추가 (내부용)
create or replace function sa_private.add_consent(p_user uuid, p_channel text, p_granted boolean, p_site text, p_text_version text, p_via text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare t timestamptz := now();
begin
  insert into public.marketing_consents (user_id, channel, granted, granted_at, revoked_at, source_site, ip_hash, ua_hash, consent_text_version, via)
  values (p_user, p_channel, p_granted, case when p_granted then t end, case when not p_granted then t end,
          p_site, sa_private.hdr_hash('x-forwarded-for'), sa_private.hdr_hash('user-agent'), coalesce(nullif(p_text_version, ''), 'unknown'), p_via);
  return t;
end $$;

-- ---------------------------------------------------------------------------
-- RPC (브라우저의 auth.js 가 호출) — 모두 로그인한 본인에게만 동작
-- ---------------------------------------------------------------------------

-- 내 정보: 프로필, 이 사이트 가입 기록, 가입한 사이트 목록, 채널별 수신 상태
create or replace function public.sa_me(p_site text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); res jsonb;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select jsonb_build_object(
    'profile',    (select to_jsonb(p) - 'first_utm' from public.profiles p where p.id = uid),
    'membership', (select to_jsonb(m) - 'utm' from public.memberships m where m.user_id = uid and m.site = p_site),
    'sites',      coalesce((select jsonb_agg(m.site order by m.joined_at) from public.memberships m where m.user_id = uid), '[]'::jsonb),
    'marketing',  coalesce((select jsonb_object_agg(s.channel, jsonb_build_object('granted', s.granted, 'granted_at', s.granted_at, 'revoked_at', s.revoked_at, 'reconfirm_due', s.reconfirm_due))
                            from public.marketing_consent_status s where s.user_id = uid), '{}'::jsonb)
  ) into res;
  update public.memberships set last_seen_at = now() where user_id = uid and site = p_site and last_seen_at < now() - interval '1 hour';
  return res;
end $$;

-- 가입 (사이트별). 필수 동의 3개가 모두 true 일 때만. 마케팅은 체크한 채널만 원장에 기록.
create or replace function public.sa_join(
  p_site text, p_provider text, p_source text, p_utm jsonb,
  p_terms_version text, p_privacy_version text, p_age14 boolean,
  p_marketing jsonb, p_text_version text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t timestamptz := now(); em text; nm text; ch text; any_ch boolean := false;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not public.sa_valid_site(p_site) then raise exception 'invalid site'; end if;
  if coalesce(p_age14, false) is not true then raise exception 'age14 required'; end if;
  if coalesce(p_terms_version, '') = '' or coalesce(p_privacy_version, '') = '' then raise exception 'consent versions required'; end if;

  select u.email, coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'nickname')
    into em, nm from auth.users u where u.id = uid;

  insert into public.profiles (id, email, display_name, first_site, first_source, first_utm, first_provider)
  values (uid, em, left(nm, 80), p_site, left(p_source, 120), coalesce(p_utm, '{}'::jsonb), left(p_provider, 20))
  on conflict (id) do update set email = excluded.email, updated_at = now();

  insert into public.memberships (user_id, site, source, utm, provider, terms_version, terms_agreed_at, privacy_version, privacy_agreed_at, age14_confirmed_at)
  values (uid, p_site, left(p_source, 120), coalesce(p_utm, '{}'::jsonb), left(p_provider, 20), p_terms_version, t, p_privacy_version, t, t)
  on conflict (user_id, site) do nothing;

  foreach ch in array array['email','kakao','sms'] loop
    if coalesce((p_marketing ->> ch)::boolean, false) then
      perform sa_private.add_consent(uid, ch, true, p_site, p_text_version, 'signup'); any_ch := true;
    end if;
  end loop;
  if any_ch and coalesce((p_marketing ->> 'night')::boolean, false) then
    perform sa_private.add_consent(uid, 'night', true, p_site, p_text_version, 'signup');
  end if;

  return public.sa_me(p_site);
end $$;

-- 마케팅 수신 설정 변경 (마이페이지 토글). 같은 상태면 기록하지 않는다. 처리 시각을 돌려준다(처리결과 통지용).
create or replace function public.sa_set_marketing(p_channel text, p_granted boolean, p_site text, p_text_version text, p_via text default 'settings')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cur boolean; t timestamptz; c text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_channel not in ('email','kakao','sms','night') then raise exception 'invalid channel'; end if;
  if p_via not in ('settings','reconfirm','unsubscribe') then p_via := 'settings'; end if;
  select s.granted into cur from public.marketing_consent_status s where s.user_id = uid and s.channel = p_channel;
  if coalesce(cur, false) = p_granted and not (p_granted and p_via = 'reconfirm') then
    return jsonb_build_object('channel', p_channel, 'granted', p_granted, 'at', now(), 'changed', false);
  end if;
  t := sa_private.add_consent(uid, p_channel, p_granted, p_site, p_text_version, p_via);
  -- 모든 광고 채널을 끄면 야간 수신 동의도 함께 끈다
  if not p_granted and p_channel <> 'night' and not exists (
       select 1 from public.marketing_consent_status s where s.user_id = uid and s.channel in ('email','kakao','sms') and s.granted) then
    select s.granted into cur from public.marketing_consent_status s where s.user_id = uid and s.channel = 'night';
    if coalesce(cur, false) then perform sa_private.add_consent(uid, 'night', false, p_site, p_text_version, p_via); end if;
  end if;
  return jsonb_build_object('channel', p_channel, 'granted', p_granted, 'at', t, 'changed', true);
end $$;

-- 로그인은 했지만 동의를 거부한 경우: 다른 사이트 가입이 없으면 계정 자체를 지운다
create or replace function public.sa_cancel_signup() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  if not exists (select 1 from public.memberships m where m.user_id = uid) then
    delete from auth.users where id = uid;
  end if;
end $$;

-- 회원 탈퇴: 이 사이트만(p_all=false) 또는 계정 전체(p_all=true). 남은 가입이 없으면 계정 삭제.
-- 계정 삭제 시 profiles·memberships·marketing_consents·perpline_uids 는 cascade 로 즉시 삭제,
-- qurator_subscriptions 는 user_id 만 비워 결제 기록(법정 보관)을 남긴다.
create or replace function public.sa_withdraw(p_site text, p_all boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); left_sites int;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if not p_all then
    delete from public.memberships where user_id = uid and site = p_site;
    if p_site = 'perpline' then delete from public.perpline_uids where user_id = uid; end if;
    select count(*) into left_sites from public.memberships where user_id = uid;
    if left_sites > 0 then return jsonb_build_object('deleted', 'membership', 'remaining', left_sites); end if;
  end if;
  delete from auth.users where id = uid;
  return jsonb_build_object('deleted', 'account');
end $$;

-- 이메일이 바뀌면 profiles 사본도 바꾼다
create or replace function sa_private.sync_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email, updated_at = now() where id = new.id;
  return new;
end $$;
drop trigger if exists sa_sync_email on auth.users;
create trigger sa_sync_email after update of email on auth.users for each row execute function sa_private.sync_email();

-- 실행 권한: 로그인 사용자만
revoke all on function public.sa_me(text), public.sa_join(text, text, text, jsonb, text, text, boolean, jsonb, text),
  public.sa_set_marketing(text, boolean, text, text, text), public.sa_cancel_signup(), public.sa_withdraw(text, boolean) from public, anon;
grant execute on function public.sa_me(text), public.sa_join(text, text, text, jsonb, text, text, boolean, jsonb, text),
  public.sa_set_marketing(text, boolean, text, text, text), public.sa_cancel_signup(), public.sa_withdraw(text, boolean) to authenticated;
revoke all on all functions in schema sa_private from public, anon, authenticated;

-- 끝. 확인: Table Editor 에서 각 테이블에 'RLS enabled' 표시가 있어야 한다.
