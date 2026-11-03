-- ============================================================================
-- 회원가입 이벤트·혜택 DB (Supabase) — ops/auth/schema.sql 을 먼저 실행한 뒤 실행
-- 2026-11-02 · 실행: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣기 → Run
-- 다시 실행해도 안전하도록 IF NOT EXISTS / CREATE OR REPLACE 를 썼다.
--
-- 구조
--   ev_events    이벤트 정의 (사이트, 기간, 추첨일, 당첨 인원, 경품 설명, 상태, 추첨 시드)
--   ev_entries   응모 (이벤트당 1계정 1회 + 정규화 이메일 해시로 다계정 차단). 이메일 원문은 저장하지 않는다
--   ev_winners   당첨 (마스킹 표시값, 수령 기한, 상태)
--   ev_claims    당첨자 수령 정보 (코인·네트워크·주소·받는 거래소·수령인 실명) — 지급 30일 뒤 파기
--   ev_welcome   가입 혜택 발급 (LUFT 쿠폰 · QURATOR 체험 · 인생준준 PDF) — 1계정 1사이트 1회
--
-- 원칙
--   · 모든 테이블 RLS ON. 본인은 자기 행만 읽는다. 쓰기는 아래 RPC(security definer)로만.
--   · 관리자 = auth.users.raw_app_meta_data 의 role 이 'admin' 인 계정 (서비스 롤만 바꿀 수 있음).
--     지정: update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = '세준 이메일';
--   · 관리자 화면(Artifact)에는 집계(ev_stats)와 마스킹 값만 간다. 원문은 Supabase 대시보드에서만 본다.
--   · 마케팅 수신 동의는 응모 조건이 아니다(선택). 체크한 채널만 public.sa_set_marketing 으로 원장에 기록한다.
-- ============================================================================

create schema if not exists ev_private;
revoke all on schema ev_private from public, anon, authenticated;

create or replace function public.ev_is_admin() returns boolean
language sql stable as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;

-- ---------------------------------------------------------------------------
-- 1. 이벤트
-- ---------------------------------------------------------------------------
create table if not exists public.ev_events (
  id            text primary key,                         -- 예: cb-2026-12 (체인브리프 2026년 12월)
  site          text not null check (public.sa_valid_site(site)),
  kind          text not null default 'draw' check (kind in ('draw')),
  title         text not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  draw_at       timestamptz not null,
  winners       int not null check (winners between 1 and 50),
  prize         text not null,                            -- 예: '20 USDT 또는 같은 가치의 SOL·ETH'
  prize_krw_cap int not null default 50000,               -- 1인 경품 가치 상한(원). 과세최저한 이하 운영
  regions       text not null default 'KR' check (regions in ('KR','GLOBAL_EX')),  -- KR = 대한민국 거주자, GLOBAL_EX = 제외국 외 해외
  excluded      text[] not null default '{}',             -- 응모 불가 국가 코드 (GLOBAL_EX 일 때)
  allowed       text[] not null default '{}',             -- 비어 있지 않으면 이 국가만 응모 가능 (Perpline: 응모 폼 목록과 같게)
  min_age       int not null default 19,
  rules_version text not null,
  status        text not null default 'draft' check (status in ('draft','open','closed','drawn','announced','done')),
  seed          text,                                     -- 공개 시드 (추첨일 이후 첫 비트코인 블록 해시)
  stats         jsonb not null default '{}'::jsonb,       -- 파기 후에도 남기는 집계 (응모 수, 국가 분포)
  announced_at  timestamptz,
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at and draw_at >= ends_at)
);

