/**
 * Chi ha appena timbrato chi, su questo dispositivo. Serve a mostrare la schermata
 * "Penitenza sbloccata" anche a chi ha messo il 10° timbro a un'altra.
 */
const recent = new Map<string, number>();

export function noteStamp(profileId: string) {
  recent.set(profileId, Date.now());
}

export function stampedRecently(profileId: string, withinMs = 20_000) {
  const t = recent.get(profileId);
  return t !== undefined && Date.now() - t < withinMs;
}
