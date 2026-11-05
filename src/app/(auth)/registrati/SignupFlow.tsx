"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@design/Avatar";
import { Stamp, type StampIcon } from "@design/Stamp";
import { GIRL_COLORS, GIRL_COLOR_LABEL, girlAvatar, girlInk, type GirlColor } from "@design/girls";
import { GirlAvatar } from "@/components/GirlAvatar";
import { PasswordField } from "@/components/PasswordField";
import { ArrowRight, FormError, PaperScreen, PrimaryButton, StepHeader, TextButton, TextField } from "@/components/ui";
import { checkAccount, previewInvite, signUp, type FormState, type InvitePreview } from "../actions";
import { CodeInput } from "./CodeInput";
import { resizeToAvatar } from "./resize";

type Mode = "join" | "create";
type AvatarChoice = "iniziale" | "peperoncino" | "fulmine" | "bomba" | "foto";

const AVATARS: { id: AvatarChoice; label: string; icon?: StampIcon }[] = [
  { id: "iniziale", label: "Iniziale" },
  { id: "peperoncino", label: "Peperoncino", icon: "peperoncino" },
  { id: "fulmine", label: "Fulmine", icon: "fulmine" },
  { id: "bomba", label: "Bomba", icon: "bomba" },
  { id: "foto", label: "Carica una foto" },
];

const listNames = (names: string[]) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;

