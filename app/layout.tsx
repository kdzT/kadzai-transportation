// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BookingProvider } from "../context/BookingContext";
import { Toaster } from "../components/ui/sonner";
import ConditionalLayout from "../components/layout/ConditionalLayout";
import AuthInitializer from "../lib/AuthInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KADZAI TRANSPORT AND LOGISTICS - Premium Bus Booking Platform",
  description: "Book comfortable and affordable bus tickets online with ease",
  icons: {
    icon: "/meta-logo.png",
    apple: "/meta-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <BookingProvider>
          <AuthInitializer />
          <ConditionalLayout>{children}</ConditionalLayout>
          <Toaster />
        </BookingProvider>
      </body>
    </html>
  );
}
