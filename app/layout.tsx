import React from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import TopBar from '../components/TopBar';
import ProtectedRoute from '@/contexts/ProtectedRoute';
import Footer from '../components/Footer';
import { Analytics } from "@vercel/analytics/react";
import { metadata } from "./metadata";

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export { metadata };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Analytics mode="auto" />
        <AuthProvider>   
            <ProtectedRoute>
              <TopBar />    
              <main>{children}</main>
              <Footer />
            </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}