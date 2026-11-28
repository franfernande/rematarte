import { T, TranslatedAttributes } from "@/components/language-switch";
import type { Metadata, Viewport } from "next";
import { EB_Garamond, Geist_Mono, Public_Sans } from "next/font/google";
import Link from "next/link";
import { AcequiasDeFondo } from "@/components/brand/acequia";
import { Logo } from "@/components/brand/logo";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { LanguageSwitch } from "@/components/language-switch";
import { NavLinks } from "@/components/nav-links";
import { WalletProvider } from "@/components/wallet-provider";
import { getDeploy } from "@/lib/data";
import { accountUrl } from "@/lib/format";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
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
  themeColor: "#f5f2ea",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { networkPassphrase, auctionContractId } = getDeploy();

  return (
    <html
      lang="es"
      className={`${publicSans.variable} ${geistMono.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="isolate flex min-h-full flex-col text-tinta">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-malbec focus:px-5 focus:font-medium focus:text-cal"
        >
          <T>Saltar al contenido</T>
        </a>
        <WalletProvider networkPassphrase={networkPassphrase}>
          <header className="sticky top-0 z-30 border-b border-linea bg-cal/95 backdrop-blur-md">
            <div className="contenedor flex flex-wrap items-center justify-between gap-x-2 py-1.5 md:h-16 md:flex-nowrap md:gap-3 md:py-0">
              <TranslatedAttributes><Link
                href="/"
                className="order-1 inline-flex items-center [&>img]:h-7 [&>img]:w-auto sm:[&>img]:h-9 lg:[&>img]:h-10"
                aria-label="Artemi, inicio"
              >
                <Logo />
              </Link></TranslatedAttributes>
              <div className="order-2 md:order-3">
                <ConnectWalletButton />
              </div>
              <nav className="order-3 flex min-h-11 w-full items-center gap-0.5 min-[400px]:gap-2 md:order-2 md:w-auto lg:gap-3">
                <NavLinks />
                <LanguageSwitch />
              </nav>
            </div>
          </header>
          <main id="contenido" tabIndex={-1} className="flex flex-1 flex-col">
            <AcequiasDeFondo />
            {children}
          </main>
          <footer className="mt-24 border-t border-linea">
            <div className="contenedor flex flex-col gap-6 py-10 text-sm text-tinta-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-serif text-[1.65rem] text-tinta">
                  Artemi <span className="text-malbec">/</span> Mendoza
                </p>
                <p className="mt-2 text-piedra"><T>Arte en Mendoza · Sin Coordenadas, Argentina</T></p>
              </div>
              <div className="flex flex-col gap-1 sm:items-end">
                <span className="etiqueta"><T>Stellar Testnet · USDC de prueba</T></span>
                <a
                  href={accountUrl(auctionContractId)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-malbec underline decoration-malbec/30 underline-offset-4 hover:decoration-malbec"
                >
                  <T>Contrato</T> {auctionContractId.slice(0, 6)}…{auctionContractId.slice(-6)}
                </a>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
