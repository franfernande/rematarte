import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { WalletProvider } from "@/components/wallet-provider";
import { getDeploy } from "@/lib/data";
import { accountUrl } from "@/lib/format";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Artemi · Subastas de arte en vivo",
    template: "%s · Artemi",
  },
  description: "Subastas de arte en vivo con USDC en Stellar. Escaneá el QR de la obra y ofertá desde el celu.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2ede4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { networkPassphrase, auctionContractId } = getDeploy();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-tinta">
        <WalletProvider networkPassphrase={networkPassphrase}>
          <header className="sticky top-0 z-30 border-b border-linea/80 bg-cal/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5">
              <Link href="/" className="font-serif text-[1.65rem] leading-none tracking-tight" aria-label="Artemi, inicio">
                Arte<em className="text-malbec">mi</em>
              </Link>
              <nav className="flex items-center gap-1 sm:gap-3">
                <Link
                  href="/#muestra"
                  className="hidden rounded-full px-3 py-2 text-sm text-tinta-2 transition-colors hover:text-tinta sm:inline-block"
                >
                  La muestra
                </Link>
                <Link
                  href="/empezar"
                  className="hidden rounded-full px-3 py-2 text-sm text-tinta-2 transition-colors hover:text-tinta sm:inline-block"
                >
                  Empezar
                </Link>
                <ConnectWalletButton />
              </nav>
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
          <footer className="mt-24 border-t border-linea">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-tinta-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-serif text-2xl text-tinta">
                  La obra cuelga en la pared. <em className="text-malbec">La puja vive en la cadena.</em>
                </p>
                <p className="mt-2 text-piedra">Sin Coordenadas | Argentina · Eje I Arte · Mendoza</p>
              </div>
              <div className="flex flex-col gap-1 sm:items-end">
                <span className="etiqueta">Stellar Testnet · USDC de prueba</span>
                <a
                  href={accountUrl(auctionContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                >
                  Contrato {auctionContractId.slice(0, 6)}…{auctionContractId.slice(-6)}
                </a>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
