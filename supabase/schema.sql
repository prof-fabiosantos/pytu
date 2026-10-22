-- Dedicated server-only document store. No client read/write policies.
create table if not exists public.pytu_documents (
 path text primary key,
 value jsonb not null,
 revision uuid not null default gen_random_uuid()
);
alter table public.pytu_documents enable row level security;
revoke all on public.pytu_documents from anon, authenticated;
grant select, insert, update on public.pytu_documents to service_role;
