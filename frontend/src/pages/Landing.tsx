import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Cloud,
  FileText,
  Lock,
  MessageSquareMore,
  Sparkles,
  Users2,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const productHighlights = [
  {
    icon: FileText,
    title: "One place for every draft",
    description:
      "Create, edit, organize, and return to documents without bouncing between tools.",
  },
  {
    icon: Sparkles,
    title: "AI help inside your flow",
    description:
      "Use built-in AI assistance to refine wording, structure ideas, and keep momentum while writing.",
  },
  {
    icon: Users2,
    title: "Real-time team editing",
    description:
      "See changes live, collaborate on the same file, and keep everyone working from the latest version.",
  },
];

const audiences = [
  "Students",
  "Researchers",
  "Content teams",
  "Writers",
  "Freelancers",
  "Operations",
  "Agencies",
  "Founders",
  "Editors",
  "Collaborators",
];

const workspaceModes = [
  {
    id: "writers",
    label: "Writers",
    title: "Start faster and stay in the draft",
    description:
      "From first outline to final revision, Dr.Writer keeps writing, formatting, and AI support in the same workspace.",
    cards: [
      {
        title: "Create documents",
        description: "Spin up a fresh draft, upload an existing file, and keep your work organized.",
        image: "./doc.jpg",
        tint: "from-[#fff4d9] via-white to-[#fffdf6]",
      },
      {
        title: "Edit with AI support",
        description: "Improve tone, clarity, and structure while you write instead of after the fact.",
        image: "./support.png",
        tint: "from-[#e9fff4] via-white to-[#f8fffc]",
      },
    ],
  },
  {
    id: "teams",
    label: "Teams",
    title: "Collaborate without version chaos",
    description:
      "Live edits, shared access, and synced updates help teams move through reviews without losing context.",
    cards: [
      {
        title: "Live collaboration",
        description: "Work in the same document together and watch updates land in real time.",
        image: "./collab.png",
        tint: "from-[#efe9ff] via-white to-[#fbf9ff]",
      },
      {
        title: "Cloud and offline flow",
        description: "Stay productive online or offline, then sync when you are back.",
        image: "./offline.png",
        tint: "from-[#ffecea] via-white to-[#fff8f7]",
      },
    ],
  },
];

const faqs = [
  {
    question: "What makes Dr.Writer different from a basic document editor?",
    answer:
      "It combines document editing, AI assistance, real-time collaboration, sharing, and cloud-friendly access in one workspace.",
  },
  {
    question: "Can multiple people edit the same document together?",
    answer:
      "Yes. Dr.Writer supports real-time collaboration so teammates can work inside the same document at the same time.",
  },
  {
    question: "Does it support AI writing help?",
    answer:
      "Yes. The project already includes LLM-powered assistance to help with editing, refinement, and productivity while writing.",
  },
  {
    question: "Can I access my work from anywhere?",
    answer:
      "Yes. The platform is built around cloud access and also supports offline editing flows that sync once you reconnect.",
  },
  {
    question: "Who is Dr.Writer for?",
    answer:
      "It works well for students, solo writers, small teams, content operations, and anyone who needs collaborative document workflows.",
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): string => {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email)) return "Enter a valid email address.";
  return "";
};

