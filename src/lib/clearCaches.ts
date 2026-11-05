/**
 * All'uscita: cancella le cache con dati personali (pagine e risposte), tiene asset statici e font.
 * Così su un telefono condiviso non resta il tabellone di qualcun'altra.
 */
export async function clearPersonalCaches() {
  if (typeof caches === "undefined") return;
  const keep = /^(serwist-precache|static-|next-static|google-fonts)/;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => !keep.test(n)).map((n) => caches.delete(n)));
}
