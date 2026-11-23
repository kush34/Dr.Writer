import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bold, Italic, List, Link2, Undo2, Redo2, Download, Save, PanelLeftClose, SendHorizontal,
  ChevronDown,
  FileText,
  Lock,
  MessageSquareMore,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./landing-models.css";
import { availableModels } from "@/config/models";
import { useNavigate } from "react-router-dom";

function HeroEditor() {
  const [editMode, setEditMode] = useState(false);
  const [model, setModel] = useState(availableModels[0]);
  return (
    <figure className="hero-editor-frame" aria-label="Interactive preview of the Dr.Writer editor">
      <div className="hero-editor-window">
        <div className="hero-editor-top"><span className="hero-editor-dots" aria-hidden="true"><i /><i /><i /></span><span>Dr.Writer</span><span className="hero-editor-top-end"><span className="hero-editor-status" /> Workspace preview</span></div>
        <div className="hero-editor-body">
          <div className="hero-editor-chat">
            <div className="hero-editor-chat-header"><span className="hero-editor-brand"><img src="./icon.png" alt="" /> Dr.Writer</span><span className="hero-editor-chat-tag">AI assistant</span></div>
            <div className="hero-editor-conversation">
              <div className="hero-editor-label">TODAY</div>
              <div className="hero-editor-question">Help me turn this idea into a clearer introduction.</div>
              <div className="hero-editor-time">10:24 AM</div>
              <div className="hero-editor-answer"><span className="hero-editor-spark">✦</span><div><strong>Let’s make it more direct.</strong><p>I’ve brought the main idea forward and given the opening a little more room to breathe.</p></div></div>
              <div className="hero-editor-time hero-editor-time-right">10:24 AM &nbsp; · &nbsp; AI response</div>
              <div className="hero-editor-question hero-editor-followup">Keep the tone warm and thoughtful.</div>
              <div className="hero-editor-response-note"><span className="hero-editor-status" /> Ready to help with your draft</div>
            </div>
            <div className="hero-editor-composer"><div className="hero-editor-modes"><span>Discuss</span><button type="button" role="switch" aria-label="Edit mode" aria-checked={editMode} onClick={() => setEditMode(value => !value)} className={`hero-editor-switch ${editMode ? "is-edit" : ""}`} /><span>Edit</span><label className="hero-editor-model"><span className="sr-only">Select model</span><select aria-label="Select model" value={model} onChange={event => setModel(event.target.value)}>{availableModels.map(option => <option key={option} value={option}>{option}</option>)}</select></label></div><div className="hero-editor-input">{editMode ? "Describe changes to your document…" : "Ask anything about your draft…"} <SendHorizontal size={15} /></div><p className="hero-editor-demo-note">Interactive preview · Start writing to use AI</p></div>
          </div>
          <div className="hero-editor-doc">
            <div className="hero-editor-doc-header"><div><PanelLeftClose size={15} /><strong>The art of a clear idea</strong></div><div><span className="hero-editor-saved"><span className="hero-editor-status" /> Saved</span><Download size={15} /><Save size={15} /></div></div>
            <div className="hero-editor-tools" aria-hidden="true"><Undo2 size={14}/><Redo2 size={14}/><span className="hero-editor-tool-divider"/><span>H⌄</span><List size={15}/><span className="hero-editor-tool-divider"/><Bold size={14}/><Italic size={14}/><span>U</span><Link2 size={14}/><span className="hero-editor-tool-divider"/><span>≡</span><span>☰</span></div>
            <div className="hero-editor-page"><div className="hero-editor-doc-label">A NOTE ON WRITING</div><h3>The art of a<br />clear idea<span className="hero-editor-caret" /></h3><p>Every good piece of writing begins with a thought worth sharing. The challenge is giving that thought a shape someone else can see.</p><h4>Start with what matters</h4><p>A first draft doesn’t need to be perfect. It only needs to bring the important idea into focus. From there, you can find the details, the rhythm, and the words that make it yours.</p><p className="hero-editor-last-paragraph">Make room for curiosity. The clearest ideas often come from asking one more question.</p></div>
          </div>
        </div>
      </div>
      <figcaption className="hero-editor-scroll-hint">Scroll sideways to explore the preview</figcaption>
    </figure>
  );
}

