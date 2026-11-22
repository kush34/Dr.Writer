import apiClient from "@/service/axiosConfig";
import { auth } from "@/firebaseAuth/firebaseConfig";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "@/components/ui/rare-toast";
import { Button } from "@/components/ui/button";
import Layout from "@/pages/Layout";
import { useSidebarSide, setSidebarSide } from "@/config/sidebar-side";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/ThemeToggleBtn";
import { getDefaultModel, setDefaultModel } from "@/config/models";
import { ModelSelector } from "@/components/ModelSelector";
import { McpSettings } from "@/components/McpSettings";
import { setAutosave, useAutosave } from "@/config/autosave";

export default function Settings() {
  const side = useSidebarSide();
  const autosave = useAutosave();
  const [searchParams, setSearchParams] = useSearchParams();
  const [model, setModel] = useState(getDefaultModel);
  const [assistantLayout, setAssistantLayout] = useState(() => localStorage.getItem("drwriter.assistantLayout") === "dock" ? "dock" : "sidebar");
  const [mcpOpen, setMcpOpen] = useState(false);
  const [openRouterConnected, setOpenRouterConnected] = useState(false);
  const [openRouterBusy, setOpenRouterBusy] = useState(true);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const pending = sessionStorage.getItem("drwriter.openrouter.pending");
    if (code) {
      params.delete("code"); params.delete("state");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
      sessionStorage.removeItem("drwriter.openrouter.pending");
      void (async () => {
        try {
          await auth.authStateReady();
          const saved = pending ? JSON.parse(pending) : null;
          if (!saved || saved.state !== state || saved.uid !== auth.currentUser?.uid || Date.now() - saved.created > 600000) throw new Error("Connection expired or account changed. Please try again.");
          await apiClient.post("/openrouter", { code, verifier: saved.verifier });
          setOpenRouterConnected(true); toast.success("OpenRouter connected");
        } catch (error) { toast.error(error instanceof Error ? error.message : "Could not connect OpenRouter"); }
        finally { setOpenRouterBusy(false); }
      })();
    } else {
      apiClient.get<{ connected: boolean }>("/openrouter").then(({ data }) => setOpenRouterConnected(data.connected)).catch(() => toast.error("Could not check OpenRouter connection")).finally(() => setOpenRouterBusy(false));
    }
  }, []);
  const connectOpenRouter = async () => {
    try {
      await auth.authStateReady();
      if (!auth.currentUser) throw new Error("Please sign in first.");
      const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
      const state = encode(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = encode(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
      sessionStorage.setItem("drwriter.openrouter.pending", JSON.stringify({ verifier, state, uid: auth.currentUser.uid, created: Date.now() }));
      const url = new URL("https://openrouter.ai/auth");
      url.search = new URLSearchParams({ callback_url: `${window.location.origin}${window.location.pathname}`, code_challenge: challenge, code_challenge_method: "S256", state, key_label: "Dr.Writer" }).toString();
      window.location.assign(url.toString());
    } catch { toast.error("Could not start OpenRouter connection. Use HTTPS or localhost and try again."); }
  };
  const disconnectOpenRouter = async () => {
    setOpenRouterBusy(true);
    try { await apiClient.delete("/openrouter"); setOpenRouterConnected(false); toast.success("OpenRouter disconnected"); }
    catch { toast.error("Could not disconnect OpenRouter"); }
    finally { setOpenRouterBusy(false); }
  };
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "mcp") setMcpOpen(true);
    if (section === "model") document.querySelector<HTMLButtonElement>("#default-model button")?.focus();
    if (section) setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("section"); return next; }, { replace: true });
  }, [searchParams, setSearchParams]);

  return <Layout>
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 pb-12 pt-6 sm:px-8">
        <header><h1 className="text-2xl font-semibold">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Choose your preferences and manage integrations.</p></header>
        <section className="space-y-2">
          <Label>Default model</Label>
          <p className="text-sm text-muted-foreground">Used when you open a new chat. Change the current model in the AI box.</p>
          <ModelSelector id="default-model" value={model} onChange={(value) => { setModel(value); setDefaultModel(value); toast.success("Default model updated"); }} />
        </section>
        <section className="space-y-2 border-t pt-4">
          <Label htmlFor="document-autosave">Document autosave</Label>
          <p className="text-sm text-muted-foreground">Automatically save document changes after you stop editing. This preference is stored in this browser.</p>
          <select id="document-autosave" value={autosave ? "on" : "off"} onChange={(event) => setAutosave(event.target.value === "on")} className="w-full rounded-md border border-input bg-background p-2 text-sm"><option value="off">Off</option><option value="on">On</option></select>
        </section>
        <section className="space-y-2 border-t pt-4">
          <Label htmlFor="assistant-layout">Default assistant layout</Label>
          <p className="text-sm text-muted-foreground">Choose how the assistant opens in the editor on this browser.</p>
          <select id="assistant-layout" value={assistantLayout} onChange={(event) => { setAssistantLayout(event.target.value); localStorage.setItem("drwriter.assistantLayout", event.target.value); }} className="w-full rounded-md border border-input bg-background p-2 text-sm"><option value="sidebar">Side panel</option><option value="dock">Bottom dock</option></select>
        </section>
        <section className="space-y-2 border-t pt-4">
          <Label htmlFor="sidebar-side">Sidebar position</Label>
          <p className="text-sm text-muted-foreground">Choose which side shows navigation and the editor chat.</p>
          <select id="sidebar-side" value={side} onChange={(event) => { setSidebarSide(event.target.value as "left" | "right"); toast.success("Sidebar position updated"); }} className="w-full rounded-md border border-input bg-background p-2 text-sm"><option value="left">Left</option><option value="right">Right</option></select>
        </section>
        <section className="flex items-center justify-between gap-4 border-t pt-4">
          <div><h3 className="text-sm font-semibold">Appearance</h3><p className="text-sm text-muted-foreground">Choose a light, dark, or system theme.</p></div>
          <ModeToggle />
        </section>
        <section className="flex items-center justify-between gap-4 border-t pt-4">
          <div><h3 className="flex items-center gap-2 text-sm font-semibold"><img src="/model-logos/openrouter.svg" alt="" className="h-5 w-5" />OpenRouter</h3><p className="text-sm text-muted-foreground">{openRouterConnected ? "Connected. AI requests use your OpenRouter credits." : "Connect your account to pay for AI requests with your OpenRouter credits."}</p>{openRouterConnected && <p className="text-xs text-muted-foreground">Disconnecting removes the key from Dr.Writer. Revoke it in OpenRouter to disable it there.</p>}</div>
          <Button variant="outline" disabled={openRouterBusy} onClick={openRouterConnected ? disconnectOpenRouter : connectOpenRouter}>{openRouterBusy ? "Loading…" : openRouterConnected ? "Disconnect" : "Connect"}</Button>
        </section>
        <section className="flex items-center justify-between gap-4 border-t pt-4">
          <div><h3 className="text-sm font-semibold">MCP servers</h3><p className="text-sm text-muted-foreground">Manage tools available to the assistant.</p></div>
          <Button variant="outline" onClick={() => setMcpOpen(true)}>Manage</Button>
        </section>
      </div>
    <McpSettings open={mcpOpen} onOpenChange={setMcpOpen} />
  </Layout>;
}
