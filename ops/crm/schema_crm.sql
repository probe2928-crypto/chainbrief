-- =====================================================================
-- CRM 마케팅 발송 추가 마이그레이션 (ops/crm/schema_crm.sql)
-- 선행: ops/auth/schema.sql (profiles / memberships / marketing_consents) 먼저 실행.
-- 이 파일은 위 테이블을 "읽기만" 하고, 수신거부 시 marketing_consents 에 철회 행을 "추가"만 한다(수정·삭제 없음).
-- 전부 꺼진 상태로 만들어진다: crm_settings.sending_enabled = false. 실제 발송은 세준 승인 후 켠다.
--
-- [auth 스키마 의존 — 확정 후 확인할 것]  (auth 담당 스키마의 실제 컬럼명과 다르면 아래 두 뷰만 고치면 된다)
--   marketing_consents: user_id, channel(email|kakao|sms|night), granted(bool), granted_at, revoked_at,
--                       source_site, text_version(문구 버전), ip_hash, ua_hash, via
--   memberships:        user_id, site, joined_at, source, utm(jsonb)
--   → crm_consent_latest, crm_membership_base 두 뷰가 어댑터 역할.
--
-- 원칙
--   * 사람 = auth.users 1행(통합 계정). 사이트별 가입·동의는 memberships / marketing_consents 의 site 로 구분.
--   * 동의 범위 = 동의를 받은 사이트(source_site) 1곳. 사이트 A 동의로 사이트 B 광고를 보내지 않는다(PLAN.md §3).
--     예외: source_site = 'family' 인 동의(통합 소식 동의 문구로 받은 경우)만 모든 사이트 광고에 쓴다.
--   * 대시보드·세그먼트 뷰에는 이메일·전화번호 원문을 노출하지 않는다. 원문은 서비스 롤(Edge Function)만.
-- =====================================================================

-- ---------- 0. 관리자 ----------
create table if not exists public.crm_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  note text
);
alter table public.crm_admins enable row level security;
-- 정책 없음 = 클라이언트 접근 불가. 관리자 등록은 SQL Editor(서비스 롤)에서만.

create or replace function public.crm_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.crm_admins a where a.user_id = auth.uid());
$$;
revoke all on function public.crm_is_admin() from public;
grant execute on function public.crm_is_admin() to authenticated, service_role;

-- ---------- 1. 설정(킬 스위치·발송 규칙) ----------
create table if not exists public.crm_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.crm_settings(key, value) values
  ('sending_enabled',      'false'::jsonb),                 -- 전체 킬 스위치. true 가 아니면 어떤 함수도 발송하지 않음
  ('quiet_hours_kst',      '{"start":"20:50","end":"08:00"}'::jsonb), -- 광고 발송 금지 시간(KST). 법정 21~08시보다 10분 넓게
  ('ad_weekly_cap',        '2'::jsonb),                     -- 사람 1명당 7일간 광고 최대 건수(전 사이트 합산)
  ('ad_daily_cap',         '1'::jsonb),                     -- 사람 1명당 24시간 광고 최대 건수
  ('biennial_lead_days',   '30'::jsonb),                    -- 2년 확인 안내를 기념일 며칠 전에 보낼지
  ('result_notice_email',  'true'::jsonb),                  -- 동의·철회 처리결과를 이메일로도 통지(화면 통지와 별도, 14일 이내)
  ('welcome_steps',        '[{"step":0,"days":0,"kind":"info"},{"step":1,"days":3,"kind":"ad"},{"step":2,"days":7,"kind":"ad"}]'::jsonb)
on conflict (key) do nothing;
alter table public.crm_settings enable row level security;
drop policy if exists crm_settings_admin on public.crm_settings;
create policy crm_settings_admin on public.crm_settings for all to authenticated
  using (public.crm_is_admin()) with check (public.crm_is_admin());

