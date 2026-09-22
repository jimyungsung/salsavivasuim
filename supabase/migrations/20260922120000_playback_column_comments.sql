-- What the delivery columns actually hold, now that the host is Cloudflare Stream.
--
-- hls_playback_id is the one that would mislead: it does not hold a playback id.
-- Cloudflare gives every account a `customer-xxxx` subdomain that all playback
-- URLs sit under, and does not expose it as its own field — it appears only
-- inside the playback URLs the API returns. So it is read off one of those once,
-- on encode, and kept here. A signed URL is built as
--   https://<hls_playback_id>.cloudflarestream.com/<token>/manifest/video.m3u8

comment on column public.videos.provider_uid is
  'Cloudflare Stream video uid. Written before the file is sent, so a failed '
  'upload still leaves the row pointing at the asset it was reaching for.';

comment on column public.videos.hls_playback_id is
  'The customer-xxxx subdomain playback URLs sit under, NOT a playback id. '
  'Signed HLS and MP4 URLs are built from it plus a short-lived RS256 token.';

comment on column public.videos.mp4_url is
  'Unused with Cloudflare: the MP4 rendition is a signed path under the same '
  'customer subdomain, so it is derived at play time rather than stored.';

comment on column public.videos.status is
  'Only the encoding webhook may set ready. The back office can set uploading '
  'or processing, never ready — a row must not claim to be playable on trust.';
