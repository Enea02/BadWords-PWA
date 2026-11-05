"use client";

import { clearPersonalCaches } from "@/lib/clearCaches";
import { disablePush } from "@/lib/push";

/** "Esci": prima spegne le notifiche e svuota le cache con dati personali (telefono condiviso), poi chiude la sessione. */
export function LogoutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={async () => {
        await disablePush().catch(() => undefined);
        await clearPersonalCaches();
        await action();
      }}
    >
      <button type="submit" className="h-11 rounded-button border-[1.5px] border-ink px-[18px] text-sm font-extrabold text-ink">
        Esci
      </button>
    </form>
  );
}
