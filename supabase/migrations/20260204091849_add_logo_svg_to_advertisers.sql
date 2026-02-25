/*
  # Add logo SVG support to advertisers

  1. Changes
    - Add `logo_svg` column to `advertisers` table to store SVG content as text
    
  2. Notes
    - SVG files will be stored as text directly in the database
    - This allows dynamic logo management without file system dependencies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'advertisers' AND column_name = 'logo_svg'
  ) THEN
    ALTER TABLE advertisers ADD COLUMN logo_svg text;
  END IF;
END $$;