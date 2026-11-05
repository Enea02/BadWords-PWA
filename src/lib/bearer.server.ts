import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Confronto a tempo costante di `Authorization: Bearer <secret>`. */
export function hasBearer(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}
