import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Squigs Tweet Generator",
  description: "Manual tweet generator for Squigs NFTs, optimized for Railway deployment."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
