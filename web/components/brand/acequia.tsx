// Watercourses and willow leaves, drawn in the palette of the gallery.
const cauce = "M-12 54 C38 67 62 30 108 35 S185 79 242 54 S322 15 376 38 S467 78 534 32";

function Trazado() {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path fill="#af8647" opacity=".16" d="M-12 52 C38 65 62 28 108 33 S185 77 242 52 S322 13 376 36 S467 76 534 30 L534 42 C469 92 421 62 374 47 S292 42 245 65 S162 62 111 46 S40 77 -12 63Z" />
      <g stroke="#996d42" strokeWidth="1.6">
        <path d={cauce} />
        <path d="M-10 65 C41 75 66 41 109 45 S185 90 246 65 S327 29 374 47 S465 91 534 43" />
        <path opacity=".65" d="M24 52 Q47 47 68 33 M123 29 C154 32 174 56 199 53 M265 57 Q293 42 318 40 M411 63 Q454 84 489 66" />
      </g>
      <path className="acequia-reflejo" d={cauce} pathLength="100" stroke="#873858" strokeWidth="3" strokeDasharray="7 12 1 18 2 10" />
      <g className="acequia-hojas" fill="#8a754b">
        <path d="M76 43 Q84 36 93 40 Q86 46 76 43Z M96 39 Q100 34 106 35 Q103 40 96 39Z" />
        <path d="M350 37 Q358 36 366 43 Q357 45 350 37Z" />
      </g>
    </g>
  );
}

export function AcequiaDivisor() {
  return (
    <svg className="acequia-divisor" viewBox="0 0 520 96" aria-hidden="true" focusable="false">
      <Trazado />
    </svg>
  );
}

export function AcequiasDeFondo() {
  return (
    <div className="acequias-de-fondo" aria-hidden="true">
      {["izquierda", "derecha"].map(lado => (
        <svg key={lado} className={`acequia-margen acequia-${lado}`} viewBox="0 0 96 520" preserveAspectRatio="none" focusable="false">
          <g transform="translate(96 0) rotate(90)"><Trazado /></g>
        </svg>
      ))}
    </div>
  );
}
