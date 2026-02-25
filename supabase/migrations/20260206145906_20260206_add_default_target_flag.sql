/*
  # Add default target flag

  1. Changes to targets table
    - Add `is_default` boolean column to mark the default target
    - Set Hommes 25-49 as the default target
*/

-- Add is_default column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'targets' AND column_name = 'is_default'
  ) THEN
    ALTER TABLE targets ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Set Hommes 25-49 as the default target (set all to false first, then set Hommes 25-49 to true)
UPDATE targets SET is_default = false;
UPDATE targets SET is_default = true WHERE name = 'Hommes 25-49';
