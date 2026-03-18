import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaluLink · Chronic Treatment App",
  description: "Healthcare professional tool for chronic condition management and PMB compliance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased min-h-screen"
        style={{ backgroundColor: '#07091a', color: '#f1f5f9' }}
      >
        {children}
      </body>
    </html>
  );
}
