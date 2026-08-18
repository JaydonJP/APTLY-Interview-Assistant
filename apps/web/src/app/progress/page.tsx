import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";

export const metadata: Metadata = {
  title: "Longitudinal Progress & Analytics Lab | APTLY",
  description: "Track your longitudinal interview mastery trajectory, empirical speech metrics, and STAR evidence growth.",
};

export default function ProgressPage() {
  return (
    <AppShell>
      <ProgressDashboard />
    </AppShell>
  );
}
