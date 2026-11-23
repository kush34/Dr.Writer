import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bold, Italic, List, Link2, Undo2, Redo2, Download, Save, PanelLeftClose, SendHorizontal,
  ChevronDown,
  FileText,
  MessageSquareMore,
  Sparkles,
  Presentation, Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./landing-models.css";
import { availableModels } from "@/config/models";

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
      "Yes. You can ask the AI assistant to help refine and edit your writing alongside your document.",
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
  const [activeSlide, setActiveSlide] = useState(0);
  const [presentationPrompt, setPresentationPrompt] = useState("");
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [assistantLayout, setAssistantLayout] = useState<"side" | "dock">("side");
  const [navHidden, setNavHidden] = useState(false);

  useEffect(() => {
    let previous = Math.max(0, window.scrollY);
    const onScroll = () => {
      const current = Math.max(0, window.scrollY);
      if (current < 64) {
        setNavHidden(false);
        previous = current;
      } else if (Math.abs(current - previous) >= 8) {
        setNavHidden(current > previous);
        previous = current;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  return (
    <div className="min-h-screen bg-white text-slate-950 [font-family:'Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]">
      <header className={`landing-nav sticky top-0 z-50 bg-white px-4 pt-3 sm:px-8 ${navHidden ? "landing-nav-hidden" : ""}`}>
        <div className="mx-auto flex max-w-[1256px] items-center justify-between gap-6 rounded-full bg-[#f2f2f2] px-3 py-2 sm:px-5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2 text-sm font-bold tracking-tight">
            <img src="./icon.png" alt="" className="h-8 w-8 rounded-lg" /><span>Dr.Writer</span>
          </button>
          <nav className="hidden items-center gap-8 text-sm text-slate-700 md:flex">
            <a href="#features">Why choose us</a>
            <a href="#presentations">Presentations</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQs</a>
          </nav>
          <Button asChild className="rounded-full bg-[#111] px-5 text-white hover:bg-slate-800"><a href="/login">Start writing <ArrowRight className="ml-1 h-4 w-4" /></a></Button>
        </div>
      </header>
      <main>
        {/* Hero */}
        <section className="bg-white px-5 pb-16 pt-20 text-center sm:px-8 sm:pt-24 lg:pt-28">
          <h1 className="mx-auto max-w-5xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-[#101010] sm:text-7xl lg:text-[88px]">
            Your space to<br /><span className="hero-words" aria-label="write, refine, and create"><span aria-hidden="true">write</span><span aria-hidden="true">refine</span><span aria-hidden="true">create</span></span><br /><span className="bg-gradient-to-b from-[#111] to-[#999] bg-clip-text text-transparent">with AI by your side.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-neutral-500 sm:text-lg">Write, edit, and collaborate in one place. Dr.Writer brings your documents and AI assistance together, so you can stay focused on the words.</p>
          <Button asChild className="mt-8 h-12 rounded-full bg-[#111] px-7 text-white hover:bg-slate-800"><a href="/login">Start writing <ArrowRight className="ml-2 h-4 w-4" /></a></Button>
          <p className="mt-4 text-sm text-neutral-500">Your ideas, all in one workspace.</p>
          <HeroEditor />
        </section>

        {/* Feature grid */}
        <section id="features" className="mx-auto max-w-[1320px] px-5 pb-20 pt-20 sm:px-8 sm:pt-28">
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

        <section id="presentations" className="mx-auto max-w-[1320px] px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">Your ideas deserve a bigger stage.</h2>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Create and refine presentations alongside the rest of your work, with AI ready to help.</p>
          </div>
          <div className="mx-auto mt-20 max-w-[1256px] overflow-hidden rounded-[28px] border border-black/10 bg-[#f7f7f5] shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
            <div className="flex items-center gap-2 border-b border-black/5 bg-white px-5 py-4 text-sm text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-[#ff7770]"/><span className="h-2.5 w-2.5 rounded-full bg-[#f4c15d]"/><span className="h-2.5 w-2.5 rounded-full bg-[#75c98b]"/><span className="mx-auto pr-10 font-medium text-slate-700">The next chapter.pptx</span></div>
            <div className="grid min-h-[660px] grid-cols-[68px_1fr] sm:grid-cols-[150px_1fr] lg:grid-cols-[150px_1fr_320px]">
              <div className="space-y-4 border-r border-black/5 p-3 sm:p-5">
                {["The next chapter", "A clearer direction", "What comes next"].map((title, i) => <button type="button" key={title} onClick={() => setActiveSlide(i)} aria-label={`Show slide ${i + 1}: ${title}`} aria-pressed={activeSlide === i} className={`block aspect-[4/3] w-full rounded-md border bg-white p-2 text-left text-[7px] font-semibold text-slate-700 sm:text-[9px] ${i === activeSlide ? "ring-2 ring-slate-900" : "opacity-60 hover:opacity-100"}`}><span className="mb-2 block text-[7px] text-slate-400">0{i + 1}</span>{title}</button>)}
              </div>
              <div className="flex items-center justify-center p-4 sm:p-10"><div className="flex aspect-[16/9] w-full max-w-2xl flex-col justify-between bg-[#f0ede5] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.12)] sm:p-10"><span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-500 sm:text-xs">A new perspective</span><div><div className="h-1 w-10 bg-[#df795f] sm:w-16"/><p className="mt-3 max-w-md text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">{["The next chapter starts with an idea.", "A clearer direction for what comes next.", "Let’s make the next move count."][activeSlide]}</p></div><span className="text-[8px] text-slate-500 sm:text-xs">A presentation made in Dr.Writer</span></div></div>
              <div className="col-span-2 flex min-h-[400px] flex-col border-t border-black/5 bg-white p-5 lg:col-span-1 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2 border-b border-black/5 pb-4 text-sm font-semibold"><Sparkles size={16}/> Dr.Writer <span className="ml-auto text-xs font-normal text-slate-500">AI assistant</span></div>
                <div className="flex-1 space-y-4 py-6 text-sm leading-6 text-slate-600"><p className="text-xs font-medium uppercase tracking-wider text-slate-400">Today</p><div className="rounded-2xl bg-slate-100 p-4 text-slate-700">Make the opening slide more concise and keep the tone optimistic.</div><div><p className="font-semibold text-slate-900">Let’s bring the idea forward.</p><p className="mt-2">I’ve suggested a shorter opening that keeps your message clear and positive.</p></div><div className="rounded-xl border border-black/10 p-4"><p className="text-xs font-semibold text-slate-500">SUGGESTED EDIT · SLIDE 1</p><p className="mt-2 font-medium text-slate-800">The next chapter starts with an idea.</p><p className="mt-2 text-xs text-slate-500">Review edits in the workspace before applying.</p></div>{previewPrompt && <><div className="rounded-2xl bg-slate-100 p-4 text-slate-700">{previewPrompt}</div><p className="text-xs text-slate-500">This is a preview. Open Dr.Writer to ask the assistant about your presentation.</p></>}</div>
                <form className="border-t border-black/5 pt-4" onSubmit={event => { event.preventDefault(); if (presentationPrompt.trim()) { setPreviewPrompt(presentationPrompt.trim()); setPresentationPrompt(""); } }}><div className="mb-3 flex items-center justify-between text-xs text-slate-500"><span>Discuss &nbsp; / &nbsp; Edit</span><span>AI assistant</span></div><div className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2"><input aria-label="Ask about your presentation" value={presentationPrompt} onChange={event => setPresentationPrompt(event.target.value)} placeholder="Ask about your slides…" className="min-w-0 flex-1 bg-transparent text-sm outline-none"/><button type="submit" aria-label="Send preview message" className="rounded-md p-2 text-slate-800 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2"><SendHorizontal size={16}/></button></div><p className="mt-2 text-xs text-slate-500">Interactive preview · Open your workspace to use AI</p></form>
              </div>
            </div>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[[Presentation, "Create your deck", "Start a new presentation in your workspace."], [Upload, "Bring your slides", "Upload an existing PowerPoint file to keep working."], [Sparkles, "Refine with AI", "Ask for slide edits and review suggestions before applying them."], [Download, "Take it with you", "Download your presentation as a PPTX file."]].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof Presentation;
              return <div key={title as string} className="border-t border-black/10 pt-6"><FeatureIcon className="h-6 w-6" strokeWidth={1.7}/><h3 className="mt-5 text-lg font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description as string}</p></div>;
            })}
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
                <Button asChild className="mt-6 h-12 rounded-full bg-[#111] text-white hover:bg-neutral-800"><a href="/login">{plan.action}</a></Button>
                <ul className="mt-7 space-y-3 text-sm leading-5 text-neutral-700">{plan.features.map(feature => <li key={feature} className="flex gap-2"><span aria-hidden="true">✓</span><span>{feature}</span></li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="mx-auto grid max-w-[1256px] gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"
        >
          <div>
            <h2 className="max-w-md text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Questions, answered.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-600">A little more about writing, editing, and working together in Dr.Writer.</p>
          </div>
            <div className="border-t border-black/10">
              {faqs.map((faq) => (
                <details key={faq.question} className="group w-full border-b border-black/10 py-6 text-left">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <p className="max-w-2xl pt-4 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
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
            <Button asChild className="mt-8 h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"><a href="/login">
              Get started
            </a></Button>
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
              <a href="#features" className="block transition hover:text-slate-900">
                Why Dr.Writer
              </a>
              <a href="#presentations" className="block transition hover:text-slate-900">
                Presentations
              </a>
              <a href="#faq" className="block transition hover:text-slate-900">
                FAQs
              </a>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            <p className="font-semibold text-slate-900">Access</p>
            <div className="mt-4 space-y-3">
              <a href="/login" className="block transition hover:text-slate-900">
                Login
              </a>
              <a href="/login" className="block transition hover:text-slate-900">
                Open workspace
              </a>
              <a href="/about/" className="block transition hover:text-slate-900">About &amp; contact</a>
              <a href="/privacy/" className="block transition hover:text-slate-900">Privacy</a>
              <a href="/terms/" className="block transition hover:text-slate-900">Terms</a>
              <p>© {new Date().getFullYear()} Dr.Writer</p>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="mx-auto overflow-hidden px-5 pt-6 text-center text-[clamp(3.5rem,13vw,12rem)] font-bold leading-[0.85] tracking-[-0.065em] text-transparent sm:px-8" style={{ backgroundImage: "linear-gradient(to bottom, #d9d9d9, transparent 90%)", backgroundClip: "text", WebkitBackgroundClip: "text" }}>Dr.Writer</div>
      </footer>
    </div>
  );
};

export default Landing;
