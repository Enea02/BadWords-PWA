/** I 5 inchiostri delle ragazze (valori di profiles.color) e i token CSS corrispondenti. */
export const GIRL_COLORS = ["magenta", "blu", "verde", "viola", "arancio"] as const;

export type GirlColor = (typeof GIRL_COLORS)[number];

/** Inchiostro di timbri e totali: cambia tra chiaro e scuro. */
export const girlInk = (c: GirlColor) => `var(--sj-girl-${c})`;

/** Fondo dell'avatar: colore pieno in entrambi i temi. */
export const girlAvatar = (c: GirlColor) => `var(--sj-avatar-${c})`;
