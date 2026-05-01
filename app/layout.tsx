import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'RISE HR',
  description: 'Système d\'Information RH (SIRH) adapté au contexte malgache',
  manifest: '/manifest.json',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr" className="antialiased scroll-smooth">
      <body className="font-sans font-normal text-gray-900 bg-gray-50 selection:bg-[#1B2A4A] selection:text-white" suppressHydrationWarning>
        <AuthProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
