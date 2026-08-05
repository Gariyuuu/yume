-- Phase 7 checklist: "upload scanning + file-type/size restrictions."
-- `file_size_limit`/`allowed_mime_types` are real columns on
-- storage.buckets that Supabase Storage enforces server-side on every
-- upload (not just a client-side check) — see
-- docs/phase-1/04-security-rls.md §6. This is the file-type/size half of
-- that requirement.
--
-- "Scanning" (malware/content moderation on uploaded bytes) is NOT
-- implemented: that needs a third-party scanning API this environment
-- has no credentials for, and Supabase Storage has no built-in scanner.
-- Documented as a known gap rather than faked — see the Phase 7 report.
--
-- user-uploaded chat images (`uploads`) deliberately exclude SVG (an SVG
-- can carry an embedded <script>) — the `room-assets` bucket allows it
-- because those are only ever inserted by migrations/seed scripts
-- (0002_rls.sql: no client insert policy on that bucket), never by
-- arbitrary users.
update storage.buckets set file_size_limit = 5242880, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'] where id = 'avatars';
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'] where id = 'room-assets';
update storage.buckets set file_size_limit = 10485760, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/gif'] where id = 'uploads';
