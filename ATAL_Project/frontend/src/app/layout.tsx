import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PageTransition from "../animations/PageTransition";
import PillNav from "../components/PillNav";

const questrial = localFont({
  src: "../../public/fonts/Questrial-Regular.ttf",
  variable: "--font-questrial",
  weight: "400",
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
      className={`${questrial.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PillNav
          logo="/short_form_logo.png"
          logoAlt="ATAL Logo"
          items={navItems}
          baseColor="#ffffff"
          pillColor="#1b253c"
          hoveredPillTextColor="#1b253c"
          pillTextColor="#ffffff"
        />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
