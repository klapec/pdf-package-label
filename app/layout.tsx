import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Etykieta PDF',
  description: 'Wgraj etykietę PDF A4 i przenieś ją do wybranego rogu.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
