-- 0020_fix_set_updated_at.sql
-- Make the set_updated_at trigger tolerant of tables that don't have an
-- updated_at column, and drop it from tables where it never belonged.

-- 1. Rewrite the function so it checks for the column existence.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- Only touch updated_at if the row actually has that field.
  if (to_jsonb(new) ? 'updated_at') then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- 2. Defensively drop the trigger from tables that shouldn't have it.
--    We only attach it to tables that DO have an updated_at column.
do $$
declare
  r record;
begin
  for r in
    select event_object_schema as sch, event_object_table as tbl
    from information_schema.triggers
    where trigger_name = 'set_updated_at'
  loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = r.sch
        and table_name = r.tbl
        and column_name = 'updated_at'
    ) then
      execute format(
        'drop trigger if exists set_updated_at on %I.%I;',
        r.sch, r.tbl
      );
    end if;
  end loop;
end $$;