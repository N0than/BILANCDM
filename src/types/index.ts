export interface Advertiser {
  id: string;
  name: string;
  logo_svg?: string;
  created_at: string;
}

export interface Device {
  id: string;
  name: string;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  created_at: string;
}

export interface DeviceProgram {
  id: string;
  device_id: string;
  program_id: string;
  created_at: string;
}

export interface AdvertiserDevice {
  id: string;
  advertiser_id: string;
  device_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  advertiser_id: string;
  name: string;
  created_at: string;
}

export interface Target {
  id: string;
  name: string;
  column_index: number;
  created_at: string;
}

export interface EstimatedData {
  id: string;
  advertiser_id: string;
  device_id?: string;
  program_id?: string | null;
  date_2025: string;
  date_transposed: string;
  target_performances: Record<string, number>;
  created_at: string;
}

export interface ActualData {
  id: string;
  advertiser_id: string;
  product_id: string | null;
  program_id: string | null;
  date: string;
  target_performances: Record<string, number>;
  created_at: string;
}

export interface TargetPerformance {
  target_name: string;
  estimated: number;
  actual: number;
  gap: number;
  delivery_rate: number;
  status: 'ahead' | 'on-track' | 'behind';
}

export interface CampaignSummary {
  advertiser: string;
  cutoff_date: string;
  targets: TargetPerformance[];
}
