// ── Location domain — kanonisk join-nøkkel for SDU Planner (farid) ──

export type Coord = { lat: number; lon: number };

export interface Beboer {
  navn: string;
}

export interface TidligereProdukt {
  navn: string;
  aktivFra?: string;
  aktivTil?: string;
}

export interface Location {
  farid: string;
  buildingId: string;
  coord: Coord;
  adresse: string;
  beboere: Beboer[];
  tidligereProdukter: TidligereProdukt[];
}
