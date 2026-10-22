import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
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
  title: "MK-Service · Control",
  description: "Auditoría de vulnerabilidades en sistemas RAG (Prompt Injection y Data Leakage)",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-void">
        <AuthProvider>{children}</AuthProvider>
        <div className="overlay-scanlines fixed inset-0 z-[60]" aria-hidden />
      </body>
    </html>
  );
}