-- ---------------------------------------------------------------------------
-- 2. 응모
-- ---------------------------------------------------------------------------
create table if not exists public.ev_entries (
  id               bigint generated always as identity primary key,
  event_id         text not null references public.ev_events (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  entry_no         int not null,                          -- 이벤트 안의 응모 순번 (공개 추첨 검증용)
  email_key        text not null,                         -- 정규화 이메일의 SHA-256 (원문 아님)
  country          text not null check (country ~ '^[A-Z]{2}$'),
  age_ok           boolean not null check (age_ok),
  residency_ok     boolean not null check (residency_ok),
  rules_version    text not null,
  consent_version  text not null,                         -- 응모 개인정보 수집·이용 동의 문구 버전
  consented_at     timestamptz not null default now(),
  disqualified     text,                                  -- 부정 응모 판정 사유 (관리자)
  created_at       timestamptz not null default now(),
  unique (event_id, user_id),
  unique (event_id, email_key),
  unique (event_id, entry_no)
);
create index if not exists ev_entries_event_idx on public.ev_entries (event_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. 당첨
-- ---------------------------------------------------------------------------
create table if not exists public.ev_winners (
  event_id       text not null references public.ev_events (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  entry_no       int not null,
  rank           int not null,
  masked         text not null,                           -- 공개 표시값 예: ab***@n***.com
  status         text not null default 'notified' check (status in ('notified','claimed','paid','forfeited','rejected')),
  claim_deadline timestamptz not null,
  drawn_at       timestamptz not null default now(),
  primary key (event_id, user_id),
  unique (event_id, rank)
);

-- ---------------------------------------------------------------------------
-- 4. 수령 정보 (당첨자만, 지급 후 30일 뒤 개인 식별 칸을 비운다)
-- ---------------------------------------------------------------------------
create table if not exists public.ev_claims (
  event_id       text not null,
  user_id        uuid not null,
  coin           text not null check (coin in ('USDT','SOL','ETH')),
  network        text not null check (network in ('TRON','ETHEREUM','SOLANA','ARBITRUM','BASE')),
  address        text,                                    -- 파기 시 null
  address_key    text not null,                           -- lower(address) SHA-256 — 파기 후에도 재사용 차단에 쓴다
  exchange       text,                                    -- 받는 거래소(국내는 트래블룰 주소 등록에 필요) — 파기 시 null
  recipient_name text,                                    -- 수령인 실명(주소 등록용) — 파기 시 null
  skill_answer   int,                                     -- 해외(캐나다 등) 당첨자 확인 문제 답
  amount         numeric,                                 -- 지급 수량
  krw_value      int,                                     -- 지급 시점 원화 가치 (5만원 이하 확인용)
  tx_hash        text,                                    -- 지급 증빙 (개인 식별값 아님) — 보관
  paid_at        timestamptz,
  purged_at      timestamptz,
  created_at     timestamptz not null default now(),
  primary key (event_id, user_id),
  foreign key (event_id, user_id) references public.ev_winners (event_id, user_id) on delete cascade
);
create index if not exists ev_claims_addr_idx on public.ev_claims (address_key);

-- ---------------------------------------------------------------------------
-- 5. 가입 혜택
-- ---------------------------------------------------------------------------
create table if not exists public.ev_welcome (
  user_id    uuid not null references auth.users (id) on delete cascade,
  site       text not null check (site in ('luft','qurator','lifejunjun')),
  benefit    text not null,                               -- luft: coupon_2000 · qurator: trial_14d · lifejunjun: guide_pdf
  code       text,                                        -- LUFT 쿠폰 코드 (결제 Worker가 서버에서 검증)
  issued_at  timestamptz not null default now(),
  expires_at timestamptz,
  used_at    timestamptz,
  order_id   text,                                        -- LUFT: 쿠폰을 쓴 주문번호 (Worker가 서비스 롤로 기록)
  primary key (user_id, site)
);

alter table public.ev_events  enable row level security;
alter table public.ev_entries enable row level security;
alter table public.ev_winners enable row level security;
alter table public.ev_claims  enable row level security;
alter table public.ev_welcome enable row level security;

drop policy if exists "events public read" on public.ev_events;
create policy "events public read" on public.ev_events for select to anon, authenticated using (status <> 'draft');
drop policy if exists "own entry read" on public.ev_entries;
create policy "own entry read" on public.ev_entries for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own win read" on public.ev_winners;
create policy "own win read" on public.ev_winners for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own claim read" on public.ev_claims;
create policy "own claim read" on public.ev_claims for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "own welcome read" on public.ev_welcome;
create policy "own welcome read" on public.ev_welcome for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.ev_events, public.ev_entries, public.ev_winners, public.ev_claims, public.ev_welcome from anon, authenticated;
-- 관리자도 브라우저에서는 테이블을 직접 읽지 않는다 → 집계 RPC(ev_stats)만. 원문은 대시보드(서비스 롤)에서.

-- ---------------------------------------------------------------------------
-- 내부 도우미
-- ---------------------------------------------------------------------------
-- 이메일 정규화: 소문자, +태그 제거, gmail 은 점 제거 → 같은 사람의 별칭 주소 다계정 차단
create or replace function ev_private.email_key(e text) returns text
language plpgsql immutable as $$
declare l text := lower(trim(e)); local text; dom text;
begin
  local := split_part(l, '@', 1); dom := split_part(l, '@', 2);
  local := split_part(local, '+', 1);
  if dom in ('gmail.com','googlemail.com') then local := replace(local, '.', ''); dom := 'gmail.com'; end if;
  return encode(extensions.digest(local || '@' || dom, 'sha256'), 'hex');
end $$;

create or replace function ev_private.mask(e text) returns text
language sql immutable as $$
  select left(split_part(e, '@', 1), 2) || '***@' || left(split_part(e, '@', 2), 1) || '***.' || reverse(split_part(reverse(split_part(e, '@', 2)), '.', 1))
$$;

-- 일회용 메일 도메인 (필요하면 추가)
create or replace function ev_private.disposable(e text) returns boolean
language sql immutable as $$
  select split_part(lower(e), '@', 2) = any (array['mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','temp-mail.org','yopmail.com','sharklasers.com','trashmail.com','getnada.com','dispostable.com','maildrop.cc','throwawaymail.com'])
$$;

-- ---------------------------------------------------------------------------
-- RPC — 응모 (로그인한 본인)
--   p_marketing: {"email":true,"kakao":false} — 선택. 응모 성공 여부와 무관
-- ---------------------------------------------------------------------------
create or replace function public.ev_enter(
  p_event text, p_country text, p_age_ok boolean, p_residency_ok boolean,
  p_rules_version text, p_consent_version text, p_marketing jsonb default '{}'::jsonb, p_marketing_version text default ''
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); ev public.ev_events; em text; confirmed timestamptz; n int; ch text; cc text := upper(coalesce(p_country, ''));
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into ev from public.ev_events where id = p_event;
  if not found or ev.status <> 'open' or now() < ev.starts_at or now() > ev.ends_at then raise exception 'event closed'; end if;
  if not exists (select 1 from public.memberships m where m.user_id = uid and m.site = ev.site) then raise exception 'join site first'; end if;
  if coalesce(p_age_ok, false) is not true or coalesce(p_residency_ok, false) is not true then raise exception 'eligibility required'; end if;
  if coalesce(p_rules_version, '') <> ev.rules_version then raise exception 'rules version mismatch'; end if;
  if coalesce(p_consent_version, '') = '' then raise exception 'consent required'; end if;
  if ev.regions = 'KR' then cc := 'KR';
  elsif cc !~ '^[A-Z]{2}$' or cc = any (ev.excluded) or (cardinality(ev.allowed) > 0 and not cc = any (ev.allowed)) then raise exception 'country not eligible'; end if;

  select u.email, u.email_confirmed_at into em, confirmed from auth.users u where u.id = uid;
  if em is null or confirmed is null then raise exception 'email not verified'; end if;
  if ev_private.disposable(em) then raise exception 'disposable email'; end if;

  perform pg_advisory_xact_lock(hashtext(p_event));
  if exists (select 1 from public.ev_entries e where e.event_id = p_event and e.user_id = uid) then raise exception 'already entered'; end if;
  if exists (select 1 from public.ev_entries e where e.event_id = p_event and e.email_key = ev_private.email_key(em)) then raise exception 'duplicate email'; end if;
  select coalesce(max(e.entry_no), 0) + 1 into n from public.ev_entries e where e.event_id = p_event;
  begin
    insert into public.ev_entries (event_id, user_id, entry_no, email_key, country, age_ok, residency_ok, rules_version, consent_version)
    values (p_event, uid, n, ev_private.email_key(em), cc, true, true, p_rules_version, p_consent_version);
  exception when unique_violation then
    raise exception 'already entered';
  end;

  -- 선택 마케팅 동의: 체크한 채널만 기록 (인증 스키마의 원장 함수 사용)
  foreach ch in array array['email','kakao'] loop
    if coalesce((p_marketing ->> ch)::boolean, false) then
      perform public.sa_set_marketing(ch, true, ev.site, coalesce(nullif(p_marketing_version, ''), p_consent_version), 'settings');
    end if;
  end loop;

  return jsonb_build_object('event', p_event, 'entry_no', n, 'at', now());
end $$;

create or replace function public.ev_my_entry(p_event text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'entry', (select jsonb_build_object('entry_no', e.entry_no, 'at', e.created_at) from public.ev_entries e where e.event_id = p_event and e.user_id = auth.uid()),
    'win',   (select jsonb_build_object('rank', w.rank, 'status', w.status, 'deadline', w.claim_deadline) from public.ev_winners w where w.event_id = p_event and w.user_id = auth.uid())
  )
$$;

-- 당첨자 수령 신청 (로그인한 당첨자 본인, 기한 안)
create or replace function public.ev_submit_claim(
  p_event text, p_coin text, p_network text, p_address text, p_exchange text, p_recipient_name text, p_skill_answer int default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); w public.ev_winners; ak text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into w from public.ev_winners where event_id = p_event and user_id = uid;
  if not found then raise exception 'not a winner'; end if;
  if w.status <> 'notified' then raise exception 'already claimed'; end if;
  if now() > w.claim_deadline then raise exception 'claim expired'; end if;
  if length(coalesce(p_address, '')) < 26 or length(p_address) > 100 or p_address !~ '^[A-Za-z0-9]+$' then raise exception 'invalid address'; end if;
  ak := encode(extensions.digest(lower(p_address), 'sha256'), 'hex');
  -- 다른 계정이 이미 쓴 지갑 주소면 거부 (다계정 차단)
  if exists (select 1 from public.ev_claims c where c.address_key = ak and c.user_id <> uid) then raise exception 'address in use'; end if;
  insert into public.ev_claims (event_id, user_id, coin, network, address, address_key, exchange, recipient_name, skill_answer)
  values (p_event, uid, upper(p_coin), upper(p_network), p_address, ak, left(p_exchange, 40), left(p_recipient_name, 60), p_skill_answer);
  update public.ev_winners set status = 'claimed' where event_id = p_event and user_id = uid;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------------
-- RPC — 가입 혜택 받기 (로그인 + 해당 사이트 가입 회원, 1계정 1회)
-- ---------------------------------------------------------------------------
create or replace function public.ev_claim_welcome(p_site text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.ev_welcome; b text; exp timestamptz; c text := null;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_site not in ('luft','qurator','lifejunjun') then raise exception 'invalid site'; end if;
  if not exists (select 1 from public.memberships m where m.user_id = uid and m.site = p_site) then raise exception 'join site first'; end if;
  select * into r from public.ev_welcome where user_id = uid and site = p_site;
  if found then return to_jsonb(r) - 'user_id' - 'order_id'; end if;
  if p_site = 'luft' then
    b := 'coupon_2000'; exp := now() + interval '30 days';
    c := 'LUFT-' || upper(encode(extensions.gen_random_bytes(4), 'hex'));
  elsif p_site = 'qurator' then
    b := 'trial_14d'; exp := now() + interval '14 days';     -- 체험 권한 부여는 결제 서버/멤버 장부가 이 행을 보고 처리
  else
    b := 'guide_pdf'; exp := null;
  end if;
  insert into public.ev_welcome (user_id, site, benefit, code, expires_at) values (uid, p_site, b, c, exp)
  returning * into r;
  return to_jsonb(r) - 'user_id' - 'order_id';
end $$;

-- ---------------------------------------------------------------------------
-- RPC — 관리자 (role=admin). 집계·추첨·파기. 개인정보 원문을 돌려주지 않는다
-- ---------------------------------------------------------------------------
create or replace function public.ev_stats(p_event text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.ev_is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'event',     (select to_jsonb(e) - 'stats' from public.ev_events e where e.id = p_event),
    'entries',   (select count(*) from public.ev_entries where event_id = p_event and disqualified is null),
    'flagged',   (select count(*) from public.ev_entries where event_id = p_event and disqualified is not null),
    'countries', coalesce((select jsonb_object_agg(country, n) from (select country, count(*) n from public.ev_entries where event_id = p_event group by country) t), '{}'::jsonb),
    'daily',     coalesce((select jsonb_object_agg(d, n) from (select to_char(created_at at time zone 'Asia/Seoul', 'MM-DD') d, count(*) n from public.ev_entries where event_id = p_event group by 1) t), '{}'::jsonb),
    'mkt_optin', (select count(distinct s.user_id) from public.marketing_consent_status s join public.ev_entries e on e.user_id = s.user_id and e.event_id = p_event where s.granted and s.channel in ('email','kakao')),
    'winners',   coalesce((select jsonb_agg(jsonb_build_object('rank', w.rank, 'entry_no', w.entry_no, 'masked', w.masked, 'status', w.status, 'deadline', w.claim_deadline) order by w.rank) from public.ev_winners w where w.event_id = p_event), '[]'::jsonb),
    'saved',     (select stats from public.ev_events where id = p_event)
  );
end $$;

-- 추첨: 공개 시드(추첨일 이후 첫 비트코인 블록 해시) + 응모 순번 → SHA-256 정렬 상위 N명.
-- 누구나 응모 순번 목록과 시드로 같은 결과를 재현할 수 있다. 최근 90일 안에 같은 계정이 당첨됐으면 제외.
create or replace function public.ev_draw(p_event text, p_seed text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ev public.ev_events;
begin
  if not public.ev_is_admin() then raise exception 'admin only'; end if;
  select * into ev from public.ev_events where id = p_event for update;
  if ev.status not in ('open','closed') or now() < ev.draw_at then raise exception 'not drawable yet'; end if;
  if coalesce(p_seed, '') !~ '^[0-9a-f]{64}$' then raise exception 'seed must be a block hash'; end if;
  insert into public.ev_winners (event_id, user_id, entry_no, rank, masked, claim_deadline)
  select p_event, t.user_id, t.entry_no, row_number() over (order by t.h), ev_private.mask(u.email), now() + interval '14 days'
  from (
    select e.user_id, e.entry_no, encode(extensions.digest(p_seed || ':' || e.entry_no::text, 'sha256'), 'hex') h
    from public.ev_entries e
    where e.event_id = p_event and e.disqualified is null
      and not exists (select 1 from public.ev_winners w where w.user_id = e.user_id and w.drawn_at > now() - interval '90 days' and w.status <> 'rejected')
    order by h limit ev.winners
  ) t join auth.users u on u.id = t.user_id;
  update public.ev_events set status = 'drawn', seed = p_seed where id = p_event;
  return public.ev_stats(p_event);
end $$;

-- 발표: 당첨자 확정 후 공지 시각 기록 (파기 기한의 기준)
create or replace function public.ev_announce(p_event text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.ev_is_admin() then raise exception 'admin only'; end if;
  update public.ev_events set status = 'announced', announced_at = now() where id = p_event and status = 'drawn';
  if not found then raise exception 'draw first'; end if;
  return public.ev_stats(p_event);
end $$;

-- 파기: 발표 30일 뒤 응모 행 삭제(집계만 stats 에 남김), 지급 30일 뒤 수령 정보의 주소·실명·거래소 비우기.
create or replace function public.ev_purge(p_event text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare ev public.ev_events; snap jsonb; n_entries int; n_claims int;
begin
  if not public.ev_is_admin() then raise exception 'admin only'; end if;
  select * into ev from public.ev_events where id = p_event for update;
  if ev.announced_at is null or now() < ev.announced_at + interval '30 days' then raise exception 'keep until announce + 30 days'; end if;
  select jsonb_build_object('entries', count(*), 'countries', coalesce(jsonb_object_agg(country, n) filter (where country is not null), '{}'::jsonb))
    into snap from (select country, count(*) n from public.ev_entries where event_id = p_event group by country) t;
  update public.ev_events set stats = stats || jsonb_build_object('final', snap, 'purged_at', now()), status = 'done' where id = p_event;
  update public.ev_claims set address = null, exchange = null, recipient_name = null, skill_answer = null, purged_at = now()
    where event_id = p_event and paid_at is not null and paid_at < now() - interval '30 days' and purged_at is null;
  get diagnostics n_claims = row_count;
  delete from public.ev_entries e where e.event_id = p_event
    and not exists (select 1 from public.ev_winners w where w.event_id = e.event_id and w.user_id = e.user_id and w.status in ('notified','claimed'));
  get diagnostics n_entries = row_count;
  return jsonb_build_object('entries_deleted', n_entries, 'claims_purged', n_claims);
end $$;

grant execute on function public.ev_enter, public.ev_my_entry, public.ev_submit_claim, public.ev_claim_welcome,
  public.ev_stats, public.ev_draw, public.ev_announce, public.ev_purge, public.ev_is_admin to authenticated;
revoke execute on function public.ev_enter, public.ev_my_entry, public.ev_submit_claim, public.ev_claim_welcome,
  public.ev_stats, public.ev_draw, public.ev_announce, public.ev_purge from anon;
