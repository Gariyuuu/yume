-- System room templates from docs/phase-1/01-prd.md. Empty starting
-- object sets for now — real decoration objects get added once the
-- Kenney asset import lands in Phase 4 (see ASSET_LICENSES.md).
insert into room_templates (name, description, is_system_template, objects)
values
  ('Cozy bedroom', 'A warm, low-lit hangout with soft furniture.', true, '[]'),
  ('Study café', 'A quiet space built around the study-mode timer.', true, '[]'),
  ('Movie room', 'Couch seating facing a shared screen for YouTube nights.', true, '[]'),
  ('Gaming room', 'Room-hub games front and center.', true, '[]'),
  ('Music lounge', 'Built around the shared Spotify queue.', true, '[]'),
  ('Picnic', 'An outdoor-styled blanket-and-sky room.', true, '[]'),
  ('Blank canvas', 'Nothing but four walls — decorate from scratch.', true, '[]'),
  ('Seasonal room', 'Rotates decorations with the current season.', true, '[]')
on conflict do nothing;
