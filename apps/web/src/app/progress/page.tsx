import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { BarChart2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Progress",
  description: "Track your interview improvement over time",
};

export default function ProgressPage() {
  return (
    <AppShell>
      <PageHeader
        title="Progress"
        description="Track your improvement across interview sessions"
      />

      <Card id="progress-placeholder">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <BarChart2
              className="h-8 w-8 text-slate-400"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold text-slate-900">Coming in Phase 3</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Progress tracking will show your improvement trajectory across
              interviews with version-stable scoring and trend analysis.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600 max-w-md">
            <strong className="text-slate-900">Measurement guarantee:</strong>{" "}
            Scores are only compared within the same scoring algorithm version.
            Algorithm upgrades never artificially inflate progress.
          </div>
        </div>
      </Card>
    </AppShell>
  );
}
