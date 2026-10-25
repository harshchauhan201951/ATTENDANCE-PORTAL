-- Add the RACER Academy roll number to each matching student profile.
-- Existing login/student IDs remain unchanged. Inactive students are included.

alter table public.students
  add column if not exists roll_number text;

do $$
declare
  updated_count integer;
begin
  update public.students as student
  set roll_number = roll_list.roll_number
  from (values
    ('STU1001', 'RACER-AC01'),
    ('STU1002', 'RACER-AC02'),
    ('STU1003', 'RACER-CV01'),
    ('STU1004', 'RACER-DS01'),
    ('STU1005', 'RACER-DC01'),
    ('STU1006', 'RACER-YS01'),
    ('STU1007', 'RACER-MC01'),
    ('STU1008', 'RACER-PC01'),
    ('STU1009', 'RACER-PC02'),
    ('STU1010', 'RACER-PC03'),
    ('STU1011', 'RACER-RV01'),
    ('STU1012', 'RACER-SC01'),
    ('STU1013', 'RACER-AC03'),
    ('STU1014', 'RACER-AC04'),
    ('STU1015', 'RACER-RC01'),
    ('STU1016', 'RACER-AC05'),
    ('STU1017', 'RACER-DC02'),
    ('STU1018', 'RACER-NC01'),
    ('STU1019', 'RACER-AC06')
  ) as roll_list(student_username, roll_number)
  where student.student_username = roll_list.student_username;

  get diagnostics updated_count = row_count;
  if updated_count <> 19 then
    raise exception 'Expected to assign 19 student roll numbers, updated % rows.', updated_count;
  end if;
end $$;

create unique index if not exists students_roll_number_unique
  on public.students (roll_number)
  where roll_number is not null;
