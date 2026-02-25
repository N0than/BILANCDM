/*
  # Add Default Targets and Demo Data

  1. Insert Default Targets
    - Add common TV audience targets like 4+, FRDA, H25-49, F25-49, etc.
  
  2. Insert Demo Data (optional)
    - Add sample estimated and actual data for testing
*/

-- Insert default targets if they don't exist
INSERT INTO targets (name, column_index) VALUES
  ('4+', 1),
  ('FRDA', 2),
  ('H25-49', 3),
  ('F25-49', 4),
  ('25-49', 5),
  ('15-24', 6),
  ('25-34', 7),
  ('35-49', 8),
  ('50+', 9),
  ('CSP+', 10)
ON CONFLICT (name) DO NOTHING;