create or replace function public.crm_setting(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select value from public.crm_settings where key = p_key;
$$;
revoke all on function public.crm_setting(text) from public;
grant execute on function public.crm_setting(text) to authenticated, service_role;

-- ---------- 2. 사이트별 전송자 정보(법정 표기) ----------
-- 정보통신망법 제50조④·시행령 제61조③(별표 6): 전송자 명칭·연락처·수신거부 방법을 광고에 밝혀야 함.
-- 사이트마다 사업자(명의)가 다를 수 있어 행을 분리. 값은 세준 확인 후 입력(PLAN.md '세준 확인').
create table if not exists public.crm_sender_profiles (
  site text primary key check (site in ('qurator','perpline','luft','lifejunjun','chainbrief','family')),
  brand_name text not null,               -- 메일 보낸사람 이름 / 제목 (광고) 뒤에 붙는 서비스명
  legal_name text,                        -- 상호(사업자등록증 기준)
  representative text,
  biz_reg_no text,                        -- 사업자등록번호
  address text,                           -- 사업장 주소(별표 6 전자우편: 주소 표기)
  phone text,
  contact_email text,
  from_email text,                        -- 예: news@mail.<도메인>  (도메인 구매 전엔 비움 → 발송 불가)
  reply_to text,
  lang text not null default 'ko' check (lang in ('ko','en')),
  kakao_channel_id text,                  -- 카카오톡 채널 검색용 아이디(@...)
  privacy_url text,
  ready boolean not null default false,   -- 위 필수값 확인 완료 시 true. false 면 그 사이트는 광고 발송 불가
  updated_at timestamptz not null default now()
);
alter table public.crm_sender_profiles enable row level security;
drop policy if exists crm_sender_admin on public.crm_sender_profiles;
create policy crm_sender_admin on public.crm_sender_profiles for all to authenticated
  using (public.crm_is_admin()) with check (public.crm_is_admin());
insert into public.crm_sender_profiles(site, brand_name, lang) values
  ('qurator','QURATOR','ko'), ('perpline','Perpline','en'), ('luft','LUFT','ko'),
  ('lifejunjun','인생준준','ko'), ('chainbrief','체인브리프','ko')
on conflict (site) do nothing;

-- ---------- 3. 연락처 속성·행동 기록(세그먼트용) ----------
create table if not exists public.crm_contact_attrs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country char(2),                        -- ISO 3166-1 alpha-2 (가입 시 사용자가 고르거나 결제·배송 정보에서)
  lang text check (lang in ('ko','en')),
  phone_e164 text,                        -- 사용자가 직접 입력한 경우만. 카카오/문자용
  kakao_channel_friend boolean,           -- 카카오싱크 채널 추가 동의 또는 채널 관계 API 결과
  updated_at timestamptz not null default now()
);
alter table public.crm_contact_attrs enable row level security;  -- 정책 없음: 서비스 롤만

create table if not exists public.crm_contact_facts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  site text not null,
  kind text not null check (kind in ('purchase','subscription_start','subscription_end','booking','event_entry','trial_extend')),
  ref text,                               -- 주문번호·이벤트 키 등(개인정보 아님)
  occurred_at timestamptz not null default now()
);
create index if not exists crm_facts_user_site on public.crm_contact_facts(user_id, site, kind, occurred_at desc);
alter table public.crm_contact_facts enable row level security;  -- 정책 없음: 서비스 롤만
-- 이벤트 담당(event/2026-11-02)·결제 웹훅은 이 테이블에 insert 만 하면 세그먼트에 반영된다.

-- ---------- 4. 캠페인 ----------
create table if not exists public.crm_campaigns (
  id uuid primary key default gen_random_uuid(),
  site text not null references public.crm_sender_profiles(site),
  channel text not null check (channel in ('email','kakao_brand','kakao_alimtalk')),
  kind text not null check (kind in ('ad','info')),       -- ad = 광고성(동의자만, (광고) 표기). info = 정보성(거래·계정 안내만)
  name text not null,
  subject text,                                          -- (광고) 는 발송 함수가 자동으로 붙인다. 여기엔 쓰지 않는다
  preheader text,
  template_key text not null default 'layout',
  body_html text,                                        -- 본문(법정 문구 블록은 자동 삽입)
  segment jsonb not null default '{}'::jsonb,            -- 예: {"countries":["SG"],"joined_after":"2026-11-01","has_purchase":false}
  status text not null default 'draft' check (status in ('draft','approved','scheduled','sending','sent','cancelled')),
  scheduled_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_count int not null default 0,
  skipped_count int not null default 0,
  failed_count int not null default 0
);
alter table public.crm_campaigns enable row level security;
drop policy if exists crm_campaigns_admin on public.crm_campaigns;
create policy crm_campaigns_admin on public.crm_campaigns for all to authenticated
  using (public.crm_is_admin()) with check (public.crm_is_admin());