const models = [
  { name: "ChatGPT", logo: "/model-logos/openai.svg", color: "#00b98a", messages: ["Here’s a clearer way to open your introduction.", "Start with the central idea, then show why it matters.", "I’ve made the opening more direct while keeping its warmth."] },
  { name: "Claude", logo: "/model-logos/claude.svg", color: "#f16b40", messages: ["I’ve tightened the structure and kept your voice.", "This version flows more naturally from one thought to the next.", "Let’s give the reader a concrete example before adding detail."] },
  { name: "Gemini", logo: "/model-logos/googlegemini.svg", color: "#427cff", messages: ["Try this angle to bring your main idea forward.", "A shorter first sentence makes the key point easier to follow.", "Here are two ways to make the transition feel smoother."] },
  { name: "OpenRouter", logo: "/model-logos/openrouter.svg", color: "#8b5cf6", messages: ["Here’s another way to frame your opening.", "Try a more concise lead to bring the main idea into focus.", "I’ve suggested a smoother transition into the next paragraph."] },
];
const paths = ["M190 75 C390 75 390 195 690 195", "M190 165 C390 165 390 230 690 230", "M190 255 C390 255 390 265 690 265", "M190 345 C390 345 390 300 690 300"];

function ModelDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState([{ id: -3, model: 0, text: models[0].messages[0] }, { id: -2, model: 1, text: models[1].messages[0] }, { id: -1, model: 2, text: models[2].messages[0] }]);
  const motionRef = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px)");
    let visible = false;
    const update = () => setRunning(visible && !media.matches);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.2 });
    if (ref.current) observer.observe(ref.current);
    media.addEventListener("change", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, []);
  useEffect(() => {
    const motion = motionRef.current;
    if (!running || !motion) return;
    let next: number | undefined;
    const onArrival = () => {
      const model = step % models.length;
      const text = models[model].messages[(Math.floor(step / models.length) + 1) % models[model].messages.length];
      setMessages(previous => [...previous.slice(-5), { id: step, model, text }]);
      next = window.setTimeout(() => setStep(value => value + 1), 900);
    };
    motion.addEventListener("endEvent", onArrival);
    motion.beginElement();
    return () => { motion.removeEventListener("endEvent", onArrival); window.clearTimeout(next); };
  }, [running, step]);
  const current = step % models.length;
  return <div ref={ref} className={`model-demo ${running ? "is-running" : ""} mx-auto mt-14 max-w-[1256px] rounded-[28px] bg-[#f3f3f3] p-6 text-left sm:p-10`}>
    <svg className="model-demo-lines" viewBox="0 0 1000 420" preserveAspectRatio="none" aria-hidden="true">{paths.map((path, i) => <path key={path} d={path} fill="none" stroke={models[i].color} strokeOpacity=".7" strokeDasharray="2 8" strokeWidth="1.5" />)}{running && <circle key={step} r="7" fill={models[current].color} className="model-demo-pulse"><animateMotion ref={motionRef} begin="indefinite" dur="2s" path={paths[current]} fill="remove" /></circle>}</svg>
    <div className="model-demo-providers">{models.map((model, i) => <div key={model.name} className={`model-demo-provider ${running && current === i ? "is-active" : ""}`} style={{ "--model-color": model.color } as React.CSSProperties}><span className="model-demo-icon"><img src={model.logo} alt="" /></span><span><strong>{model.name}</strong><small>{model.name === "OpenRouter" ? "AI gateway" : "AI model"}</small></span></div>)}</div>
    <div className="model-demo-sidebar"><div className="flex items-center gap-2 border-b border-black/5 px-4 py-4 text-sm font-semibold"><img src="./icon.png" alt="" className="h-7 w-7 rounded-lg" /> Dr.Writer <span className="ml-auto text-xs font-normal text-neutral-400">AI assistant</span></div><div className="model-demo-messages" aria-live="off"><div className="model-demo-prompt">Help me make this introduction clearer.</div><div className="model-demo-message-list">{messages.map(message => { const model = models[message.model]; return <div key={message.id} className={`model-demo-message-wrap ${message.id >= 0 ? "is-new" : ""}`}><div className="model-demo-message"><span className="model-demo-avatar"><img src={model.logo} alt="" /></span><div className="model-demo-message-content"><strong>{model.name}</strong><p>{message.text}</p></div></div></div>; })}</div></div><div className="m-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-400">Ask about your draft… <span className="float-right text-neutral-700">↑</span></div></div>
  </div>;
}

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

