import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { AuthLayoutWrapper } from "@/components/auth/auth-layout-wrapper";
import { Toaster } from "@/components/ui/sonner";

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
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased print:!bg-white print:!text-black">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthLayoutWrapper>{children}</AuthLayoutWrapper>
          <Toaster duration={3000} closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
