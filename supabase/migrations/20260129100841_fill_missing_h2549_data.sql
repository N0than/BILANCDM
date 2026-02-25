/*
  # Fill missing H25-49 target data

  1. Changes
    - Copy Hommes 25-49 performance values to H25-49 for all estimated_data records
    - Fixes data duplication issue where H25-49 was empty while Hommes 25-49 had values
*/

UPDATE estimated_data
SET target_performances = jsonb_set(
  target_performances,
  '{87baa879-b8a3-4311-b310-93d06c86a836}',
  target_performances->'96ec9b17-a05e-4701-98cf-e490c9b072bd'
)
WHERE target_performances->>'87baa879-b8a3-4311-b310-93d06c86a836' IS NULL;