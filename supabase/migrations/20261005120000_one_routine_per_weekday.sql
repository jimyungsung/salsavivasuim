-- One routine per weekday in a menu. Members copy a menu one routine per
-- weekday, so two on the same day meant one silently vanished from every
-- member's week. setRoutineWeekday swaps instead of clashing; this makes the
-- rule hold even for a write that does not go through it. A routine with no
-- weekday (the quick drills, a routine being moved) is not counted.
create unique index routines_one_per_weekday
  on public.routines (menu_id, weekday)
  where weekday is not null;
