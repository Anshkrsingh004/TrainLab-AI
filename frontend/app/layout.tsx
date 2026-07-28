import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrainLab AI",
  description: "The Modern AI Training & MLOps Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
