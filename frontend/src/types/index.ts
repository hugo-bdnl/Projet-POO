export interface ObservationPoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface VisibleStar {
  id: number;
  proper_name: string | null;
  hip_id: number | null;
  magnitude: number;
  spectral_type: string | null;
  constellation_abbr: string | null;
  azimuth: number;
  altitude: number;
}

export interface ConstellationListItem {
  id: number;
  name: string;
  abbreviation: string;
  name_fr: string | null;
}

export interface ConstellationDetail extends ConstellationListItem {
  center_ra: number | null;
  center_dec: number | null;
  lines_data: string | null;
  description: string | null;
  star_ids: number[];
}

export interface BestLocation {
  observation_point_id: number;
  observation_point_name: string;
  latitude: number;
  longitude: number;
  constellation_altitude: number;
  visibility_score: number;
}
