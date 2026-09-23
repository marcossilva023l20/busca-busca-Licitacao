import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Radar Licitações — Encontre pregões e licitações abertas no Brasil",
  description:
    "Busque licitações públicas em tempo real: filtre por fim do recebimento de propostas, UF, município, modalidade e sistema fonte (ComprasNet, BLL Compras, BNC e mais).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <div className="bg-scene" aria-hidden />
        <div className="bg-grid" aria-hidden />
        <div className="bg-noise" aria-hidden />
        {children}
      </body>
    </html>
  );
}
