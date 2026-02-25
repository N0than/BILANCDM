/*
  # Add Devices Management and Fix RLS

  1. New Tables
    - `devices`
      - `id` (uuid, primary key)
      - `name` (text) - Device name (e.g., from Excel sheet name)
      - `created_at` (timestamptz)
    
    - `advertiser_devices`
      - `id` (uuid, primary key)
      - `advertiser_id` (uuid, foreign key)
      - `device_id` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `estimated_data`
      - Added `device_id` column (nullable, foreign key)

  3. Security
    - Enable RLS on new tables
    - Add DELETE and UPDATE policies for advertisers
    - Add full access policies for new tables
*/

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create advertiser_devices junction table
CREATE TABLE IF NOT EXISTS advertiser_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(advertiser_id, device_id)
);

-- Add device_id column to estimated_data if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estimated_data' AND column_name = 'device_id'
  ) THEN
    ALTER TABLE estimated_data ADD COLUMN device_id uuid REFERENCES devices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_advertiser_devices_advertiser ON advertiser_devices(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_advertiser_devices_device ON advertiser_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_estimated_data_device ON estimated_data(device_id);

-- Enable RLS on new tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertiser_devices ENABLE ROW LEVEL SECURITY;

-- Create policies for devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'devices' AND policyname = 'Allow public read access to devices'
  ) THEN
    CREATE POLICY "Allow public read access to devices"
      ON devices FOR SELECT TO public USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'devices' AND policyname = 'Allow public insert to devices'
  ) THEN
    CREATE POLICY "Allow public insert to devices"
      ON devices FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'devices' AND policyname = 'Allow public delete devices'
  ) THEN
    CREATE POLICY "Allow public delete devices"
      ON devices FOR DELETE TO public USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'devices' AND policyname = 'Allow public update devices'
  ) THEN
    CREATE POLICY "Allow public update devices"
      ON devices FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Create policies for advertiser_devices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertiser_devices' AND policyname = 'Allow public read access to advertiser_devices'
  ) THEN
    CREATE POLICY "Allow public read access to advertiser_devices"
      ON advertiser_devices FOR SELECT TO public USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertiser_devices' AND policyname = 'Allow public insert to advertiser_devices'
  ) THEN
    CREATE POLICY "Allow public insert to advertiser_devices"
      ON advertiser_devices FOR INSERT TO public WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertiser_devices' AND policyname = 'Allow public delete advertiser_devices'
  ) THEN
    CREATE POLICY "Allow public delete advertiser_devices"
      ON advertiser_devices FOR DELETE TO public USING (true);
  END IF;
END $$;

-- Add missing DELETE policy for advertisers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisers' AND policyname = 'Allow public delete advertisers'
  ) THEN
    CREATE POLICY "Allow public delete advertisers"
      ON advertisers FOR DELETE TO public USING (true);
  END IF;
END $$;

-- Add UPDATE policy for advertisers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'advertisers' AND policyname = 'Allow public update advertisers'
  ) THEN
    CREATE POLICY "Allow public update advertisers"
      ON advertisers FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add missing DELETE policy for products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Allow public delete products'
  ) THEN
    CREATE POLICY "Allow public delete products"
      ON products FOR DELETE TO public USING (true);
  END IF;
END $$;

-- Add UPDATE policy for products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Allow public update products'
  ) THEN
    CREATE POLICY "Allow public update products"
      ON products FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add missing DELETE policy for targets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'targets' AND policyname = 'Allow public delete targets'
  ) THEN
    CREATE POLICY "Allow public delete targets"
      ON targets FOR DELETE TO public USING (true);
  END IF;
END $$;

-- Add UPDATE policy for targets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'targets' AND policyname = 'Allow public update targets'
  ) THEN
    CREATE POLICY "Allow public update targets"
      ON targets FOR UPDATE TO public USING (true) WITH CHECK (true);
  END IF;
END $$;