/*
  # Add program_id to estimated_data table

  1. Changes
    - Add `program_id` column to `estimated_data` table (nullable foreign key to programs)
    - This allows filtering estimated data by program for program-specific performance calculations
    - Add index for better query performance

  2. Important Notes
    - Existing data will have NULL program_id
    - New data should populate program_id when applicable
    - This ensures consistent filtering between estimated and actual data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estimated_data' AND column_name = 'program_id'
  ) THEN
    ALTER TABLE estimated_data ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_estimated_data_program ON estimated_data(program_id);
  END IF;
END $$;