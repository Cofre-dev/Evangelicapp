import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { ChangePasswordOnboardingModal } from "@/components/onboarding/change-password-modal";
import { PersonalDataOnboardingModal } from "@/components/onboarding/personal-data-modal";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Evangelicapp",
  description: "Gestión administrativa y financiera para iglesias evangélicas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
        <ChangePasswordOnboardingModal />
        <PersonalDataOnboardingModal />
      </body>
    </html>
  );
}
