/*
  # Add program_id to actual_data table

  1. Changes
    - Add `program_id` column to `actual_data` table (nullable foreign key to programs)
    - This allows filtering actual data by program for device-specific performance calculations
    - Add index for better query performance

  2. Important Notes
    - Existing data will have NULL program_id (imported before this change)
    - New imports will populate program_id when data is matched via program
    - Product-based imports will still have NULL program_id
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'actual_data' AND column_name = 'program_id'
  ) THEN
    ALTER TABLE actual_data ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_actual_data_program ON actual_data(program_id);
  END IF;
END $$;