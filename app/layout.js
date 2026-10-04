import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono",
});

export const metadata = {
  title: "PRO 4A - ICT Inventory Management System",
  description: "Sign in to the PRO 4A - ICT Inventory Management System.",
  icons: { icon: "/logo.jpg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${sans.className} ${mono.variable}`}>{children}</body>
    </html>
  );
}
