import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressOverview } from "@/components/progress/ProgressOverview";

export const metadata: Metadata = {
  title: "Progress",
  description: "Track measured delivery signals and evaluated answer quality over time.",
};

export default function ProgressPage() {
  return (
    <AppShell>
      <ProgressOverview />
    </AppShell>
  );
}
