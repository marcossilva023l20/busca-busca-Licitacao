import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Licitações — Encontre pregões e licitações abertas no Brasil",
  description:
    "Busque licitações públicas em tempo real: filtre por fim do recebimento de propostas, UF, município, modalidade e sistema fonte (ComprasNet, BLL Compras, BNC e mais).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="bg-scene" aria-hidden />
        <div className="bg-grid" aria-hidden />
        <div className="bg-noise" aria-hidden />
        {children}
      </body>
    </html>
  );
}
