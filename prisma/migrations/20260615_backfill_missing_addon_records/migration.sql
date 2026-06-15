-- Backfill missing registration_addon records
-- These parents paid for add-ons via Stripe but records were dropped because
-- the checkout code skipped non-UUID addon IDs while still charging for them.

-- Camp ed480735 (June 15 "All Girls Sports Camp") addon UUIDs:
--   Empowered Athlete Tee  = d7ddcd59-1b4b-4741-8042-a29dd93bd0a2 ($25)
--   Daily Fuel Pack $45    = c6228b71-1e5d-4a96-b296-388f4bfc5697
--   Fierce Wristband Pack  = 24e7481c-3dec-4f83-ad4e-9598d71d25b4 ($8)

INSERT INTO registration_addons (registration_id, addon_id, quantity, price_cents)
VALUES
  -- 1. Christie Craighead / Madison — Empowered Athlete Tee $25
  ('9b07c2c7-0579-4741-943d-70aa47f71557', 'd7ddcd59-1b4b-4741-8042-a29dd93bd0a2', 1, 2500),
  -- 2. Samantha D'Amico / Ryan — Empowered Athlete Tee $25
  ('d778e5a1-6215-4672-8f98-9e559990c78b', 'd7ddcd59-1b4b-4741-8042-a29dd93bd0a2', 1, 2500),
  -- 3. Carese Hernando / Bailey — Empowered Athlete Tee $25
  ('99c3b6d7-967e-44cb-ae2b-7cf4c1ff3675', 'd7ddcd59-1b4b-4741-8042-a29dd93bd0a2', 1, 2500),
  -- 4. Kate Martin / Callie — Empowered Athlete Tee $25
  ('427b99b4-e5e9-4c2f-b038-85e2e99198da', 'd7ddcd59-1b4b-4741-8042-a29dd93bd0a2', 1, 2500),
  -- 5. Sarai Williams / Selah — Empowered Athlete Tee $25
  ('b837bef1-08b1-44bd-b19a-72bddd4b3841', 'd7ddcd59-1b4b-4741-8042-a29dd93bd0a2', 1, 2500),
  -- 6a. Lina Noon Rakow / Mila — Empowered Athlete Tee $25
  ('795a9e56-be27-45fe-949f-fac4ce9b9a52', 'd7ddcd59-1b4b-4741-8042-a29dd93bd0a2', 1, 2500),
  -- 6b. Lina Noon Rakow / Mila — Daily Fuel Pack $45
  ('795a9e56-be27-45fe-949f-fac4ce9b9a52', 'c6228b71-1e5d-4a96-b296-388f4bfc5697', 1, 4500),
  -- 7. Lynn Rodriguez / Lilliana — Daily Fuel Pack $45
  ('e2e65ed2-133f-4631-8330-2809bd0fc2a0', 'c6228b71-1e5d-4a96-b296-388f4bfc5697', 1, 4500),
  -- 8. Aubrey Rodriguez — Daily Fuel Pack $45
  ('16615e88-023f-4484-8ead-9e99d2d1278e', 'c6228b71-1e5d-4a96-b296-388f4bfc5697', 1, 4500),
  -- 9. Rebecca Sanders / Valentina — Daily Fuel Pack $45
  ('7e2a565c-590f-4fd9-8334-4cf388a88675', 'c6228b71-1e5d-4a96-b296-388f4bfc5697', 1, 4500),
  -- 10. Rebecca Sanders / Mila — Daily Fuel Pack $45
  ('ccec9e61-a1ac-4f38-8209-3ddaacbcca90', 'c6228b71-1e5d-4a96-b296-388f4bfc5697', 1, 4500),
  -- 11. Anne Stockeland / Briella — Fierce Wristband Pack $8
  ('58692f7f-dc5b-46af-82ee-6b49cc2c182f', '24e7481c-3dec-4f83-ad4e-9598d71d25b4', 1, 800),
  -- 12. Muyi Yang / Yiyi — Daily Fuel Pack $45
  ('9c4c58ba-7315-4457-bfb4-f76edf867c01', 'c6228b71-1e5d-4a96-b296-388f4bfc5697', 1, 4500)
ON CONFLICT DO NOTHING;

