-- The picture's size, so the player can lay itself out before the video loads.
--
-- Footage is not all 16:9. A phone filmed upright gives a tall picture, and a
-- tall picture in a 16:9 frame is a narrow strip between two black bars. The
-- session page lays a portrait video out differently — height-bound, with the
-- steps beside it rather than below — and it has to know which layout to use on
-- first paint, not half a second later when the browser has read the metadata.
--
-- Written by the encoding webhook from Cloudflare's input.width / input.height,
-- which are the dimensions after rotation — the same shape the viewer sees. The
-- player still measures videoWidth / videoHeight once loaded and trusts that
-- over this, so a wrong or missing value costs one layout shift, never a wrong
-- picture.

alter table public.videos
  add column width  integer,
  add column height integer,
  add constraint videos_dimensions_valid check (
    (width is null and height is null) or (width > 0 and height > 0)
  );

comment on column public.videos.width is
  'Picture width in pixels, from Cloudflare on encode. Null until known.';
comment on column public.videos.height is
  'Picture height in pixels, from Cloudflare on encode. Null until known.';