const Landing = () => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState(workspaceModes[0].id);
  const [assistantLayout, setAssistantLayout] = useState<"side" | "dock">("side");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const whyRef = useRef<HTMLElement | null>(null);
  const useCasesRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);

  const activeWorkspace = workspaceModes.find((mode) => mode.id === activeMode) ?? workspaceModes[0];

  const scrollTo = (ref: React.RefObject<HTMLElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-950 [font-family:'Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]">
      <header className="relative z-50 bg-white px-4 pt-3 sm:px-8">
        <div className="mx-auto flex max-w-[1256px] items-center justify-between gap-6 rounded-full bg-[#f2f2f2] px-3 py-2 sm:px-5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <img src="./icon.png" alt="" className="h-8 w-8 rounded-lg" /><span>Dr.Writer</span>
          </button>
          <nav className="hidden items-center gap-8 text-sm text-slate-700 md:flex">
            <button onClick={() => scrollTo(whyRef as React.RefObject<HTMLElement>)}>Why choose us</button>
            <button onClick={() => scrollTo(useCasesRef as React.RefObject<HTMLElement>)}>Workspace flow</button>
            <a href="#pricing">Pricing</a>
            <button onClick={() => scrollTo(faqRef as React.RefObject<HTMLElement>)}>FAQs</button>
          </nav>
          <Button onClick={() => navigate("/login")} className="rounded-full bg-[#111] px-5 text-white hover:bg-slate-800">Start writing <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      </header>
      <main>
        {/* Hero */}
        <section className="bg-white px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-24 lg:pt-28">
          <h1 className="mx-auto max-w-5xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#101010] sm:text-7xl lg:text-[88px]">
            Your space to<br /><span className="hero-words" aria-label="write, refine, and create"><span aria-hidden="true">write</span><span aria-hidden="true">refine</span><span aria-hidden="true">create</span></span><br /><span className="bg-gradient-to-b from-[#111] to-[#999] bg-clip-text text-transparent">with AI by your side.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-neutral-500 sm:text-lg">Write, edit, and collaborate in one place. Dr.Writer brings your documents and AI assistance together, so you can stay focused on the words.</p>
          <Button onClick={() => navigate("/login")} className="mt-8 h-12 rounded-full bg-[#111] px-7 text-white hover:bg-slate-800">Start writing <ArrowRight className="ml-2 h-4 w-4" /></Button>
          <p className="mt-4 text-sm text-neutral-500">Your ideas, all in one workspace.</p>
          <HeroEditor />
        </section>

        {/* Feature grid */}
        <section ref={whyRef} className="mx-auto max-w-[1320px] px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm text-neutral-500">Features</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">A workspace for words.<br /><span className="text-neutral-400">And everything around them.</span></h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-neutral-500">From the first idea to the final edit, keep your writing and AI assistant together.</p>
          </div>
          <div className="grid auto-rows-auto gap-3 md:grid-cols-4 md:auto-rows-[250px]">
            <article className="flex min-h-[400px] flex-col overflow-hidden rounded-[28px] bg-[#f3f3f3] p-7 sm:p-8 md:col-span-2 md:row-span-2">
              <div><h3 className="text-xl font-semibold tracking-tight">Your draft and AI,<br />side by side.</h3><p className="mt-3 max-w-xs text-sm leading-6 text-neutral-500">Ask questions, shape ideas, and keep the document in view as you work.</p></div>
              <div aria-hidden="true" className="mt-auto grid h-48 grid-cols-2 gap-2 overflow-hidden rounded-t-2xl border border-black/5 bg-white p-3 shadow-sm sm:h-56">
                <div className="rounded-lg bg-neutral-50 p-3"><div className="text-[10px] font-semibold">Dr.Writer <span className="font-normal text-neutral-400">AI assistant</span></div><div className="mt-5 ml-3 rounded-lg bg-neutral-200/70 p-2 text-[10px] leading-4 text-neutral-600">Can you make this opening clearer?</div><div className="mt-3 mr-2 rounded-lg bg-emerald-50 p-2 text-[10px] leading-4 text-emerald-800">Here’s a more direct way to begin.</div></div>
                <div className="p-3"><div className="flex gap-1.5 text-[9px] text-neutral-400"><span>B</span><span>I</span><span>≡</span><span>↗</span></div><div className="mt-5 text-xs font-semibold">A clearer first draft</div><div className="mt-4 space-y-2"><div className="h-1.5 w-full rounded-full bg-neutral-200"/><div className="h-1.5 w-11/12 rounded-full bg-neutral-200"/><div className="h-1.5 w-4/5 rounded-full bg-neutral-200"/><div className="h-1.5 w-full rounded-full bg-neutral-200"/><div className="h-1.5 w-2/3 rounded-full bg-neutral-200"/></div></div>
              </div>
              <div className="mt-6"><p className="text-4xl font-semibold tracking-tight">One space.</p><p className="mt-2 text-sm text-neutral-500">Writing and assistance, together.</p></div>
            </article>
            <article className="flex min-h-[240px] flex-col justify-between rounded-[28px] bg-[#f3f3f3] p-7 sm:p-8 md:col-span-2"><div><h3 className="text-xl font-semibold tracking-tight">From idea to edit.</h3><p className="mt-2 text-sm leading-6 text-neutral-500">Ask AI to help draft, refine, or restructure your work.</p></div><div aria-hidden="true" className="mt-8 flex flex-wrap gap-2"><span className="rounded-xl bg-white px-4 py-3 text-sm">✦ &nbsp;Draft</span><span className="rounded-xl bg-white px-4 py-3 text-sm">↗ &nbsp;Refine</span><span className="rounded-xl bg-white px-4 py-3 text-sm">≡ &nbsp;Restructure</span></div></article>
            <article className="flex min-h-[220px] flex-col justify-between rounded-[28px] bg-[#f3f3f3] p-7 sm:p-8"><div aria-hidden="true" className="collaborator-avatars">{[0, 25, 50, 75, 100].map(position => <span key={position} className="collaborator-avatar" style={{ backgroundPosition: `${position}% 25%` }} />)}</div><div><h3 className="text-xl font-semibold tracking-tight">Write together.</h3><p className="mt-2 text-sm leading-6 text-neutral-500">Collaborate on the same document in real time.</p></div></article>
            <article className="flex min-h-[220px] flex-col justify-between rounded-[28px] bg-[#111] p-7 text-white sm:p-8"><div aria-hidden="true" className="text-5xl font-semibold tracking-tight">AI<span className="text-emerald-400">✦</span></div><div><h3 className="text-xl font-semibold tracking-tight">Your writing partner.</h3><p className="mt-2 text-sm leading-6 text-neutral-400">Think through ideas without leaving your draft.</p></div></article>
            <article className="flex min-h-[240px] flex-col justify-between rounded-[28px] bg-[#f3f3f3] p-7 sm:p-8 md:col-span-2"><div><h3 className="text-xl font-semibold tracking-tight">Make the words your own.</h3><p className="mt-2 text-sm leading-6 text-neutral-500">Format, organize, and polish your document in one editor.</p></div><div aria-hidden="true" className="mt-8 flex w-fit gap-1 rounded-xl bg-white p-2 text-sm text-neutral-700 shadow-sm"><span className="rounded-lg bg-neutral-100 px-3 py-2 font-bold">B</span><span className="px-3 py-2 italic">I</span><span className="px-3 py-2 underline">U</span><span className="px-3 py-2">☷</span><span className="px-3 py-2">↗</span></div></article>
            <article className="flex min-h-[220px] flex-col justify-between rounded-[28px] bg-[#f3f3f3] p-7 sm:p-8"><div aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-white"><MessageSquareMore className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold tracking-tight">Ask in context.</h3><p className="mt-2 text-sm leading-6 text-neutral-500">Bring selected text into the conversation.</p></div></article>
            <article className="flex min-h-[220px] flex-col justify-between rounded-[28px] bg-[#f3f3f3] p-7 sm:p-8"><div aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-white"><FileText className="h-5 w-5" /></div><div><h3 className="text-xl font-semibold tracking-tight">Take it with you.</h3><p className="mt-2 text-sm leading-6 text-neutral-500">Export your document when it’s ready to share.</p></div></article>
          </div>
        </section>

        {/* Assistant layouts */}
        <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-32">
          <div>
            <p className="text-sm text-neutral-500">Two ways to work</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">Your assistant,<br /><span className="text-neutral-400">your space.</span></h2>
            <p className="mt-6 max-w-md text-base leading-7 text-neutral-500 sm:text-lg">Keep the conversation beside your draft, or tuck the assistant into a dock when you want more room to write.</p>
            <div className="mt-8 inline-flex rounded-full bg-[#f2f2f2] p-1" role="group" aria-label="Assistant layout">
              <button type="button" aria-pressed={assistantLayout === "side"} onClick={() => setAssistantLayout("side")} className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors ${assistantLayout === "side" ? "bg-[#111] text-white" : "text-neutral-700"}`}>Side chat</button>
              <button type="button" aria-pressed={assistantLayout === "dock"} onClick={() => setAssistantLayout("dock")} className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors ${assistantLayout === "dock" ? "bg-[#111] text-white" : "text-neutral-700"}`}>Dock mode</button>
            </div>
            <p className="mt-6 min-h-12 max-w-md text-sm leading-6 text-neutral-500" aria-live="polite">{assistantLayout === "side" ? "Chat and write side by side. Resize the panels to fit your workflow." : "A compact prompt stays within reach while your document takes centre stage."}</p>
          </div>
          <div className="layout-demo-stage" aria-label={assistantLayout === "side" ? "Illustration of side chat beside the document" : "Illustration of docked assistant over the document"} role="img">
            <div className={`layout-demo-window ${assistantLayout === "dock" ? "is-dock" : "is-side"}`}>
              <div className="layout-demo-chat"><div className="layout-demo-chat-title"><span className="layout-demo-logo">✦</span> Dr.Writer <span className="layout-demo-muted">AI assistant</span></div><div className="layout-demo-chat-body"><div className="layout-demo-user">Help me make this clearer.</div><div className="layout-demo-response">Try leading with the main idea, then add the details that support it.</div></div><div className="layout-demo-chat-input">Ask about your draft… <span>↑</span></div></div>
              <div className="layout-demo-document"><div className="layout-demo-toolbar"><strong>Untitled document</strong><span>Saved &nbsp; ···</span></div><div className="layout-demo-format">↶ &nbsp; ↷ &nbsp; │ &nbsp; H⌄ &nbsp; ☷ &nbsp; <b>B</b> &nbsp; <i>I</i> &nbsp; ↗</div><div className="layout-demo-page"><div className="layout-demo-kicker">THE FIRST DRAFT</div><h3>Good ideas start<br />with a few words.</h3><p>Every great piece begins somewhere. Give your ideas the space to grow, one sentence at a time.</p><p>Write freely, find the right shape, and make it yours.</p><div className="layout-demo-cursor" /></div></div>
              <div className="layout-demo-dock"><div><span className="layout-demo-logo">✦</span> <strong>Dr.Writer</strong><span className="layout-demo-muted"> &nbsp; AI assistant</span></div><div className="layout-demo-dock-input">Describe changes to your document… <span>↑</span></div></div>
            </div>
          </div>
        </section>

        {/* Audience ticker */}
        <section className="overflow-hidden py-10">
          <div className="mx-auto flex max-w-[1320px] flex-col items-center px-5 text-center sm:px-8">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
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
        <section ref={useCasesRef} className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              We built the hard part so your writing flow feels easy
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Whether you are drafting alone or reviewing with a team, every essential step stays
              inside one workspace.
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-2 rounded-full bg-[#f3f3f3] p-1 w-fit mx-auto">
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

        {/* AI models */}
        <section className="bg-white px-5 py-24 text-center sm:px-8 sm:py-32">
          <p className="text-sm text-neutral-500">Your AI workspace</p>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">More models. <span className="text-neutral-400">One sidebar.</span></h2>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-neutral-500 sm:text-lg">Bring AI into the conversation and keep your writing in view.</p>
          <ModelDemo />
        </section>

        {/* Plans */}
        <section id="pricing" className="bg-white px-5 py-24 sm:px-8 sm:py-32">
          <div className="text-center"><p className="text-sm text-neutral-500">Pricing</p><h2 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">Start free.<br /><span className="text-neutral-400">Grow at your pace.</span></h2><p className="mx-auto mt-6 max-w-lg text-base leading-7 text-neutral-500 sm:text-lg">Choose the workspace that fits the way you write.</p></div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-3 md:grid-cols-3">
            {[
              { name: "Free", description: "For getting started.", price: "$0", detail: "Free to get started", action: "Start writing", features: ["Document editor and formatting", "AI-assisted writing", "Real-time collaboration", "Document export"] },
              { name: "Pro", description: "For your everyday writing.", price: "$20", detail: "More room to create", action: "Get started", features: ["Everything in Free", "More AI usage", "More model choices", "AI-powered document edits", "Web research assistance"] },
              { name: "Studio", description: "For your most ambitious work.", price: "$50", detail: "For deeper, ongoing work", action: "Get started", features: ["Everything in Pro", "Higher AI usage", "Extended model access", "Advanced research workflows", "More room for collaboration"] },
            ].map((plan) => (
              <article key={plan.name} className="flex flex-col rounded-[28px] bg-[#f3f3f3] p-7 sm:p-8">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>
                <p className="mt-6 text-5xl font-semibold tracking-tight">{plan.price}{plan.price !== "$0" && <span className="text-sm font-normal tracking-normal text-neutral-500"> a month</span>}</p>
                <p className="mt-2 text-sm text-neutral-500">{plan.detail}</p>
                <Button onClick={() => navigate("/login")} className="mt-6 h-12 rounded-full bg-[#111] text-white hover:bg-neutral-800">{plan.action}</Button>
                <ul className="mt-7 space-y-3 text-sm leading-5 text-neutral-700">{plan.features.map(feature => <li key={feature} className="flex gap-2"><span aria-hidden="true">✓</span><span>{feature}</span></li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ + CTA card */}
        <section
          ref={faqRef}
          className="mx-auto grid max-w-[1320px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.95fr_0.85fr]"
        >
          <div>
            <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
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

          {/* Workspace CTA */}
          <div className="rounded-[2rem] border border-black/10 bg-[#f3f3f3] p-[1px] shadow-[0_25px_70px_rgba(15,23,42,0.1)]">
            <div className="rounded-[2rem] bg-white p-8">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500">Everything your workspace needs</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                  Move from first draft to shared final version
                </h3>
              </div>

              <div className="mt-8 space-y-3">
                <div className="rounded-2xl border border-black/8 bg-[#f7f7f7] p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-slate-800" />
                    <span className="text-sm font-medium">Document creation and uploads</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-black/8 bg-[#f7f7f7] p-4">
                  <div className="flex items-center gap-3">
                    <MessageSquareMore className="h-5 w-5 text-slate-800" />
                    <span className="text-sm font-medium">Collaboration, sharing, and live updates</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-black/8 bg-[#f7f7f7] p-4">
                  <div className="flex items-center gap-3">
                    <Lock className="h-5 w-5 text-slate-800" />
                    <span className="text-sm font-medium">Cloud access with a focused, secure workflow</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate("/login")}
                className="mt-6 h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                Continue to workspace
              </Button>
            </div>
          </div>
        </section>

        {/* Bottom CTA banner */}
        <section className="mx-auto max-w-[1320px] px-5 pb-24 pt-8 text-center sm:px-8">
          <div className="rounded-[2.5rem] border border-black/8 bg-white/90 px-6 py-14 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:px-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-[#f3f3f3]">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
              Ready to make document work feel lighter?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Open Dr.Writer to start editing, collaborate in real time, and keep every draft in one
              focused workspace.
            </p>
            <Button onClick={() => navigate("/login")} className="mt-8 h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800">
              Get started
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/6 bg-white/80">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto_auto]">
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