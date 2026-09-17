-- Teach swap_position about areas.
--
-- Areas sit at the top of the tree, so they have no parent column to scope the
-- swap by: their `position` is unique across the whole table. Everything below
-- them swaps within a parent. Same deferrable-constraint trick either way.
create or replace function public.swap_position(
  p_table     text,
  p_id        uuid,
  p_direction text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_parent_col text;
  v_parent     uuid;
  v_pos        integer;
  v_other_id   uuid;
  v_other_pos  integer;
  v_cmp        text;
  v_sort       text;
begin
  if p_table = 'areas' then
    v_parent_col := null;                 -- ordered globally
  else
    v_parent_col := case p_table
      when 'programs' then 'area_id'
      when 'sessions' then 'program_id'
      when 'videos'   then 'session_id'
    end;
    if v_parent_col is null then
      raise exception 'swap_position: unsupported table %', p_table;
    end if;
  end if;

  if p_direction = 'up' then
    v_cmp := '<'; v_sort := 'desc';
  elsif p_direction = 'down' then
    v_cmp := '>'; v_sort := 'asc';
  else
    raise exception 'swap_position: direction must be up or down';
  end if;

  if v_parent_col is null then
    execute format('select position from public.%I where id = $1', p_table)
       into v_pos using p_id;
    if v_pos is null then
      raise exception 'swap_position: no such row';
    end if;
    execute format(
        'select id, position from public.%I where position %s $1 order by position %s limit 1',
        p_table, v_cmp, v_sort)
       into v_other_id, v_other_pos using v_pos;
  else
    execute format('select %I, position from public.%I where id = $1', v_parent_col, p_table)
       into v_parent, v_pos using p_id;
    if v_parent is null then
      raise exception 'swap_position: no such row';
    end if;
    execute format(
        'select id, position from public.%I where %I = $1 and position %s $2 order by position %s limit 1',
        p_table, v_parent_col, v_cmp, v_sort)
       into v_other_id, v_other_pos using v_parent, v_pos;
  end if;

  -- Already first or last. Not an error; the button simply does nothing.
  if v_other_id is null then
    return;
  end if;

  execute format('update public.%I set position = $1 where id = $2', p_table)
    using v_other_pos, p_id;
  execute format('update public.%I set position = $1 where id = $2', p_table)
    using v_pos, v_other_id;
end;
$$;

revoke execute on function public.swap_position(text, uuid, text) from public, anon;
grant  execute on function public.swap_position(text, uuid, text) to authenticated;
