/*
  # Add default target to advertiser_devices

  1. Changes
    - Add `default_target_id` column to `advertiser_devices` table
    - This column stores the reference target for each advertiser on a device
    - Foreign key to `targets` table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advertiser_devices' AND column_name = 'default_target_id'
  ) THEN
    ALTER TABLE advertiser_devices ADD COLUMN default_target_id uuid REFERENCES targets(id) ON DELETE SET NULL;
  END IF;
END $$;