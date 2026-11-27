import type { Metadata } from "next";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";

export const metadata: Metadata = {
  title: "Empezar",
  description: "Conectá una wallet, activá tu cuenta de Stellar Testnet y recibí USDC de prueba para ofertar en RematArte.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function validObraSlug(value: string | string[] | undefined): string | undefined {
  const slug = Array.isArray(value) ? value[0] : value;
  if (!slug) return undefined;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : undefined;
}

export default async function EmpezarPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const obra = validObraSlug(params.obra);

  return <OnboardingStepper obra={obra} />;
}
