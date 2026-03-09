// @ts-nocheck

"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/auth/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import React from 'react';
import { Providers } from '@/app/providers';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  // The I18nextProvider needs to be inside the body and wrap the children
  // to ensure the context is available to all components.
  // Using Suspense here can sometimes interfere with context propagation
  // on the client side for i18n, so we'll rely on the inner components'
  // suspense boundaries if needed.

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>AgriVisionAI</title>
        <meta name="description" content="A smart tomato yield intelligence platform." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <I18nextProvider i18n={i18n}>
          <Providers>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </Providers>
        </I18nextProvider>
      </body>
    </html>
  );
}
