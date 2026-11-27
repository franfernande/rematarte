import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { WalletProvider } from "@/components/wallet-provider";
import { getDeploy } from "@/lib/data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { networkPassphrase } = getDeploy();

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <WalletProvider networkPassphrase={networkPassphrase}>
          <header className="flex items-center justify-between gap-4 border-b border-foreground/10 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              RematArte
            </Link>
            <ConnectWalletButton />
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