export function SignupFlow() {
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<Mode>("join");

  // Passo 1
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [codeState, setCodeState] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [groupName, setGroupName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [step1, setStep1] = useState<FormState>();
  const [checking, startCheck] = useTransition();

  // Passo 2
  const [displayName, setDisplayName] = useState("");
  const [chosenColor, setColor] = useState<GirlColor | null>(null);
  const [avatar, setAvatar] = useState<AvatarChoice>("iniziale");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step2, submit, submitting] = useActionState(signUp, undefined);
  const [, startSubmit] = useTransition();

  // Verifica il codice appena è completo (vince l'ultima richiesta).
  const latestCode = useRef("");
  const onCode = (next: string) => {
    setCode(next);
    setStep1(undefined);
    setPreview(null);
    latestCode.current = next;
    if (next.length !== 6) {
      setCodeState("idle");
      return;
    }
    setCodeState("checking");
    previewInvite(next).then((p) => {
      if (latestCode.current !== next) return;
      setPreview(p);
      setCodeState(p ? "valid" : "invalid");
    });
  };

  const taken = useMemo(() => {
    const map = new Map<GirlColor, string>();
    if (mode === "join") preview?.members.forEach((m) => map.set(m.color, m.display_name));
    return map;
  }, [mode, preview]);

  // Colore scelto, oppure il primo libero se la scelta non è (più) disponibile.
  const color: GirlColor | null =
    chosenColor && !taken.has(chosenColor) ? chosenColor : (GIRL_COLORS.find((c) => !taken.has(c)) ?? null);

  useEffect(() => () => void (photoUrl && URL.revokeObjectURL(photoUrl)), [photoUrl]);

  const fields = () => {
    const fd = new FormData();
    fd.set("mode", mode);
    fd.set("code", code);
    fd.set("groupName", groupName);
    fd.set("username", username);
    fd.set("password", password);
    return fd;
  };

  const goStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    startCheck(async () => {
      const res = await checkAccount(undefined, fields());
      setStep1(res);
      if (!res?.error) {
        setStep(2);
        window.scrollTo({ top: 0 });
      }
    });
  };

  const finish = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = fields();
    fd.set("displayName", displayName);
    fd.set("color", color ?? "");
    fd.set("avatar", avatar);
    if (avatar === "foto" && photo) fd.set("photo", photo, "avatar.jpg");
    startSubmit(() => submit(fd));
  };

  // Errori del passo 1 rilevati al passo 2 (es. nome utente preso nel frattempo): si torna indietro.
  const [seenStep2, setSeenStep2] = useState(step2);
  if (step2 !== seenStep2) {
    setSeenStep2(step2);
    if (step2?.field && ["code", "groupName", "username", "password"].includes(step2.field)) {
      setStep1(step2);
      setStep(1);
    }
  }

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoErr(null);
    try {
      const blob = await resizeToAvatar(file);
      setPhoto(blob);
      setPhotoUrl(URL.createObjectURL(blob));
      setAvatar("foto");
    } catch {
      setPhotoErr("Questa immagine non si apre: provane un'altra.");
    }
  };

  if (step === 1) {
    const members = preview?.members ?? [];
    const admins = members.filter((m) => m.role === "admin").map((m) => m.display_name);
    const waiting =
      members.length > 4
        ? `${members.slice(0, 3).map((m) => m.display_name).join(", ")} e altre ${members.length - 3} ti aspettano.`
        : members.length > 0
          ? `${listNames(members.map((m) => m.display_name))} ti ${members.length === 1 ? "aspetta" : "aspettano"}.`
          : "Sarai la prima.";

    return (
      <PaperScreen className="gap-[22px] pt-[62px]">
        <StepHeader step={1} />

        <form onSubmit={goStep2} className="flex flex-1 flex-col gap-[22px]" noValidate>
          <div className="flex flex-col gap-2.5">
            <h1 className="font-display text-4xl leading-[1.05]">{mode === "join" ? "Entra nel gruppo" : "Crea il gruppo"}</h1>
            <p className="text-base leading-[1.45] text-pretty text-muted">
              {mode === "join"
                ? "Scrivi il codice invito che ti ha mandato l'admin del gruppo."
                : "Dai un nome al gruppo: poi inviterai le amiche con un codice."}
            </p>
          </div>

          {mode === "join" ? (
            <>
              <CodeInput value={code} onChange={onCode} invalid={codeState === "invalid"} />
              {codeState === "invalid" && <FormError message="Codice invito non valido." />}
              {codeState === "valid" && preview && (
                <div className="relative flex flex-col gap-3.5 rounded-2xl border-[1.5px] border-line bg-card p-[18px]">
                  <ValidStamp />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-muted">Stai entrando in</span>
                    <span className="font-display text-2xl leading-[1.1]">{preview.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex shrink-0">
                      {members.slice(0, 4).map((m, i) => (
                        <div key={i} className="rounded-full shadow-[0_0_0_2.5px_var(--sj-card)]" style={{ marginLeft: i ? -10 : 0 }}>
                          <GirlAvatar name={m.display_name} color={m.color} avatarUrl={m.avatar_url} size={36} />
                        </div>
                      ))}
                    </div>
                    <span className="text-sm leading-[1.35] text-muted">
                      {waiting}
                      {admins.length > 0 && ` Admin: ${listNames(admins)}.`}
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <TextField
              id="sj-group"
              label="Nome del gruppo"
              placeholder="es. Le Sboccate"
              value={groupName}
              maxLength={60}
              onChange={(e) => {
                setGroupName(e.target.value);
                setStep1(undefined);
              }}
              aria-invalid={step1?.field === "groupName" || undefined}
            />
          )}

          <div className="flex flex-col gap-3">
            <TextField
              id="sj-new-username"
              label="Scegli un nome utente"
              hint="Ti servirà per entrare. Lettere, numeri, punto o trattino."
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setStep1(undefined);
              }}
              aria-invalid={step1?.field === "username" || undefined}
            />
            <PasswordField
              id="sj-new-password"
              label="Password"
              hint="Almeno 8 caratteri."
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setStep1(undefined);
              }}
              aria-invalid={step1?.field === "password" || undefined}
            />
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-3.5">
            <FormError message={step1?.error} />
            <PrimaryButton disabled={checking || (mode === "join" && codeState !== "valid")}>
              <span>{checking ? "Controllo…" : "Continua"}</span>
              <ArrowRight />
            </PrimaryButton>
            <TextButton
              onClick={() => {
                setMode(mode === "join" ? "create" : "join");
                setStep1(undefined);
              }}
            >
              {mode === "join" ? "Non ho un codice: creo un gruppo" : "Ho un codice invito"}
            </TextButton>
            <Link href="/login" className="-mt-2 self-center text-sm text-muted underline underline-offset-2">
              Ho già un account: entra
            </Link>
          </div>
        </form>
      </PaperScreen>
    );
  }

  const ink = color ? girlInk(color) : "var(--sj-muted)";
  const fill = color ? girlAvatar(color) : "var(--sj-muted)";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <PaperScreen className="gap-5 pt-[62px]">
      <StepHeader step={2} back={() => setStep(1)} />

      <form onSubmit={finish} className="flex flex-1 flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-4xl leading-[1.05]">Chi sei?</h1>
          <p className="text-[15px] leading-[1.4] text-muted">Le amiche ti riconosceranno da nome e colore.</p>
        </div>

        <TextField
          id="sj-name"
          label="Come ti chiamano"
          autoComplete="given-name"
          maxLength={24}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="font-semibold"
          aria-invalid={step2?.field === "displayName" || undefined}
        />

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <div className="flex items-baseline justify-between gap-3">
            <legend className="float-left p-0 text-sm font-bold">Il colore del tuo inchiostro</legend>
            <span className="text-xs text-muted">{color ? GIRL_COLOR_LABEL[color] : ""}</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {GIRL_COLORS.map((c) => {
              const who = taken.get(c);
              const selected = c === color;
              return (
                <label key={c} className={who ? "cursor-not-allowed" : "cursor-pointer"}>
                  <input
                    type="radio"
                    name="color"
                    value={c}
                    checked={selected}
                    disabled={Boolean(who)}
                    onChange={() => setColor(c)}
                    className="peer sr-only"
                    aria-label={who ? `${GIRL_COLOR_LABEL[c]}, già preso da ${who}` : GIRL_COLOR_LABEL[c]}
                  />
                  <span
                    className="flex h-11 items-center justify-center rounded-button font-display text-[15px] text-on-avatar outline-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-red peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper"
                    style={{
                      background: girlAvatar(c),
                      opacity: who ? 0.38 : 1,
                      outline: selected ? "2.5px solid var(--sj-ink)" : "0 solid transparent",
                    }}
                  >
                    {selected && <Check />}
                    {who && <span aria-hidden="true">{who.charAt(0).toUpperCase()}</span>}
                  </span>
                </label>
              );
            })}
          </div>
          {taken.size > 0 && <span className="text-xs text-muted">I colori con l&apos;iniziale sono già presi.</span>}
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 p-0 text-sm font-bold">Avatar</legend>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((a) => {
              const selected = a.id === avatar;
              return (
                <label key={a.id} className="cursor-pointer">
                  <input
                    type="radio"
                    name="avatar"
                    value={a.id}
                    checked={selected}
                    onChange={() => (a.id === "foto" && !photo ? fileRef.current?.click() : setAvatar(a.id))}
                    onClick={() => a.id === "foto" && fileRef.current?.click()}
                    className="peer sr-only"
                    aria-label={a.label}
                  />
                  <span
                    className={
                      "flex h-[62px] items-center justify-center rounded-2xl peer-focus-visible:ring-2 peer-focus-visible:ring-red peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper " +
                      (selected ? "border-2 border-ink bg-card" : "border-[1.5px] border-line")
                    }
                  >
                    {a.id === "iniziale" && <Avatar initial={initial} color={fill} size={44} />}
                    {a.icon && (
                      <span className="flex size-11 items-center justify-center rounded-full" style={{ background: fill }}>
                        <Stamp icon={a.icon} color="var(--sj-on-avatar)" size={36} rot={0} ring={false} blend="normal" opacity={1} />
                      </span>
                    )}
                    {a.id === "foto" &&
                      (photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:)
                        <img src={photoUrl} alt="" className="size-11 rounded-full object-cover" />
                      ) : (
                        <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-dashed border-muted text-ink">
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 8h3l2-2.5h6L17 8h3v11H4z" />
                            <circle cx="12" cy="13" r="3.5" />
                          </svg>
                        </span>
                      ))}
                  </span>
                </label>
              );
            })}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => pickPhoto(e.target.files?.[0])}
          />
          <FormError message={photoErr} />
        </fieldset>

        <div className="flex items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-line px-4 py-3.5">
          <Stamp icon="peperoncino" color={ink} size={56} rot={-9} />
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-lg">Il tuo timbro</span>
            <span className="text-[13px] leading-[1.35] text-muted">Così finirà sul tabellone ogni volta che ti scappa.</span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex flex-col gap-3">
          <FormError message={step2?.error} />
          <PrimaryButton disabled={submitting || !color || !displayName.trim()}>
            {submitting ? "Preparo il tabellone…" : "Entra nel tabellone"}
          </PrimaryButton>
        </div>
      </form>
    </PaperScreen>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Timbro "VALIDO" sulla card del gruppo. */
function ValidStamp() {
  return (
    <svg
      viewBox="0 0 120 44"
      width="104"
      height="38"
      aria-hidden="true"
      className="absolute -top-3.5 right-3 rotate-[8deg] text-girl-verde"
      style={{ mixBlendMode: "var(--sj-stamp-blend)" as React.CSSProperties["mixBlendMode"] }}
    >
      <rect x="2" y="2" width="116" height="40" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
      <text x="60" y="30" textAnchor="middle" className="font-display" fontSize="20" letterSpacing="1.5" fill="currentColor">
        VALIDO
      </text>
    </svg>
  );
}
