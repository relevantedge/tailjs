import { Float, Integer } from ".";

export interface GeoEntity {
  name: string;
  geonames?: Integer;
  iso?: string;
  confidence?: Float;
}
