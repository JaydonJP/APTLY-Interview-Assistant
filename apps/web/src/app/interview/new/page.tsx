import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { RoleIntelligence } from "@/components/role/RoleIntelligence";

export const metadata: Metadata = {
  title: "Role Intelligence",
  description: "Turn a job description into a focused, evidence-seeking interview.",
};

export default function NewInterviewPage() {
  return (
    <AppShell>
      <RoleIntelligence />
    </AppShell>
  );
}
