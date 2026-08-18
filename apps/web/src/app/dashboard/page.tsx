import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your practice sessions, review metrics, and track improvement over time.",
};

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}
