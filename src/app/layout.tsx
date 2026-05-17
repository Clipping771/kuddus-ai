import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Kacha Morich AI - Brutally Honest Personal Business Advisor",
  description: "Get unfiltered, battle-tested business advice from Kacha Morich AI. Powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark scroll-smooth">
        <body className={`${inter.className} bg-[#0A0A0A] text-neutral-100 antialiased min-h-screen`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

