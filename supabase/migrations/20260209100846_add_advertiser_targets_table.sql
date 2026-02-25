/*
  # Add advertiser_targets junction table

  1. New Tables
    - `advertiser_targets`
      - `id` (uuid, primary key)
      - `advertiser_id` (uuid, foreign key to advertisers)
      - `target_id` (uuid, foreign key to targets)
      - `created_at` (timestamp)
      - Unique constraint: (advertiser_id, target_id)

  2. Security
    - Enable RLS on `advertiser_targets` table
    - Add policy for public SELECT access
    - Add policy for public INSERT/UPDATE/DELETE access
*/

CREATE TABLE IF NOT EXISTS advertiser_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(advertiser_id, target_id)
);

ALTER TABLE advertiser_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to advertiser_targets"
  ON advertiser_targets
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow public insert advertiser_targets"
  ON advertiser_targets
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Allow public update advertiser_targets"
  ON advertiser_targets
  FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete advertiser_targets"
  ON advertiser_targets
  FOR DELETE
  TO authenticated, anon
  USING (true);