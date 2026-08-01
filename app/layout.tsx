import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Captee',
  description: 'App-less event photo and video collection platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
