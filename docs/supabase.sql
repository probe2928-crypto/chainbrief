-- 체인브리프 커뮤니티 게시판 스키마 (Supabase SQL Editor에서 한 번 실행)
-- 익명 게시판: 닉네임 + 비밀번호(삭제용). 비밀번호는 bcrypt 해시로만 저장.
-- 방문자는 공개 컬럼만 읽을 수 있고, 쓰기는 아래 함수로만 가능해요.

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  category text not null default '자유',
  nickname text not null,
  title text not null,
  body text not null,
  password_hash text not null,
  ip_hash text,
  views int not null default 0,
  likes int not null default 0,
  comment_count int not null default 0,
  hidden boolean not null default false
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_views_idx on public.posts (views desc);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  nickname text not null,
  body text not null,
  password_hash text not null,
  ip_hash text,
  hidden boolean not null default false
);
create index if not exists comments_post_idx on public.comments (post_id, id);

-- 읽기: 숨김 아닌 글만, 공개 컬럼만
alter table public.posts enable row level security;
alter table public.comments enable row level security;
drop policy if exists "public read posts" on public.posts;
create policy "public read posts" on public.posts for select using (not hidden);
drop policy if exists "public read comments" on public.comments;
create policy "public read comments" on public.comments for select using (not hidden);

revoke all on public.posts, public.comments from anon, authenticated;
grant select (id, created_at, category, nickname, title, body, views, likes, comment_count) on public.posts to anon, authenticated;
grant select (id, post_id, created_at, nickname, body) on public.comments to anon, authenticated;

-- 요청자 IP 해시 (도배 방지용, 원본 IP는 저장하지 않음)
create or replace function public._ip_hash() returns text language sql stable set search_path = public, extensions as $$
  select encode(digest(coalesce(
    nullif(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1), ''),
    current_setting('request.headers', true)::json->>'cf-connecting-ip', 'unknown'), 'sha256'), 'hex')
$$;

create or replace function public.create_post(p_category text, p_nickname text, p_password text, p_title text, p_body text)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint; v_ip text := public._ip_hash();
begin
  if char_length(trim(p_nickname)) not between 1 and 20 then raise exception '닉네임은 1~20자로 입력해 주세요.'; end if;
  if char_length(p_password) not between 4 and 40 then raise exception '비밀번호는 4자 이상 입력해 주세요.'; end if;
  if char_length(trim(p_title)) not between 2 and 100 then raise exception '제목은 2~100자로 입력해 주세요.'; end if;
  if char_length(trim(p_body)) not between 2 and 10000 then raise exception '내용은 2자 이상 입력해 주세요.'; end if;
  if p_category not in ('자유','분석','상장·급등','질문') then p_category := '자유'; end if;
  if exists (select 1 from posts where ip_hash = v_ip and created_at > now() - interval '60 seconds') then
    raise exception '글은 1분에 한 번만 쓸 수 있어요.';
  end if;
  if (select count(*) from posts where ip_hash = v_ip and created_at > now() - interval '1 hour') >= 10 then
    raise exception '잠시 후 다시 시도해 주세요.';
  end if;
  insert into posts (category, nickname, title, body, password_hash, ip_hash)
  values (p_category, trim(p_nickname), trim(p_title), trim(p_body), crypt(p_password, gen_salt('bf')), v_ip)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_comment(p_post_id bigint, p_nickname text, p_password text, p_body text)
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare v_id bigint; v_ip text := public._ip_hash();
begin
  if not exists (select 1 from posts where id = p_post_id and not hidden) then raise exception '삭제됐거나 없는 글이에요.'; end if;
  if char_length(trim(p_nickname)) not between 1 and 20 then raise exception '닉네임은 1~20자로 입력해 주세요.'; end if;
  if char_length(p_password) not between 4 and 40 then raise exception '비밀번호는 4자 이상 입력해 주세요.'; end if;
  if char_length(trim(p_body)) not between 1 and 2000 then raise exception '댓글은 1~2000자로 입력해 주세요.'; end if;
  if exists (select 1 from comments where ip_hash = v_ip and created_at > now() - interval '15 seconds') then
    raise exception '댓글은 15초에 한 번만 쓸 수 있어요.';
  end if;
  insert into comments (post_id, nickname, body, password_hash, ip_hash)
  values (p_post_id, trim(p_nickname), trim(p_body), crypt(p_password, gen_salt('bf')), v_ip) returning id into v_id;
  update posts set comment_count = comment_count + 1 where id = p_post_id;
  return v_id;
end $$;

create or replace function public.view_post(p_id bigint)
returns table (id bigint, created_at timestamptz, category text, nickname text, title text, body text, views int, likes int, comment_count int)
language plpgsql security definer set search_path = public as $$
begin
  update posts set views = posts.views + 1 where posts.id = p_id and not hidden;
  return query select p.id, p.created_at, p.category, p.nickname, p.title, p.body, p.views, p.likes, p.comment_count
    from posts p where p.id = p_id and not p.hidden;
end $$;

create or replace function public.like_post(p_id bigint)
returns int language sql security definer set search_path = public as $$
  update posts set likes = likes + 1 where id = p_id and not hidden returning likes
$$;

create or replace function public.delete_post(p_id bigint, p_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  update posts set hidden = true where id = p_id and password_hash = crypt(p_password, password_hash);
  return found;
end $$;

create or replace function public.delete_comment(p_id bigint, p_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_post bigint;
begin
  update comments set hidden = true where id = p_id and not hidden and password_hash = crypt(p_password, password_hash) returning post_id into v_post;
  if v_post is null then return false; end if;
  update posts set comment_count = greatest(comment_count - 1, 0) where id = v_post;
  return true;
end $$;

revoke all on function public._ip_hash() from anon, authenticated, public;
grant execute on function public.create_post(text, text, text, text, text), public.create_comment(bigint, text, text, text),
  public.view_post(bigint), public.like_post(bigint), public.delete_post(bigint, text), public.delete_comment(bigint, text) to anon, authenticated;
