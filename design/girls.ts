/** Gli 8 inchiostri delle ragazze (valori di profiles.color) e i token CSS corrispondenti. */
export const GIRL_COLORS = [
  "fucsia",
  "blu",
  "verde",
  "viola",
  "arancio",
  "petrolio",
  "ocra",
  "ardesia",
] as const;

export type GirlColor = (typeof GIRL_COLORS)[number];

export const GIRL_COLOR_LABEL: Record<GirlColor, string> = {
  fucsia: "Fucsia",
  blu: "Blu",
  verde: "Verde",
  viola: "Viola",
  arancio: "Arancio",
  petrolio: "Petrolio",
  ocra: "Ocra",
  ardesia: "Ardesia",
};

/** Inchiostro di timbri e totali: cambia tra chiaro e scuro. */
export const girlInk = (c: GirlColor) => `var(--sj-girl-${c})`;

/** Fondo dell'avatar: colore pieno in entrambi i temi. */
export const girlAvatar = (c: GirlColor) => `var(--sj-avatar-${c})`;
