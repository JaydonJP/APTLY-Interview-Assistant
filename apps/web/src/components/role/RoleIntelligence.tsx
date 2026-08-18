"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  FileText,
  Gauge,
  LoaderCircle,
  Mic2,
  ScanSearch,
  Sparkles,
  Video,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { InterviewDetail, Job, RoleProfile } from "@/types/interview";

type SetupStep = "brief" | "profile" | "session";

interface JobPreset {
  title: string;
  company: string;
  text: string;
}

const SAMPLE_ROLES: JobPreset[] = [
  {
    title: "Senior Full-Stack Engineer",
    company: "Stripe",
    text: "We are looking for a Senior Full-Stack Engineer with 5+ years of experience building modern web applications. You will architect TypeScript and React interfaces, design Python and PostgreSQL APIs, improve reliability and performance, lead code reviews, and mentor engineers. Strong product judgement, testing discipline, and cross-functional communication are required.",
  },
  {
    title: "AI / ML Platform Engineer",
    company: "OpenAI",
    text: "Join our AI platform team building multimodal evaluation and inference infrastructure. You will work with Python, PyTorch, asynchronous audio processing, speech-to-text, vector search, and high-throughput model serving. We value production experience, empirical evaluation, observability, and clear technical trade-off reasoning.",
  },
  {
    title: "Backend Infrastructure Engineer",
    company: "Uber",
    text: "Build and scale distributed cloud systems using Python or Go, PostgreSQL, Redis, Kubernetes, and asynchronous services. You will own low-latency APIs, fault tolerance, data integrity, zero-downtime migrations, observability, and incident response. Candidates should communicate architecture choices and measurable production outcomes.",
  },
  {
    title: "Engineering Manager, Platform",
    company: "Google",
    text: "Lead a distributed platform team of senior engineers. Partner with product and infrastructure leaders on roadmaps, hiring, coaching, technical strategy, and delivery. We need evidence of growing teams, navigating conflict, driving accountability, and making high-quality decisions under ambiguity.",
  },
];

const STEPS: Array<{ id: SetupStep; label: string }> = [
  { id: "brief", label: "Role brief" },
  { id: "profile", label: "Role intelligence" },
  { id: "session", label: "Final check" },
];

