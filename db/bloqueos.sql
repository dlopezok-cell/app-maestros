-- Tabla de bloqueos de usuarios desde el chat (App Store Guideline 1.2 - UGC).
-- Ejecutar en Supabase → SQL Editor (proyecto hwacptgxkzovesgduuma).
-- Cada fila = un usuario (bloqueador) bloqueó la conversación de un presupuesto+maestro.

create table if not exists public.bloqueos (
  id             bigserial primary key,
  presupuesto_id uuid,
  maestro_id     uuid,
  bloqueador_id  uuid not null default auth.uid(),
  bloqueador_rol text,
  motivo         text,
  creado_en      timestamptz not null default now()
);

-- Evita duplicados del mismo bloqueo
create unique index if not exists bloqueos_unq
  on public.bloqueos (presupuesto_id, maestro_id, bloqueador_id);

alter table public.bloqueos enable row level security;

-- El usuario solo puede crear y ver SUS propios bloqueos.
drop policy if exists "bloqueos_insert_own" on public.bloqueos;
create policy "bloqueos_insert_own" on public.bloqueos
  for insert to authenticated
  with check (auth.uid() = bloqueador_id);

drop policy if exists "bloqueos_select_own" on public.bloqueos;
create policy "bloqueos_select_own" on public.bloqueos
  for select to authenticated
  using (auth.uid() = bloqueador_id);
