 -- Migration Script: Insert municipality Roles
INSERT INTO municipality_role (name) VALUES
  ('municipal public relations officer'),
  ('municipal administrator'),
  ('technical office staff member'),
  ('finance and budget officer'),
  ('urban planning specialist'),
  ('public works project manager'),
  ('social services caseworker'),
  ('environmental protection officer'),
  ('cultural affairs coordinator'),
  ('education and youth services officer'),
  ('procurement and contracts specialist'),
  ('legal affairs counsel'),
  ('it systems administrator'),
  ('traffic and mobility coordinator'),
  ('civil protection and emergency planner'),
  ('sanitation and waste management officer'),
  ('parks and green spaces officer'),
  ('civil registry clerk')
ON CONFLICT (name) DO NOTHING;