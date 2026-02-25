/*
  # Create TV Campaign Insight Tables

  1. New Tables
    - `advertisers`
      - `id` (uuid, primary key)
      - `name` (text) - Nom de l'annonceur
      - `created_at` (timestamptz)
    
    - `products`
      - `id` (uuid, primary key)
      - `advertiser_id` (uuid, foreign key)
      - `name` (text) - Nom du produit
      - `created_at` (timestamptz)
    
    - `targets`
      - `id` (uuid, primary key)
      - `name` (text) - Nom de la cible (ex: 4+, FRDA, H25-49)
      - `column_index` (int) - Position dans les colonnes G → BG
      - `created_at` (timestamptz)
    
    - `estimated_data`
      - `id` (uuid, primary key)
      - `advertiser_id` (uuid, foreign key)
      - `date_2025` (date) - Date originale en 2025
      - `date_transposed` (date) - Date transposée en 2026
      - `target_performances` (jsonb) - Performances par cible {target_id: value}
      - `created_at` (timestamptz)
    
    - `actual_data`
      - `id` (uuid, primary key)
      - `advertiser_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key)
      - `date` (date) - Date réelle de diffusion
      - `target_performances` (jsonb) - Performances par cible {target_id: value}
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (since this is an internal analytics tool)
*/

-- Create advertisers table
CREATE TABLE IF NOT EXISTS advertisers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES advertisers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(advertiser_id, name)
);

-- Create targets table
CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  column_index int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create estimated_data table
CREATE TABLE IF NOT EXISTS estimated_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES advertisers(id) ON DELETE CASCADE,
  date_2025 date NOT NULL,
  date_transposed date NOT NULL,
  target_performances jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create actual_data table
CREATE TABLE IF NOT EXISTS actual_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id uuid REFERENCES advertisers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  date date NOT NULL,
  target_performances jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimated_data_advertiser ON estimated_data(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_estimated_data_date_transposed ON estimated_data(date_transposed);
CREATE INDEX IF NOT EXISTS idx_actual_data_advertiser ON actual_data(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_actual_data_date ON actual_data(date);
CREATE INDEX IF NOT EXISTS idx_products_advertiser ON products(advertiser_id);

-- Enable RLS
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimated_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_data ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (internal analytics tool)
CREATE POLICY "Allow public read access to advertisers"
  ON advertisers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to advertisers"
  ON advertisers FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to products"
  ON products FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to targets"
  ON targets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to targets"
  ON targets FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to estimated_data"
  ON estimated_data FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to estimated_data"
  ON estimated_data FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public delete estimated_data"
  ON estimated_data FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Allow public read access to actual_data"
  ON actual_data FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to actual_data"
  ON actual_data FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public delete actual_data"
  ON actual_data FOR DELETE
  TO public
  USING (true);

-- Insert default advertisers and products mapping
INSERT INTO advertisers (name) VALUES
  ('McDonalds'),
  ('Coca Cola'),
  ('Uber Eats'),
  ('Betclic')
ON CONFLICT (name) DO NOTHING;

-- Insert products with advertiser mapping
INSERT INTO products (advertiser_id, name)
SELECT a.id, p.name
FROM advertisers a
CROSS JOIN LATERAL (VALUES
  ('McDonalds', 'MC DO P#'),
  ('McDonalds', 'MC DO HAPPY MEAL P#'),
  ('Coca Cola', 'COCA COLA P#'),
  ('Uber Eats', 'UBER EATS APPLICATION P#'),
  ('Betclic', 'BETCLIC FR P#')
) AS p(advertiser_name, name)
WHERE a.name = p.advertiser_name
ON CONFLICT (advertiser_id, name) DO NOTHING;