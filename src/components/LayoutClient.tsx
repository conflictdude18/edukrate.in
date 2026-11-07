
"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  children: ReactNode;
};

export default function LayoutClient({ children }: Props) {
  const { user } = useAuth();
  const pathname = usePathname();

  const isNotique =
    pathname === "/notique" || pathname.startsWith("/notique/");

  if (!user) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </div>
    );
  }

  return (
    <AppShell fullScreen={isNotique}>
      <div className="w-full min-w-0">
        {children}
      </div>

      {!isNotique && <Footer />}
    </AppShell>
  );
}
