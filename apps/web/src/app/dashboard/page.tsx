import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { HealthCard } from "@/components/health/HealthCard";
import { Card, CardHeader } from "@/components/ui/Card";
import Link from "next/link";
import { PlusCircle, BarChart2, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard",
};

const QUICK_ACTIONS = [
  {
    id: "action-new-interview",
    href: "/interview/new",
    icon: PlusCircle,
    title: "New Interview",
    description: "Start a practice session with AI interviewer",
    badge: "Phase 1",
  },
  {
    id: "action-view-progress",
    href: "/progress",
    icon: BarChart2,
    title: "Progress",
    description: "Track improvement across your interview history",
    badge: "Phase 3",
  },
  {
    id: "action-view-docs",
    href: "/docs",
    icon: BookOpen,
    title: "Documentation",
    description: "Architecture, API contracts, and development guide",
    badge: null,
  },
];

export default function DashboardPage() {
  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Welcome to APTLY — Phase 0 Foundation"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_ACTIONS.map(
              ({ id, href, icon: Icon, title, description, badge }) => (
                <Link
                  key={href}
                  id={id}
                  href={href}
                  className="group relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                      <Icon
                        className="h-4 w-4 text-slate-700"
                        aria-hidden="true"
                      />
                    </div>
                    {badge && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </Link>
              ),
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            System Status
          </h2>
          <HealthCard />
        </div>
      </div>

      {/* Phase 0 info */}
      <div className="mt-8">
        <Card>
          <CardHeader
            title="Phase 0 — Foundation Complete"
            description="What's been built"
          />
          <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                FastAPI with structured logging + error handling
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                PostgreSQL + SQLAlchemy 2.x + Alembic migrations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Provider abstractions (LLM, TTS, Transcription, Storage)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Mock providers for all AI services
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Local object storage with privacy controls
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Domain events + WebSocket protocol definitions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Next.js App Router with typed API client
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-500">✓</span>
                Prompt versioning + schema versioning conventions
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
