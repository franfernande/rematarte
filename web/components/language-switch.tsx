"use client";

import Image from "next/image";
import { Children, cloneElement, isValidElement, useEffect, useSyncExternalStore, type ReactNode } from "react";
import english from "@/lib/i18n/english.json";

const messages: Record<string, string> = english;
const patterns = Object.entries(messages).filter(([key]) => key.includes("{}")).map(([key, value]) => ({
  pattern: new RegExp("^" + key.split("{}").map(part => part.replace(/[.*+?^$()|[\]\\]/g, "\\$&")).join("(.+?)") + "$"),
  value,
}));
function translate(text: string) {
  const key = text.trim().replace(/\s+/g, " ");
  let result = Object.hasOwn(messages, key) ? messages[key] : undefined;
  if (result === undefined) {
    for (const { pattern, value } of patterns) {
      const match = key.match(pattern);
      if (!match) continue;
      let index = 1;
      result = value.replace(/\{\}/g, () => match[index++]);
      break;
    }
  }
  return result === undefined ? text : text.replace(/\S[\s\S]*\S|\S/, () => result!);
}
type Language = "es" | "en";
let fallback: Language | null = null;
function current(): Language {
  if (fallback) return fallback;
  try { return localStorage.getItem("artemi.language") === "en" ? "en" : "es"; } catch { return "es"; }
}
function subscribe(notify: () => void) {
  window.addEventListener("artemi-language", notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener("artemi-language", notify);
    window.removeEventListener("storage", notify);
  };
}
export function useLanguage() {
  return useSyncExternalStore(subscribe, current, (): Language => "es");
}
export function T({ children }: { children: ReactNode }) {
  const lang = useLanguage();
  return typeof children === "string" && lang === "en" ? translate(children) : children;
}
export function TranslatedAttributes({ children }: { children: ReactNode }) {
  const lang = useLanguage();
  if (lang === "es") return children;
  return Children.map(children, child => {
    if (!isValidElement<Record<string, unknown>>(child)) return child;
    const attrs: Record<string, string> = {};
    for (const name of ["aria-label", "alt", "title", "placeholder"]) {
      const value = child.props[name];
      if (typeof value === "string") attrs[name] = translate(value);
    }
    return cloneElement(child, attrs);
  });
}
function select(next: Language) {
  try {
    localStorage.setItem("artemi.language", next);
    fallback = null;
  } catch { fallback = next; }
  window.dispatchEvent(new Event("artemi-language"));
}

export function GalleryDate({ iso, full = false }: { iso: string; full?: boolean }) {
  const language = useLanguage();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "America/Argentina/Mendoza", day: "numeric", month: full ? "long" : "short",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    ...(full ? { weekday: "long" as const } : { year: "numeric" as const }),
  };
  return <time dateTime={iso}>{new Intl.DateTimeFormat(language === "en" ? "en-US" : "es-AR", options).format(new Date(iso))}</time>;
}

export function LanguageSwitch() {
  const language = useLanguage();
  useEffect(() => { document.documentElement.lang = language === "en" ? "en-US" : "es-AR"; }, [language]);
  return (
    <div role="group" aria-label={language === "en" ? "Language" : "Idioma"} className="ml-auto inline-flex shrink-0 items-center rounded-full border border-linea px-1 sm:ml-2">
      {(["es", "en"] as const).map(code => (
        <button key={code} type="button" lang={code} aria-label={code === "es" ? "Español (Argentina)" : "English (United States)"} aria-pressed={language === code} onClick={() => select(code)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-full px-1 text-xs aria-pressed:font-bold aria-pressed:text-malbec aria-pressed:underline aria-pressed:underline-offset-4">
          <Image unoptimized src={code === "es" ? "/brand/argentina.svg" : "/brand/united-states.svg"} alt="" width={19} height={13} />{code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
