import type { Metadata } from "next";
import { ShopHeader } from "@/components/shop-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopNow — Thoughtful things for everyday living",
  description: "A considered collection of useful, beautiful things for everyday life.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ShopHeader />
        <main className="page-shell">{children}</main>
        <footer className="site-footer">
          <div className="container site-footer-inner">
            <span>© {new Date().getFullYear()} ShopNow. Thoughtfully selected.</span>
            <span>Good things, made for everyday.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
