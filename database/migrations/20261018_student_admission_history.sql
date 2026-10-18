-- Preserve the original admission date and every later re-admission date.
-- Run this once in the RACER Academy Supabase SQL editor before enabling
-- the teacher's Activate / Re-admit action.

alter table public.students
  add column if not exists admission_history jsonb not null default '[]'::jsonb;

-- Seed existing students with their current admission date so their history
-- is retained before any future re-admission changes it.
update public.students
set admission_history = jsonb_build_array(
  jsonb_build_object('date', admission_date::text, 'type', 'Initial admission')
)
where admission_date is not null
  and admission_history = '[]'::jsonb;