export function RoleIntelligence() {
  const router = useRouter();
  const [step, setStep] = useState<SetupStep>("brief");
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [analyzedJob, setAnalyzedJob] = useState<Job | null>(null);
  const [roleProfile, setRoleProfile] = useState<RoleProfile | null>(null);
  const [interviewType, setInterviewType] = useState("mixed");
  const [difficultyLevel, setDifficultyLevel] = useState("medium");
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(10);
  const [questionCount, setQuestionCount] = useState(3);
  const [recommendedDifficulty, setRecommendedDifficulty] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiClient
      .get<{ recommended_difficulty: string }>("/api/v1/progress")
      .then((progress) => setRecommendedDifficulty(progress.recommended_difficulty))
      .catch(() => undefined);
  }, []);

  const analyzeRole = async () => {
    if (jobDescription.trim().length < 20) {
      setError("Paste a job description so APTLY can build the role profile.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    try {
      const result = await apiClient.post<Job>("/api/v1/jobs/analyze", {
        job_description: jobDescription,
        title: jobTitle || undefined,
        company: company || undefined,
      });
      setAnalyzedJob(result);
      setRoleProfile(result.role_profile ?? null);
      if (!result.role_profile) {
        throw new Error("The role was saved, but its profile is not ready yet.");
      }
      setStep("profile");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "APTLY could not analyze this role. Please try again.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const launchInterview = async () => {
    setError(null);
    setIsCreating(true);
    try {
      const interview = await apiClient.post<InterviewDetail>("/api/v1/interviews", {
        job_id: analyzedJob?.id,
        role_profile_id: roleProfile?.id,
        title: roleProfile?.role_title || jobTitle || "Practice Interview",
        interview_type: interviewType,
        difficulty_level: difficultyLevel,
        target_duration_minutes: targetDurationMinutes,
        question_count: questionCount,
        is_panel_mode: interviewType === "panel",
      });
      router.push(`/interview/${interview.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "APTLY could not create this interview.",
      );
      setIsCreating(false);
    }
  };

  const setDuration = (minutes: number) => {
    setTargetDurationMinutes(minutes);
    setQuestionCount(minutes <= 10 ? 3 : minutes <= 15 ? 4 : 5);
  };

  const currentStepIndex = STEPS.findIndex((item) => item.id === step);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="eyebrow">Role intelligence</p>
          <h1 className="mt-4 max-w-2xl text-balance text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-5xl">
            Build the interview around the job, not a generic question bank.
          </h1>
        </div>
        <ol className="flex items-center gap-2" aria-label="Interview setup progress">
          {STEPS.map((item, index) => (
            <li key={item.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (index === 0 || roleProfile) setStep(item.id);
                }}
                disabled={index > 0 && !roleProfile}
                aria-current={step === item.id ? "step" : undefined}
                className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[0.7rem] font-medium transition ${
                  step === item.id
                    ? "border-violet-300/30 bg-violet-300/10 text-violet-100"
                    : index < currentStepIndex
                      ? "border-emerald-300/20 text-emerald-300"
                      : "border-white/[0.07] text-zinc-600"
                }`}
              >
                {index < currentStepIndex ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}
                <span className="hidden md:inline">{item.label}</span>
              </button>
              {index < STEPS.length - 1 && <span className="h-px w-3 bg-white/[0.08]" />}
            </li>
          ))}
        </ol>
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-red-300/20 bg-red-300/[0.07] px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {step === "brief" && (
        <section className="grid overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0d0f13] lg:grid-cols-[0.72fr_1.28fr]">
          <div className="relative flex min-h-[34rem] flex-col justify-between overflow-hidden border-b border-white/[0.07] p-7 sm:p-9 lg:border-b-0 lg:border-r">
            <div className="fine-grid pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/[0.08] text-violet-200">
                <ScanSearch className="h-5 w-5" />
              </span>
              <h2 className="mt-7 text-2xl font-medium tracking-[-0.03em] text-stone-100">
                Paste the role. We will find what the interview is really testing.
              </h2>
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                APTLY extracts seniority, competencies, technical themes, behavioral areas, and a balanced interview mix.
              </p>
            </div>
            <div className="relative mt-10">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-zinc-600">Try an example</p>
              <div className="mt-3 space-y-1.5">
                {SAMPLE_ROLES.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      setJobTitle(preset.title);
                      setCompany(preset.company);
                      setJobDescription(preset.text);
                    }}
                    className="group flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2.5 text-left transition hover:border-white/[0.07] hover:bg-white/[0.025]"
                  >
                    <span>
                      <span className="block text-xs font-medium text-zinc-300">{preset.title}</span>
                      <span className="mt-0.5 block text-[0.68rem] text-zinc-600">{preset.company}</span>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-9">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Role title <span className="text-zinc-700">optional</span></span>
                <input
                  value={jobTitle}
                  onChange={(event) => setJobTitle(event.target.value)}
                  placeholder="Senior ML Engineer"
                  className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-violet-300/40 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Company <span className="text-zinc-700">optional</span></span>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Company name"
                  className="mt-2 h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-sm text-zinc-100 placeholder:text-zinc-700 focus:border-violet-300/40 focus:outline-none"
                />
              </label>
            </div>

            <label className="mt-6 block">
              <span className="flex items-center justify-between text-xs font-medium text-zinc-400">
                <span>Job description</span>
                <span className="font-mono text-[0.65rem] text-zinc-700">{jobDescription.length} characters</span>
              </span>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                rows={14}
                placeholder="Paste the responsibilities, requirements, and qualifications here..."
                className="mt-2 w-full resize-y rounded-2xl border border-white/[0.08] bg-black/25 p-4 text-sm leading-6 text-zinc-200 placeholder:text-zinc-700 focus:border-violet-300/40 focus:outline-none"
              />
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void analyzeRole()}
                disabled={isAnalyzing || jobDescription.trim().length < 20}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAnalyzing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isAnalyzing ? "Reading the role..." : "Build role intelligence"}
                {!isAnalyzing && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "profile" && roleProfile && (
        <section className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0d0f13]">
          <div className="relative border-b border-white/[0.07] px-7 py-9 sm:px-10">
            <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-violet-400/[0.08] blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Profile extracted</p>
                <h2 className="mt-4 text-3xl font-medium tracking-[-0.04em] text-stone-100 sm:text-4xl">{roleProfile.role_title}</h2>
                <p className="mt-3 text-sm text-zinc-500">{roleProfile.seniority} / {roleProfile.domain}</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep("brief")} className="min-h-10 rounded-xl border border-white/[0.09] px-4 text-xs font-medium text-zinc-400 hover:text-zinc-100">
                  Edit brief
                </button>
                <button type="button" onClick={() => setStep("session")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-stone-100 px-4 text-xs font-semibold text-zinc-950 hover:bg-white">
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-white/[0.055] lg:grid-cols-2">
            <ProfileSection title="Core competencies" icon={<BriefcaseBusiness className="h-4 w-4" />}>
              <TagList items={[...roleProfile.technical_skills, ...roleProfile.behavioral_competencies].slice(0, 10)} />
            </ProfileSection>
            <ProfileSection title="Technical themes" icon={<Gauge className="h-4 w-4" />}>
              <TagList items={[...roleProfile.tools, ...roleProfile.interview_topics].slice(0, 10)} tone="blue" />
            </ProfileSection>
            <ProfileSection title="What strong evidence sounds like" icon={<FileText className="h-4 w-4" />}>
              <ul className="space-y-3">
                {roleProfile.responsibilities.slice(0, 4).map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-zinc-400">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-300" />
                    {item}
                  </li>
                ))}
              </ul>
            </ProfileSection>
            <ProfileSection title="Planned interview mix" icon={<Sparkles className="h-4 w-4" />}>
              <div className="space-y-3">
                {[
                  ["Role depth", "Technical choices, constraints, and trade-offs"],
                  ["Proof", "Baselines, individual ownership, and measurable outcomes"],
                  ["Behavior", "Judgement, conflict, communication, and reflection"],
                ].map(([title, copy], index) => (
                  <div key={title} className="flex gap-4">
                    <span className="font-mono text-[0.65rem] text-zinc-700">0{index + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ProfileSection>
          </div>
        </section>
      )}

      {step === "session" && roleProfile && (
        <section className="grid overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0d0f13] lg:grid-cols-[1fr_0.74fr]">
          <div className="border-b border-white/[0.07] p-7 sm:p-9 lg:border-b-0 lg:border-r">
            <p className="eyebrow">Session shape</p>
            <h2 className="mt-4 text-2xl font-medium tracking-[-0.03em] text-stone-100">One final check, then you are in the room.</h2>

            <fieldset className="mt-8">
              <legend className="text-xs font-medium text-zinc-400">Interview focus</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  ["mixed", "Balanced", "Technical and behavioral"],
                  ["technical", "Technical depth", "Systems and trade-offs"],
                  ["behavioral", "Behavioral", "Ownership and judgement"],
                  ["panel", "Panel", "HR and technical perspectives"],
                ].map(([id, title, copy]) => (
                  <button key={id} type="button" onClick={() => setInterviewType(id)} className={`rounded-xl border p-4 text-left transition ${interviewType === id ? "border-violet-300/35 bg-violet-300/[0.08]" : "border-white/[0.07] bg-white/[0.018] hover:border-white/[0.13]"}`}>
                    <span className="block text-sm font-medium text-zinc-200">{title}</span>
                    <span className="mt-1 block text-xs text-zinc-600">{copy}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-7 grid gap-6 sm:grid-cols-2">
              <fieldset>
                <legend className="text-xs font-medium text-zinc-400">Duration</legend>
                <div className="mt-3 flex gap-2">
                  {[10, 15, 20].map((minutes) => (
                    <button key={minutes} type="button" onClick={() => setDuration(minutes)} className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${targetDurationMinutes === minutes ? "border-white/25 bg-white/[0.08] text-zinc-100" : "border-white/[0.07] text-zinc-600 hover:text-zinc-300"}`}>
                      {minutes} min
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="flex items-center justify-between text-xs font-medium text-zinc-400">
                  Difficulty
                  {recommendedDifficulty && <span className="text-[0.65rem] font-normal text-violet-300">Recommended: {recommendedDifficulty}</span>}
                </legend>
                <div className="mt-3 flex gap-2">
                  {["easy", "medium", "hard"].map((level) => (
                    <button key={level} type="button" onClick={() => setDifficultyLevel(level)} className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition ${difficultyLevel === level ? "border-white/25 bg-white/[0.08] text-zinc-100" : "border-white/[0.07] text-zinc-600 hover:text-zinc-300"}`}>
                      {level}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          <div className="flex flex-col justify-between p-7 sm:p-9">
            <div>
              <p className="eyebrow">Device calibration</p>
              <div className="mt-6 space-y-3">
                <DeviceLine icon={<Video className="h-4 w-4" />} title="Camera" copy="Framing preview begins in the interview room." />
                <DeviceLine icon={<Mic2 className="h-4 w-4" />} title="Microphone" copy="APTLY waits for a clear signal before the first question." />
              </div>
              <div className="mt-7 rounded-xl border border-white/[0.07] bg-black/20 p-4">
                <p className="text-xs font-medium text-zinc-300">{roleProfile.role_title}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-600">{questionCount} adaptive questions / approximately {targetDurationMinutes} minutes</p>
              </div>
            </div>

            <div className="mt-10">
              <p className="text-xs leading-5 text-zinc-600">Analytics stay hidden while you answer. You will see evidence only after the interview ends.</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <button type="button" onClick={() => setStep("profile")} className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-200">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
                <button type="button" onClick={() => void launchInterview()} disabled={isCreating} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-stone-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:opacity-50">
                  {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  {isCreating ? "Preparing room..." : "Enter interview room"}
                  {!isCreating && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ProfileSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-[#0d0f13] p-7 sm:p-9">
      <div className="flex items-center gap-2 text-zinc-500">{icon}<h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.16em]">{title}</h3></div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TagList({ items, tone = "violet" }: { items: string[]; tone?: "violet" | "blue" }) {
  if (items.length === 0) return <p className="text-sm text-zinc-600">Insufficient role data</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-lg border px-3 py-1.5 text-xs ${tone === "blue" ? "border-blue-300/15 bg-blue-300/[0.05] text-blue-200" : "border-violet-300/15 bg-violet-300/[0.05] text-violet-200"}`}>{item}</span>
      ))}
    </div>
  );
}

function DeviceLine({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.018] p-4">
      <span className="mt-0.5 text-zinc-500">{icon}</span>
      <div><p className="text-sm font-medium text-zinc-200">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-600">{copy}</p></div>
    </div>
  );
}