-- ---------- 5. 발송 로그 ----------
create table if not exists public.crm_campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.crm_campaigns(id) on delete set null,
  flow_key text,                                         -- 자동 흐름: 'welcome:<site>:<step>' / 'biennial:<channel>:<site>' / 'result:<channel>:<site>'
  user_id uuid references auth.users(id) on delete set null,   -- 탈퇴 시 null (로그 자체는 법정 이행 증빙으로 보관)
  site text not null,
  channel text not null,
  kind text not null check (kind in ('ad','info','legal')),
  recipient_hash text not null,                          -- sha256(lower(email) 또는 전화번호 + CRM_HASH_PEPPER)
  provider text,
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued','sent','skipped','failed','bounced','complained','dry_run')),
  skip_reason text,                                      -- no_consent | suppressed | cap_week | cap_day | quiet_hours | sender_not_ready | ...
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create unique index if not exists crm_sends_once_campaign on public.crm_campaign_sends(campaign_id, user_id, channel) where campaign_id is not null and user_id is not null;
create unique index if not exists crm_sends_once_flow on public.crm_campaign_sends(flow_key, user_id) where flow_key is not null and user_id is not null;
create index if not exists crm_sends_user_recent on public.crm_campaign_sends(user_id, kind, sent_at desc);
alter table public.crm_campaign_sends enable row level security;
drop policy if exists crm_sends_admin_read on public.crm_campaign_sends;
create policy crm_sends_admin_read on public.crm_campaign_sends for select to authenticated using (public.crm_is_admin());

