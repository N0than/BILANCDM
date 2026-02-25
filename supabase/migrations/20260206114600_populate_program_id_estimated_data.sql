/*
  # Populate program_id in estimated_data

  1. Changes
    - For estimated_data records without program_id, assign them to the device_programs
    - If a device has multiple programs, duplicate the estimated data for each program
    - This ensures estimated data is tied to specific programs for accurate filtering

  2. Notes
    - Only processes records where device_id is set and program_id is NULL
    - Creates one row per device-program combination
*/

DO $$
DECLARE
  est_record RECORD;
  prog_record RECORD;
  new_id uuid;
BEGIN
  FOR est_record IN 
    SELECT ed.id, ed.device_id, ed.advertiser_id, ed.date_2025, ed.date_transposed, 
           ed.target_performances, ed.created_at
    FROM estimated_data ed
    WHERE ed.device_id IS NOT NULL 
    AND ed.program_id IS NULL
  LOOP
    FOR prog_record IN
      SELECT dp.program_id
      FROM device_programs dp
      WHERE dp.device_id = est_record.device_id
    LOOP
      new_id := gen_random_uuid();
      INSERT INTO estimated_data (id, advertiser_id, device_id, program_id, date_2025, date_transposed, target_performances, created_at)
      VALUES (new_id, est_record.advertiser_id, est_record.device_id, prog_record.program_id, 
              est_record.date_2025, est_record.date_transposed, est_record.target_performances, est_record.created_at);
    END LOOP;
    
    DELETE FROM estimated_data WHERE id = est_record.id;
  END LOOP;
END $$;