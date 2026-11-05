import type { Metadata } from "next";
import { SignupFlow } from "./SignupFlow";

export const metadata: Metadata = { title: "Registrati · Bad Words" };

/** Board "2 · Onboarding: codice" e "2b · Onboarding: chi sei". */
export default function SignupPage() {
  return <SignupFlow />;
}
