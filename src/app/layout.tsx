import type { Metadata } from "next";
import "./globals.css";
import "./dark.css";
export const metadata: Metadata = {
  title: "CS Car — Seu próximo carro. Nossa conexão.",
  description:
    "Encontre seu próximo carro na CS Car. Uma rede de veículos e parceiros conectando quem quer comprar a quem quer vender.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
