import Image from "next/image";

import artemiLogo from "@/public/brand/artemi-logo.png";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={artemiLogo}
      alt="Artemi"
      priority
      className={["h-8 w-auto sm:h-10", className].filter(Boolean).join(" ")}
    />
  );
}
