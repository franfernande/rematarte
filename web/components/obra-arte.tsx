import type { Obra } from "@/lib/data";

// Placeholder artwork for the sample works: a small generative painting per slug in the Mendoza palette.
// Real works (imagen under /obras/) render the photo instead.

function seeded(slug: string) {
  let h = 2166136261;
  for (const ch of slug) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function Atardecer({ id, r }: { id: string; r: () => number }) {
  const sunX = 230 + r() * 120;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-cielo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1424" />
          <stop offset=".55" stopColor="#8f2a4c" />
          <stop offset="1" stopColor="#e0a75e" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-cielo)`} />
      <circle cx={sunX} cy="250" r="64" fill="#f0c27a" />
      <polygon points="0,330 70,232 120,282 182,186 236,268 290,214 350,282 400,246 400,360 0,360" fill="#5a1f33" />
      <polygon points="182,186 200,214 188,216 170,204" fill="#f2ede4" opacity=".85" />
      <polygon points="0,352 90,296 160,336 240,284 320,334 400,306 400,380 0,380" fill="#2f1520" />
      <rect y="372" width="400" height="128" fill="#1e1512" />
      <g stroke="#6d7a3a" strokeWidth="3" opacity=".9">
        {[-80, 0, 80, 160, 240, 320, 400, 480].map((x) => (
          <line key={x} x1="200" y1="380" x2={x} y2="500" />
        ))}
      </g>
    </>
  );
}

function Vinedos({ id, r }: { id: string; r: () => number }) {
  const rows = 9;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-cielo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe3cf" />
          <stop offset="1" stopColor="#e2b77a" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-cielo)`} />
      <circle cx={90 + r() * 60} cy="120" r="44" fill="#b8863b" opacity=".85" />
      <polygon points="0,220 60,180 130,206 210,150 280,196 340,170 400,190 400,250 0,250" fill="#8a8279" opacity=".55" />
      <rect y="240" width="400" height="260" fill="#4b3a2f" />
      {Array.from({ length: rows }, (_, i) => {
        const y = 250 + i * i * 3.1 + i * 4;
        return (
          <g key={i}>
            <rect x="0" y={y} width="400" height={2 + i * 1.6} fill={i % 2 ? "#6d7a3a" : "#55602d"} />
            {Array.from({ length: 6 + i }, (_, j) => (
              <circle key={j} cx={(j + 0.5) * (400 / (6 + i))} cy={y + 1 + i * 0.8} r={1.5 + i * 0.9} fill="#6e1a37" opacity={0.75} />
            ))}
          </g>
        );
      })}
    </>
  );
}

function Cerro({ id, r }: { id: string; r: () => number }) {
  const peak = 170 + r() * 60;
  return (
    <>
      <defs>
        <linearGradient id={`${id}-agua`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe3e0" />
          <stop offset="1" stopColor="#f2ede4" />
        </linearGradient>
        <filter id={`${id}-acuarela`}>
          <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="3" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="14" />
        </filter>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-agua)`} />
      <g filter={`url(#${id}-acuarela)`}>
        <path d={`M-20 330 Q 120 ${peak} ${200} ${peak - 10} T 420 300 V 520 H -20 Z`} fill="#8a8279" opacity=".55" />
        <path d="M-20 380 Q 110 290 230 330 T 420 350 V 520 H -20 Z" fill="#6e1a37" opacity=".45" />
        <path d="M-20 430 Q 150 370 260 410 T 420 420 V 520 H -20 Z" fill="#4a443d" opacity=".6" />
      </g>
      <circle cx="300" cy="120" r="28" fill="#b8863b" opacity=".55" />
    </>
  );
}

export function ObraArte({ obra, className }: { obra: Obra; className?: string }) {
  const isPhoto = !obra.imagen.startsWith("/mocks/");
  if (isPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photos come from /public and are already sized for mobile
      <img src={obra.imagen} alt={`${obra.titulo}, de ${obra.artista}`} className={`block h-full w-full object-cover ${className ?? ""}`} />
    );
  }
  const r = seeded(obra.slug);
  const id = `arte-${obra.slug}`;
  const Composition = obra.slug.includes("vined") ? Vinedos : obra.slug.includes("cerro") ? Cerro : Atardecer;
  return (
    <svg viewBox="0 0 400 500" role="img" aria-label={`Ilustración de ejemplo para ${obra.titulo}`} className={`block h-full w-full ${className ?? ""}`}>
      <Composition id={id} r={r} />
    </svg>
  );
}