-- ---------- 6. 수신거부 토큰 ----------
create table if not exists public.crm_unsubscribe_tokens (
  token_hash text primary key,                           -- sha256(원문 토큰). 원문은 메일 링크에만 존재
  user_id uuid references auth.users(id) on delete cascade,
  site text not null,                                    -- 이 메일을 보낸 사이트
  channel text not null default 'email',
  send_id uuid references public.crm_campaign_sends(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '400 days',  -- CAN-SPAM 30일 이상 + 2년 확인 주기 고려
  used_at timestamptz
);
alter table public.crm_unsubscribe_tokens enable row level security;  -- 정책 없음: 서비스 롤만

-- ---------- 7. 발송 제외 목록(수신거부·반송·스팸신고) ----------
create table if not exists public.crm_suppression (
  id bigserial primary key,
  channel text not null check (channel in ('email','kakao','sms')),
  address_hash text not null,                            -- recipient_hash 와 같은 방식
  user_id uuid references auth.users(id) on delete set null,
  site text,                                             -- null = 모든 사이트에서 제외
  reason text not null check (reason in ('unsubscribe','hard_bounce','complaint','manual')),
  created_at timestamptz not null default now()
);
create unique index if not exists crm_suppression_uniq on public.crm_suppression(channel, address_hash, coalesce(site,'*'), reason);
alter table public.crm_suppression enable row level security;
drop policy if exists crm_suppression_admin_read on public.crm_suppression;
create policy crm_suppression_admin_read on public.crm_suppression for select to authenticated using (public.crm_is_admin());

-- ---------- 8. 법정 통지 기록(처리결과 14일 / 2년 확인) ----------
create table if not exists public.crm_consent_notices (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  site text not null,
  channel text not null,
  notice_type text not null check (notice_type in ('result','biennial')),
  consent_event_at timestamptz not null,                 -- result: 동의/철회 시각, biennial: 이번 주기 기념일
  sent_at timestamptz not null default now(),
  send_id uuid references public.crm_campaign_sends(id) on delete set null
);
create unique index if not exists crm_notices_once on public.crm_consent_notices(user_id, site, channel, notice_type, consent_event_at);
alter table public.crm_consent_notices enable row level security;
drop policy if exists crm_notices_admin_read on public.crm_consent_notices;
create policy crm_notices_admin_read on public.crm_consent_notices for select to authenticated using (public.crm_is_admin());

-- =====================================================================
-- 뷰 — security_invoker + 서비스 롤에만 SELECT 권한(맨 아래). 브라우저(anon·authenticated)에서는 읽을 수 없음.
-- =====================================================================

-- 어댑터 ①: (사람, 사이트, 채널)별 최신 동의 상태
create or replace view public.crm_consent_latest with (security_invoker = true) as
select distinct on (mc.user_id, coalesce(mc.source_site, '*'), mc.channel)
  mc.user_id,
  coalesce(mc.source_site, '*') as site,
  mc.channel,
  mc.granted and mc.revoked_at is null as active,
  mc.granted_at,
  mc.revoked_at,
  mc.text_version
from public.marketing_consents mc
order by mc.user_id, coalesce(mc.source_site, '*'), mc.channel,
         greatest(coalesce(mc.granted_at, '-infinity'::timestamptz), coalesce(mc.revoked_at, '-infinity'::timestamptz)) desc;

-- 동의 기산점(2년 확인): 마지막 철회 이후의 최초 동의 시각. 철회 이력이 없으면 최초 동의일.
create or replace view public.crm_consent_anchor with (security_invoker = true) as
select l.user_id, l.site, l.channel,
  (select min(g.granted_at) from public.marketing_consents g
    where g.user_id = l.user_id and coalesce(g.source_site,'*') = l.site and g.channel = l.channel and g.granted
      and g.granted_at > coalesce((select max(r.revoked_at) from public.marketing_consents r
                                    where r.user_id = l.user_id and coalesce(r.source_site,'*') = l.site
                                      and r.channel = l.channel and r.revoked_at is not null), '-infinity'::timestamptz)
  ) as anchor_at
from public.crm_consent_latest l
where l.active;

-- 어댑터 ②: 사이트별 가입 기록
create or replace view public.crm_membership_base with (security_invoker = true) as
select m.user_id, m.site, m.joined_at, m.source,
       m.utm->>'utm_source' as utm_source, m.utm->>'utm_campaign' as utm_campaign
from public.memberships m;

-- 세그먼트 베이스: 광고 동의자만 노출(동의 채널이 하나라도 있는 (사람,사이트)). 이메일·전화 원문 없음.
create or replace view public.crm_segment_base with (security_invoker = true) as
with c as (
  select user_id, site,
    bool_or(channel = 'email' and active) as email_ok,
    bool_or(channel = 'kakao' and active) as kakao_ok,
    bool_or(channel = 'sms'   and active) as sms_ok,
    bool_or(channel = 'night' and active) as night_ok
  from public.crm_consent_latest group by user_id, site
), fam as (
  select user_id, email_ok, kakao_ok, sms_ok from c where site = 'family'
)
select mb.user_id, mb.site, mb.joined_at, mb.source, mb.utm_source, mb.utm_campaign,
  a.country, a.lang,
  coalesce(c.email_ok, false) or coalesce(fam.email_ok, false) as email_ok,
  coalesce(c.kakao_ok, false) or coalesce(fam.kakao_ok, false) as kakao_ok,
  coalesce(c.sms_ok,   false) or coalesce(fam.sms_ok,   false) as sms_ok,
  coalesce(a.kakao_channel_friend, false) as kakao_friend,
  exists (select 1 from public.crm_contact_facts f where f.user_id = mb.user_id and f.site = mb.site and f.kind = 'purchase') as has_purchase,
  exists (select 1 from public.crm_contact_facts f where f.user_id = mb.user_id and f.site = mb.site and f.kind = 'subscription_start'
          and not exists (select 1 from public.crm_contact_facts e where e.user_id = f.user_id and e.site = f.site
                          and e.kind = 'subscription_end' and e.occurred_at > f.occurred_at)) as is_subscriber,
  (select count(*) from public.crm_contact_facts f where f.user_id = mb.user_id and f.site = mb.site and f.kind = 'event_entry') as event_entries
from public.crm_membership_base mb
left join c   on c.user_id = mb.user_id and c.site = mb.site
left join fam on fam.user_id = mb.user_id
left join public.crm_contact_attrs a on a.user_id = mb.user_id
where coalesce(c.email_ok or c.kakao_ok or c.sms_ok, false)
   or coalesce(fam.email_ok or fam.kakao_ok or fam.sms_ok, false);

-- 2년 확인 대상: 이번 주기 기념일까지 lead_days 이내이고 아직 이번 주기 안내를 안 보낸 동의
-- 정보통신망법 제50조⑧, 시행령 제62조의3: 수신동의 받은 날부터 2년마다(기념일 전까지) 확인.
create or replace view public.crm_biennial_due with (security_invoker = true) as
with k as (
  select an.user_id, an.site, an.channel, an.anchor_at,
         an.anchor_at + make_interval(years => 2 * (floor(extract(epoch from (now() - an.anchor_at)) / (86400 * 365.2425 * 2))::int + 1)) as anniversary
  from public.crm_consent_anchor an
  where an.channel in ('email','kakao','sms','night') and an.anchor_at is not null
)
select k.* from k
where k.anniversary - make_interval(days => coalesce((public.crm_setting('biennial_lead_days'))::int, 30)) <= now()
  and not exists (select 1 from public.crm_consent_notices n
                  where n.user_id = k.user_id and n.site = k.site and n.channel = k.channel
                    and n.notice_type = 'biennial' and n.consent_event_at = k.anniversary);

-- 처리결과 통지 대상: 최근 14일 내 동의/철회 중 아직 통지 기록이 없는 건 (제50조⑦, 시행령 제62조의2)
create or replace view public.crm_result_notice_due with (security_invoker = true) as
select mc.user_id, coalesce(mc.source_site,'*') as site, mc.channel,
       case when mc.revoked_at is not null then 'revoked' else 'granted' end as change,
       coalesce(mc.revoked_at, mc.granted_at) as event_at
from public.marketing_consents mc
where coalesce(mc.revoked_at, mc.granted_at) > now() - interval '14 days'
  and not exists (select 1 from public.crm_consent_notices n
                  where n.user_id = mc.user_id and n.site = coalesce(mc.source_site,'*') and n.channel = mc.channel
                    and n.notice_type = 'result' and n.consent_event_at = coalesce(mc.revoked_at, mc.granted_at));

-- =====================================================================
-- 함수
-- =====================================================================

-- 광고 금지 시간 여부(KST). 이메일은 법상 야간 별도동의 예외(시행령 제61조②)지만 운영 규칙으로 모든 광고를 막는다.
create or replace function public.crm_is_quiet_hours(p_at timestamptz default now())
returns boolean language sql stable set search_path = public as $$
  with s as (select public.crm_setting('quiet_hours_kst') v),
       t as (select (p_at at time zone 'Asia/Seoul')::time as now_t,
                    ((select v->>'start' from s))::time as st, ((select v->>'end' from s))::time as en)
  select case when st > en then now_t >= st or now_t < en else now_t >= st and now_t < en end from t;
$$;
grant execute on function public.crm_is_quiet_hours(timestamptz) to authenticated, service_role;

-- 캠페인 대상자(서비스 롤 전용): 동의·제외목록·빈도 상한·중복 발송을 한 번에 거른다.
-- 이메일 원문이 나오므로 service_role 만 실행 가능.
create or replace function public.crm_campaign_audience(p_campaign uuid)
returns table (user_id uuid, email text, lang text, country text, skip_reason text)
language plpgsql stable security definer set search_path = public, auth as $$
declare
  c public.crm_campaigns%rowtype;
  wk int := coalesce((public.crm_setting('ad_weekly_cap'))::int, 2);
  dy int := coalesce((public.crm_setting('ad_daily_cap'))::int, 1);
begin
  select * into c from public.crm_campaigns where id = p_campaign;
  if not found then raise exception 'campaign not found'; end if;
  return query
  with base as (
    select sb.user_id, u.email::text as email, coalesce(sb.lang, sp.lang) as lang, sb.country::text as country,
           sb.email_ok, sb.kakao_ok, sb.kakao_friend, sb.has_purchase, sb.is_subscriber, sb.event_entries, sb.joined_at
    from public.crm_segment_base sb
    join auth.users u on u.id = sb.user_id
    join public.crm_sender_profiles sp on sp.site = c.site
    where sb.site = c.site
      and (c.segment->'countries' is null or sb.country = any (select jsonb_array_elements_text(c.segment->'countries')))
      and (c.segment->'langs' is null or coalesce(sb.lang, sp.lang) = any (select jsonb_array_elements_text(c.segment->'langs')))
      and (c.segment->>'joined_after' is null or sb.joined_at >= (c.segment->>'joined_after')::timestamptz)
      and (c.segment->>'joined_before' is null or sb.joined_at < (c.segment->>'joined_before')::timestamptz)
      and (c.segment->>'has_purchase' is null or sb.has_purchase = (c.segment->>'has_purchase')::boolean)
      and (c.segment->>'is_subscriber' is null or sb.is_subscriber = (c.segment->>'is_subscriber')::boolean)
      and (c.segment->>'min_event_entries' is null or sb.event_entries >= (c.segment->>'min_event_entries')::int)
  )
  select b.user_id, b.email, b.lang, b.country,
    case
      when c.channel = 'email' and not b.email_ok then 'no_consent'
      when c.channel = 'kakao_brand' and not (b.kakao_ok and b.kakao_friend) then 'no_consent_or_not_friend'
      when exists (select 1 from public.crm_suppression s
                   where s.channel = case when c.channel = 'email' then 'email' else 'kakao' end
                     and s.user_id = b.user_id and (s.site is null or s.site = c.site)) then 'suppressed'
      when exists (select 1 from public.crm_campaign_sends x where x.campaign_id = c.id and x.user_id = b.user_id and x.status in ('sent','queued')) then 'already_sent'
      when (select count(*) from public.crm_campaign_sends x where x.user_id = b.user_id and x.kind = 'ad' and x.status = 'sent' and x.sent_at > now() - interval '7 days') >= wk then 'cap_week'
      when (select count(*) from public.crm_campaign_sends x where x.user_id = b.user_id and x.kind = 'ad' and x.status = 'sent' and x.sent_at > now() - interval '1 day') >= dy then 'cap_day'
      else null
    end
  from base b
  where c.kind = 'ad';   -- 정보성(info) 캠페인은 이 함수로 대량 발송하지 않는다(거래 건별 트리거로만)
end $$;
revoke all on function public.crm_campaign_audience(uuid) from public, anon, authenticated;
grant execute on function public.crm_campaign_audience(uuid) to service_role;

-- 관리자 대시보드용 집계(개인정보 없음, 숫자만)
create or replace function public.crm_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.crm_is_admin() and coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'admin only';
  end if;
  select jsonb_build_object(
    'members_by_site', (select coalesce(jsonb_object_agg(site, n), '{}') from (select site, count(*) n from public.memberships group by site) x),
    'consent_by_site_channel', (select coalesce(jsonb_agg(jsonb_build_object('site', site, 'channel', channel, 'active', n)), '[]')
                                from (select site, channel, count(*) filter (where active) n from public.crm_consent_latest group by site, channel) y),
    'sends_30d', (select coalesce(jsonb_agg(jsonb_build_object('site', site, 'channel', channel, 'status', status, 'n', n)), '[]')
                  from (select site, channel, status, count(*) n from public.crm_campaign_sends where created_at > now() - interval '30 days' group by 1,2,3) z),
    'biennial_due', (select count(*) from public.crm_biennial_due),
    'result_notice_due', (select count(*) from public.crm_result_notice_due),
    'suppressed', (select count(*) from public.crm_suppression),
    'sending_enabled', public.crm_setting('sending_enabled')
  ) into r;
  return r;
end $$;
revoke all on function public.crm_dashboard_stats() from public, anon;
grant execute on function public.crm_dashboard_stats() to authenticated, service_role;

-- 뷰 접근 권한: 관리자 화면도 뷰를 직접 읽지 않는다(집계 함수만). 뷰는 서비스 롤(Edge Function) 전용.
revoke all on public.crm_consent_latest, public.crm_consent_anchor, public.crm_membership_base, public.crm_segment_base,
              public.crm_biennial_due, public.crm_result_notice_due from public, anon, authenticated;
grant select on public.crm_consent_latest, public.crm_consent_anchor, public.crm_membership_base, public.crm_segment_base,
              public.crm_biennial_due, public.crm_result_notice_due to service_role;
