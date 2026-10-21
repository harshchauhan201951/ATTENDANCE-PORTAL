-- Track the device and lifecycle of each student sign-in session.
-- Run this once in the RACER Academy Supabase SQL editor.

alter table public.student_login_activity
  add column if not exists device_type text not null default 'Unknown',
  add column if not exists event_type text not null default 'login',
  add column if not exists session_id uuid,
  add column if not exists last_seen_at timestamptz;

update public.student_login_activity
set last_seen_at = login_at
where last_seen_at is null;

create index if not exists idx_student_login_activity_session
  on public.student_login_activity (session_id, login_at desc);

create index if not exists idx_student_login_activity_student_recent
  on public.student_login_activity (student_id, login_at desc);
