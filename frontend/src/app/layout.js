import { Geist, Geist_Mono, Fredericka_the_Great } from 'next/font/google';
import '@schedule-x/theme-default/dist/index.css';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const fredericka = Fredericka_the_Great({
  variable: '--font-fredericka',
  weight: '400',
  subsets: ['latin'],
  adjustFontFallback: false,
  display: 'swap',
});

export const metadata = {
  title: 'Familyboard',
  description: 'Help to stay organized',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <meta></meta>

      <body
        className={`${geistSans.variable} ${fredericka.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
