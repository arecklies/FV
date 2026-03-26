import type { Metadata } from "next";
import "./globals.css";
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper";

export const metadata: Metadata = {
  title: "Fachverfahren",
  description: "Digitale Baugenehmigung - Fachverfahren",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        <AuthLayoutWrapper>{children}</AuthLayoutWrapper>
      </body>
    </html>
  );
}
