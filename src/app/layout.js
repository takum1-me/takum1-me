import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "takum1.me",
  description: "書く仕事、隠し事。",
  publisher: "takum1",
  openGraph: {
    type: "website",
    site_name: "takum1.me",
    locale: "ja_JP",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
