import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PageTransition from "../animations/PageTransition";
import PillNav from "../components/PillNav";
import { Suspense } from "react";

const questrial = localFont({
  src: "../../public/fonts/Questrial-Regular.ttf",
  variable: "--font-questrial",
  weight: "400",
});

const pixeloid = localFont({
  src: "../../public/fonts/PixeloidSansBold-1jpBg.ttf",
  variable: "--font-pixeloid",
  weight: "700",
});

export const metadata: Metadata = {
  title: "ATAL",
  description: "Autonomous Troubleshooting, Asset Intelligence & Lifecycle Management",
  icons: {
    icon: "/short_form_logo.png",
  },
};

const navItems = [
  { label: "Home", href: "/" },
  { label: "Sansad", href: "/sansad" },
  { label: "Manas", href: "/manas" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${questrial.variable} ${pixeloid.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <Suspense fallback={null}>
          <PillNav
            logo="/short_form_logo.png"
            logoAlt="ATAL Logo"
            items={navItems}
            baseColor="#ffffff"
            pillColor="#1b253c"
            hoveredPillTextColor="#1b253c"
            pillTextColor="#ffffff"
          />
        </Suspense>
        <PageTransition>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </PageTransition>
      </body>
    </html>
  );
}
