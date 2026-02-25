/*
  # Make advertiser_id nullable in estimated_data

  1. Changes
    - Allow advertiser_id to be NULL in estimated_data table
    - This enables importing data without assigning to a specific advertiser first
    - Assignments happen later via advertiser_devices associations in Settings

  2. Important Notes
    - Device management is now the primary way to organize estimated data
    - Advertiser assignments are made through the advertiser_devices junction table
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estimated_data' AND column_name = 'advertiser_id'
  ) THEN
    ALTER TABLE estimated_data ALTER COLUMN advertiser_id DROP NOT NULL;
  END IF;
END $$;