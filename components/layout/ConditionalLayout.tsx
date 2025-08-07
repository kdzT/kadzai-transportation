"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

const pagesWithLayout = [
  "/",
  "/trip-search",
  "/contact",
  "/about",
  "/booking-confirmation",
  "/terms-of-service",
];

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if the current path is one of the main pages
  const showLayout = pagesWithLayout.includes(pathname);

  if (showLayout) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50">{children}</main>
        <Footer />
      </>
    );
  }

  // For other pages (like /booking-confirmation), render children without the main header and footer.
  // You could add a different, minimal layout here if needed.
  return <>{children}</>;
}
