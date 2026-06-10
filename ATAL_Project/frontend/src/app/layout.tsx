import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PageTransition from "../components/PageTransition";

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
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
