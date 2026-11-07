import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Pacifico } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Klub Santa — Where Believers Belong | A Living Christmas Tradition",
  description:
    "Klub Santa is a seasonal ritual and global community built around belief, warmth, and family tradition. Experience a personalised call from Santa, heirloom letters, and a circle where believers belong.",
  keywords: [
    "Klub Santa",
    "personalised Santa call",
    "Christmas tradition",
    "wax-sealed letter",
    "family ritual",
    "believers",
  ],
  openGraph: {
    title: "Klub Santa — Where Believers Belong",
    description:
      "In a world that moves too quickly, we believe in pausing. Discover a living Christmas ritual crafted for families across generations.",
    siteName: "Klub Santa",
    type: "website",
    images: [{ url: "/media/hero-family.png", width: 1440, height: 720 }],
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#7D0A16",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} ${pacifico.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
