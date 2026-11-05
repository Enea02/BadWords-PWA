"use client";

import { useActionState, useState } from "react";
import { FormError, PrimaryButton, TextField } from "@/components/ui";
import { PasswordField } from "@/components/PasswordField";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  // Controllati: React 19 svuota i form dopo ogni action, ma dopo un errore il nome utente deve restare.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={action} className="flex flex-col gap-3">
      <TextField
        id="sj-username"
        name="username"
        label="Nome utente"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="es. bea"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <PasswordField
        id="sj-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <FormError message={state?.error} />
      <PrimaryButton disabled={pending} className="mt-1">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
          <path d="m10 16 4-4-4-4" />
          <path d="M14 12H4" />
        </svg>
        <span>{pending ? "Entro…" : "Entra"}</span>
      </PrimaryButton>
    </form>
  );
}
