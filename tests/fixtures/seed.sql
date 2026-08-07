insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test',    '{"firstname":"Olivia"}'),
  ('22222222-2222-2222-2222-222222222222', 'delegate@example.test', '{"firstname":"Diego"}'),
  ('33333333-3333-3333-3333-333333333333', 'outsider@example.test', '{"firstname":"Ove"}'),
  ('44444444-4444-4444-4444-444444444444', 'client@example.test',   '{"firstname":"Camille"}');

update profiles set role = 'agent' where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

insert into properties (id, agent_id, title, city, price, is_published) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111',
   'Published loft', 'Lyon', 320000, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
   'Draft townhouse', 'Lyon', 480000, false);
