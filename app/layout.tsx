import type { ReactNode } from 'react';

export const metadata = {
  title: 'Mealyn Gnani adapter',
  description: 'MCP adapter for Gnani speech services',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
