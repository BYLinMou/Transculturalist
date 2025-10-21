-- 知识库相关表结构与策略（Demo 版）
-- 使用前请在 Supabase SQL Editor 中运行本脚本，并替换桶名保持一致

-- 1. 基础表：files
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  filename text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  status text not null default 'pending',
  processing_error text,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.files
  drop constraint if exists files_user_fk;
alter table public.files
  add constraint files_user_fk foreign key (user_id) references auth.users (id) on delete set null;

create index if not exists files_user_idx on public.files (user_id);
create index if not exists files_status_idx on public.files (status);
alter table public.files drop constraint if exists files_status_check;
alter table public.files
  add constraint files_status_check
  check (status in ('pending', 'processing', 'ready', 'failed'));

-- 2. 基础表：knowledge_entries
create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null,
  user_id uuid,
  theme_name jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  tags jsonb[] default '{}'::jsonb[],
  metadata jsonb default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.knowledge_entries
  add column if not exists user_id uuid;

alter table public.knowledge_entries
  drop constraint if exists knowledge_entries_file_fk;
alter table public.knowledge_entries
  add constraint knowledge_entries_file_fk foreign key (file_id) references public.files (id) on delete cascade;
alter table public.knowledge_entries
  drop constraint if exists knowledge_entries_user_fk;
alter table public.knowledge_entries
  add constraint knowledge_entries_user_fk foreign key (user_id) references auth.users (id) on delete set null;

create index if not exists knowledge_entries_file_idx on public.knowledge_entries (file_id);
create index if not exists knowledge_entries_user_idx on public.knowledge_entries (user_id);
create index if not exists knowledge_entries_theme_gin on public.knowledge_entries using gin (theme_name jsonb_path_ops);
create index if not exists knowledge_entries_tags_gin on public.knowledge_entries using gin (tags);

-- 回填已有資料的 user_id（若存在舊資料）
update public.knowledge_entries ke
set user_id = f.user_id
from public.files f
where ke.user_id is null
  and ke.file_id = f.id;

-- 3. 行级安全策略（RLS）
alter table public.files enable row level security;
alter table public.knowledge_entries enable row level security;

-- Files：仅本人可访问
drop policy if exists "Files can be managed by owner" on public.files;
drop policy if exists "Files readable by anyone" on public.files;
drop policy if exists "Files insert by uploader" on public.files;
drop policy if exists "Files update by owner" on public.files;
drop policy if exists "Files delete by owner" on public.files;
create policy "Files readable by anyone" on public.files
  for select
  using (true);

create policy "Files insert by owner" on public.files
  for insert
  with check (auth.uid() = user_id);

create policy "Files update by owner" on public.files
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Files delete by owner" on public.files
  for delete
  using (auth.uid() = user_id);

-- Knowledge Entries：存储所属用户
drop policy if exists "Knowledge entries readable by owner" on public.knowledge_entries;
drop policy if exists "Entries visible to file owner" on public.knowledge_entries;
drop policy if exists "Knowledge entries managed by owner" on public.knowledge_entries;
drop policy if exists "Knowledge entries readable by anyone" on public.knowledge_entries;
drop policy if exists "Knowledge entries insert" on public.knowledge_entries;
drop policy if exists "Knowledge entries update by owner" on public.knowledge_entries;
drop policy if exists "Knowledge entries delete by owner" on public.knowledge_entries;
create policy "Knowledge entries readable by anyone" on public.knowledge_entries
  for select
  using (true);

create policy "Knowledge entries insert" on public.knowledge_entries
  for insert
  with check (auth.uid() = user_id);

create policy "Knowledge entries update by owner" on public.knowledge_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Knowledge entries delete by owner" on public.knowledge_entries
  for delete
  using (auth.uid() = user_id);

-- 4. 触发器：自动更新时间戳
create or replace function public.touch_files_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists files_touch_updated_at on public.files;
create trigger files_touch_updated_at
before update on public.files
for each row execute function public.touch_files_updated_at();

-- 6. 权限：允许匿名与认证用户访问
grant usage on schema public to anon, authenticated;
grant select on public.files to anon;
grant select, insert, update, delete on public.files to authenticated;
grant select on public.knowledge_entries to anon;
grant select, insert, update, delete on public.knowledge_entries to authenticated;

-- 5. 建议：创建公开存储桶（在 Supabase Storage UI 中执行）
--    桶名：transcultural-knowledge
--    策略：保持 Public 读取，写入/删除由服务端完成
