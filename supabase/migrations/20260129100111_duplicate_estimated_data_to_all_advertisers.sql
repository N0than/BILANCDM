/*
  # Duplicate estimated data to all advertisers

  1. Changes
    - Copy all estimated_data from McDonald's to other advertisers (Betclic, Coca Cola, Uber Eats)
    - Maintain same target_performances and other data
    - Each advertiser will now have the same estimated data
*/

DO $$
DECLARE
  mcdonald_id uuid;
  advertiser record;
BEGIN
  -- Get McDonald's ID
  SELECT id INTO mcdonald_id FROM advertisers WHERE name = 'McDonalds' LIMIT 1;
  
  IF mcdonald_id IS NOT NULL THEN
    -- Copy data for each other advertiser
    FOR advertiser IN SELECT id FROM advertisers WHERE id != mcdonald_id
    LOOP
      INSERT INTO estimated_data (advertiser_id, date_2025, date_transposed, target_performances)
      SELECT 
        advertiser.id,
        date_2025,
        date_transposed,
        target_performances
      FROM estimated_data
      WHERE advertiser_id = mcdonald_id;
    END LOOP;
  END IF;
END $$;