const Landing = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState(workspaceModes[0].id);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Hero email state
  const [heroEmail, setHeroEmail] = useState("");
  const [heroError, setHeroError] = useState("");
  const [heroSuccess, setHeroSuccess] = useState(false);

  // Bottom CTA email state
  const [ctaEmail, setCtaEmail] = useState("");
  const [ctaError, setCtaError] = useState("");
  const [ctaSuccess, setCtaSuccess] = useState(false);

  const whyRef = useRef<HTMLElement | null>(null);
  const useCasesRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);

  const activeWorkspace = workspaceModes.find((mode) => mode.id === activeMode) ?? workspaceModes[0];

  const scrollTo = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Simulate waitlist API call — replace with real endpoint
  const submitWaitlist = async (email: string): Promise<void> => {
    await new Promise((res) => setTimeout(res, 600));
    // TODO: replace with real API call e.g.:
    // await fetch("/api/waitlist", { method: "POST", body: JSON.stringify({ email }) })
    console.log("Waitlist signup:", email);
  };

  const handleHeroSubmit = async () => {
    const error = validateEmail(heroEmail);
    if (error) { setHeroError(error); return; }
    setHeroError("");
    try {
      await submitWaitlist(heroEmail);
      setHeroSuccess(true);
      setHeroEmail("");
    } catch {
      setHeroError("Something went wrong. Please try again.");
    }
  };

  const handleCtaSubmit = async () => {
    const error = validateEmail(ctaEmail);
    if (error) { setCtaError(error); return; }
    setCtaError("");
    try {
      await submitWaitlist(ctaEmail);
      setCtaSuccess(true);
      setCtaEmail("");
    } catch {
      setCtaError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ea_0%,#ffffff_40%,#fcfaf7_100%)] text-slate-950 [font-family:'Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8 lg:px-12">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-3 text-sm font-semibold tracking-tight"
          >
            <img src="./icon.png" alt="Dr.Writer logo" className="h-9 w-9 rounded-full border border-black/10" />
            <span>Dr.Writer</span>
          </button>

          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
            <button onClick={() => scrollTo(whyRef as React.RefObject<HTMLElement>)} className="transition hover:text-slate-950">
              Why choose us
            </button>
            <button onClick={() => scrollTo(useCasesRef as React.RefObject<HTMLElement>)} className="transition hover:text-slate-950">
              Workspace flow
            </button>
            <button onClick={() => scrollTo(faqRef as React.RefObject<HTMLElement>)} className="transition hover:text-slate-950">
              FAQs
            </button>
          </nav>

          <Button
            onClick={() => navigate("/login")}
            className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
          >
            Start writing
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.02fr_1fr] lg:px-12 lg:pb-28 lg:pt-16">
          <div className="flex max-w-xl flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Real-time collaborative document workspace
            </div>

            <h1 className="max-w-2xl text-5xl leading-[0.98] font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl [font-family:'Cormorant_Garamond',Georgia,serif]">
              Write. Collaborate. Polish. Finally, all in one place.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 sm:text-lg">
              Dr.Writer brings editing, AI assistance, file management, live collaboration, and
              cloud-ready access into one calm writing space for modern document work.
            </p>

            <div className="mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Input
                  type="email"
                  placeholder="Enter your email to reserve a spot"
                  value={heroEmail}
                  onChange={(e) => {
                    setHeroEmail(e.target.value);
                    if (heroError) setHeroError("");
                    if (heroSuccess) setHeroSuccess(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleHeroSubmit()}
                  className="h-12 rounded-full border-black/10 bg-white/90 pl-5 shadow-sm"
                />
              </div>
              <Button
                onClick={handleHeroSubmit}
                className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
              >
                Launch workspace
              </Button>
            </div>

            {heroError && (
              <p className="mt-2 text-sm text-red-500">{heroError}</p>
            )}
            {heroSuccess && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                You're on the list! We'll be in touch soon.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Rich text editing
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Multi-user collaboration
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                AI-assisted writing
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 top-6 h-24 rounded-full bg-[#ffe6c8] blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
              <div className="overflow-hidden rounded-[1.5rem] bg-[#f4efe8]">
                <img
                  src="./Editor.png"
                  alt="Dr.Writer editor interface"
                  className="h-full w-full object-cover object-top"
                />
              </div>

              <div className="absolute left-0 top-10 w-48 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur sm:-left-10">
                <div className="flex items-center justify-between text-sm font-semibold">
                  AI Assistant
                  <Brain className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Refine wording, improve structure, and keep the draft moving.
                </p>
              </div>

              <div className="absolute bottom-24 left-4 w-56 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur sm:left-10">
                <div className="flex items-center justify-between text-sm font-semibold">
                  Collaboration
                  <Users2 className="h-4 w-4 text-slate-700" />
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Invite teammates and watch live changes land instantly.
                </p>
              </div>

              <div className="absolute bottom-10 right-4 w-52 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur sm:right-8">
                <div className="flex items-center justify-between text-sm font-semibold">
                  Access anywhere
                  <Cloud className="h-4 w-4 text-sky-600" />
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Cloud-first workflows with offline-friendly continuity.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why section */}
        <section
          ref={whyRef}
          className="mx-auto grid max-w-7xl gap-10 border-t border-black/5 px-5 py-20 sm:px-8 lg:grid-cols-[0.95fr_1fr] lg:px-12"
        >
          <div>
            <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight [font-family:'Cormorant_Garamond',Georgia,serif] sm:text-5xl">
              Because document work should not feel this scattered.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Dr.Writer is built for people who want the speed of a focused editor with the teamwork,
            AI help, and file access expected from a modern workspace.
          </p>
        </section>

        {/* Product highlights */}
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <div className="grid gap-4 lg:grid-cols-3">
            {productHighlights.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="rounded-[1.75rem] border border-black/8 bg-white/85 p-7 shadow-[0_14px_40px_rgba(15,23,42,0.06)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8f2ea] text-slate-900">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Audience ticker */}
        <section className="overflow-hidden py-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center px-5 text-center sm:px-8 lg:px-12">
            <h2 className="text-4xl font-semibold tracking-tight [font-family:'Cormorant_Garamond',Georgia,serif] sm:text-5xl">
              For everyone who works with words
            </h2>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {audiences.map((audience) => (
                <div
                  key={audience}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
                >
                  {audience}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workspace modes */}
        <section ref={useCasesRef} className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-semibold tracking-tight [font-family:'Cormorant_Garamond',Georgia,serif] sm:text-5xl">
              We built the hard part so your writing flow feels easy
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Whether you are drafting alone or reviewing with a team, every essential step stays
              inside one workspace.
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-2 rounded-full bg-[#f5f1eb] p-1 w-fit mx-auto">
            {workspaceModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveMode(mode.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  activeMode === mode.id ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {activeWorkspace.cards.map((card) => (
              <article
                key={card.title}
                className={`overflow-hidden rounded-[2rem] border border-black/8 bg-gradient-to-br ${card.tint} p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]`}
              >
                <div className="max-w-sm">
                  <h3 className="text-2xl font-semibold tracking-tight">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
                <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/80">
                  <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-[2rem] border border-black/8 bg-white p-7 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">{activeWorkspace.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {activeWorkspace.description}
                </p>
              </div>
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="rounded-full px-5"
              >
                Open Dr.Writer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ + CTA card */}
        <section
          ref={faqRef}
          className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.95fr_0.85fr] lg:px-12"
        >
          <div>
            <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight [font-family:'Cormorant_Garamond',Georgia,serif] sm:text-5xl">
              Start before the document chaos starts.
            </h2>
            <div className="mt-8 space-y-3">
              {faqs.map((faq, index) => (
                <button
                  key={faq.question}
                  onClick={() => setOpenFaq((current) => (current === index ? null : index))}
                  className="w-full rounded-[1.5rem] border border-black/8 bg-white px-5 py-4 text-left shadow-sm"
                >
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-sm font-medium text-slate-900 sm:text-base">{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                  {openFaq === index && (
                    <p className="pt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* CTA card with working email */}
          <div className="rounded-[2rem] border border-black/10 bg-[linear-gradient(145deg,#fff2e6,#ffffff_40%,#eefbf5)] p-[1px] shadow-[0_25px_70px_rgba(15,23,42,0.1)]">
            <div className="rounded-[2rem] bg-white p-8">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500">Everything your workspace needs</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                  Move from first draft to shared final version
                </h3>
              </div>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl border border-black/8 bg-[#fcfaf7] p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-800" />
                    <span className="text-sm font-medium">Document creation and uploads</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-black/8 bg-[#fcfaf7] p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquareMore className="h-5 w-5 text-slate-800" />
                    <span className="text-sm font-medium">Collaboration, sharing, and live updates</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-black/8 bg-[#fcfaf7] p-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-slate-800" />
                    <span className="text-sm font-medium">Cloud access with a focused, secure workflow</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={ctaEmail}
                  onChange={(e) => {
                    setCtaEmail(e.target.value);
                    if (ctaError) setCtaError("");
                    if (ctaSuccess) setCtaSuccess(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCtaSubmit()}
                  className="h-11 rounded-full bg-[#faf7f2]"
                />
                <Input
                  readOnly
                  value="Built for individual and team writing"
                  className="h-11 rounded-full bg-[#faf7f2] text-slate-500 cursor-default"
                />
              </div>

              {ctaError && (
                <p className="mt-2 text-sm text-red-500">{ctaError}</p>
              )}
              {ctaSuccess && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  You're on the list! We'll reach out soon.
                </p>
              )}

              <Button
                onClick={handleCtaSubmit}
                className="mt-6 h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                Continue to workspace
              </Button>
            </div>
          </div>
        </section>

        {/* Bottom CTA banner */}
        <section className="mx-auto max-w-5xl px-5 pb-24 pt-8 text-center sm:px-8">
          <div className="rounded-[2.5rem] border border-black/8 bg-white/90 px-6 py-14 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-[#faf4ec]">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight [font-family:'Cormorant_Garamond',Georgia,serif] sm:text-5xl">
              Ready to make document work feel lighter?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Open Dr.Writer to start editing, collaborate in real time, and keep every draft in one
              focused workspace.
            </p>
            <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="Enter your email to reserve a spot"
                value={heroEmail}
                onChange={(e) => {
                  setHeroEmail(e.target.value);
                  if (heroError) setHeroError("");
                  if (heroSuccess) setHeroSuccess(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleHeroSubmit()}
                className="h-12 rounded-full bg-[#faf7f2] pl-5"
              />
              <Button
                onClick={handleHeroSubmit}
                className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
              >
                Reserve my spot
              </Button>
            </div>
            {heroError && (
              <p className="mt-2 text-sm text-red-500">{heroError}</p>
            )}
            {heroSuccess && (
              <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                You're on the list! We'll be in touch soon.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-black/6 bg-white/80">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto_auto] lg:px-12">
          <div>
            <div className="flex items-center gap-3 text-sm font-semibold">
              <img src="./icon.png" alt="Dr.Writer logo" className="h-9 w-9 rounded-full border border-black/10" />
              Dr.Writer
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
              Rich text editing, live collaboration, and AI-assisted writing in one focused document workspace.
            </p>
          </div>
          <div className="text-sm text-slate-500">
            <p className="font-semibold text-slate-900">Explore</p>
            <div className="mt-4 space-y-3">
              <button onClick={() => scrollTo(whyRef as React.RefObject<HTMLElement>)} className="block transition hover:text-slate-900">
                Why Dr.Writer
              </button>
              <button onClick={() => scrollTo(useCasesRef as React.RefObject<HTMLElement>)} className="block transition hover:text-slate-900">
                Workspace flow
              </button>
              <button onClick={() => scrollTo(faqRef as React.RefObject<HTMLElement>)} className="block transition hover:text-slate-900">
                FAQs
              </button>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            <p className="font-semibold text-slate-900">Access</p>
            <div className="mt-4 space-y-3">
              <button onClick={() => navigate("/login")} className="block transition hover:text-slate-900">
                Login
              </button>
              <button onClick={() => navigate("/login")} className="block transition hover:text-slate-900">
                Open workspace
              </button>
              <p>© {new Date().getFullYear()} Dr.Writer</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;