/*
  # Populate estimated_data.advertiser_id from advertiser_devices

  1. Changes
    - Update all estimated_data records to set advertiser_id based on the advertiser_devices junction table
    - Match rows by device_id
    - This fixes the issue where all estimated_data rows had NULL advertiser_id

  2. Important Notes
    - This is a one-time data fix to align with the application logic
    - After this, estimated_data.advertiser_id will correctly reference the advertiser through device associations
*/

UPDATE estimated_data ed
SET advertiser_id = ad.advertiser_id
FROM advertiser_devices ad
WHERE ed.device_id = ad.device_id
AND ed.advertiser_id IS NULL;