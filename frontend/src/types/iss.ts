export interface ISSTLEData {
  name: string;
  line1: string;
  line2: string;
  timestamp: number;
}

export interface ISSLiveInfo {
  latitude_deg: number;
  longitude_deg: number;
  altitude_km: number;
  speed_kmh: number;
  country?: string | null;
}
