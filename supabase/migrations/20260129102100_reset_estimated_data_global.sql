/*
  # Reset Estimated Data to Global Model

  1. Data Cleanup
    - Delete all estimated_data records to start fresh
  
  2. Architecture Change
    - Estimated data will now be treated as global (not per-advertiser)
    - All advertisers will share the same estimated performance data
    - The advertiser_id column remains for backward compatibility but will be NULL for global data
  
  3. Principle
    - Estimated performances represent forecast data for the entire campaign
    - These should not be duplicated per advertiser
    - All advertisers reference the same estimated data pool
*/

DELETE FROM estimated_data;