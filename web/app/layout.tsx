import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { WalletProvider } from "@/components/wallet-provider";
import { getDeploy } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RematArte",
    template: "%s · RematArte",
  },
  description: "Subastas de arte en vivo con USDC en Stellar. Escaneá el QR de la obra y ofertá desde el celu.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2ede4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { networkPassphrase } = getDeploy();

  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <WalletProvider networkPassphrase={networkPassphrase}>
          <header className="flex items-center justify-between gap-4 border-b border-linea px-4 py-3 print:hidden">
            <Link href="/" className="font-serif text-2xl leading-none">
              Remat<em className="text-malbec">Arte</em>
            </Link>
            <ConnectWalletButton />
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
