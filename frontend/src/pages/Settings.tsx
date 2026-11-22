import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Layout from "@/pages/Layout";
import { useSidebarSide, setSidebarSide } from "@/config/sidebar-side";
import { Label } from "@/components/ui/label";
import { ModeToggle } from "@/components/ThemeToggleBtn";
import { availableModels, getDefaultModel, setDefaultModel } from "@/config/models";
import { McpSettings } from "@/components/McpSettings";
import { setAutosave, useAutosave } from "@/config/autosave";

export default function Settings() {
  const side = useSidebarSide();
  const autosave = useAutosave();
  const [searchParams, setSearchParams] = useSearchParams();
  const [model, setModel] = useState(getDefaultModel);
  const [assistantLayout, setAssistantLayout] = useState(() => localStorage.getItem("drwriter.assistantLayout") === "dock" ? "dock" : "sidebar");
  const [mcpOpen, setMcpOpen] = useState(false);
  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "mcp") setMcpOpen(true);
    if (section === "model") document.getElementById("default-model")?.focus();
    if (section) setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("section"); return next; }, { replace: true });
  }, [searchParams, setSearchParams]);

  return <Layout>
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 pb-12 pt-6 sm:px-8">
        <header><h1 className="text-2xl font-semibold">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Choose your preferences and manage integrations.</p></header>
        <section className="space-y-2">
          <Label htmlFor="default-model">Default model</Label>
          <p className="text-sm text-muted-foreground">Used when you open a new chat. Change the current model with /model.</p>
          <select id="default-model" value={model} onChange={(event) => { setModel(event.target.value); setDefaultModel(event.target.value); toast.success("Default model updated"); }} className="w-full rounded-md border border-input bg-background p-2 text-sm">
            {availableModels.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
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
          <div><h3 className="text-sm font-semibold">MCP servers</h3><p className="text-sm text-muted-foreground">Manage tools available to the assistant.</p></div>
          <Button variant="outline" onClick={() => setMcpOpen(true)}>Manage</Button>
        </section>
      </div>
    <McpSettings open={mcpOpen} onOpenChange={setMcpOpen} />
  </Layout>;
}
