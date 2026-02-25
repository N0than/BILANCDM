/*
  # Add Programs and Device Programs Tables

  1. New Tables
    - `programs`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Name of the program from Excel column J
      - `created_at` (timestamp)
    - `device_programs`
      - `id` (uuid, primary key)
      - `device_id` (uuid, foreign key to devices)
      - `program_id` (uuid, foreign key to programs)
      - `created_at` (timestamp)
      - Unique constraint on (device_id, program_id)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read/insert/delete access

  3. Purpose
    - Programs represent the items from Excel column J (e.g., "BA L1", "BB", etc.)
    - Each device can have multiple programs assigned
    - This allows matching actual data imports with configured device programs
*/

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(device_id, program_id)
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to programs"
  ON programs FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert to programs"
  ON programs FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public delete programs"
  ON programs FOR DELETE TO public USING (true);

CREATE POLICY "Allow public read access to device_programs"
  ON device_programs FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert to device_programs"
  ON device_programs FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public delete device_programs"
  ON device_programs FOR DELETE TO public USING (true);
