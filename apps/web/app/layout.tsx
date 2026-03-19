import { Fraunces, Manrope } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "PEP Markdown Workspace",
  description: "Create, review, edit, preview and export markdown ticket results.",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
