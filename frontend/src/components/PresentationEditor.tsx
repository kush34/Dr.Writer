import { useBlocker } from "react-router-dom";
import { setAutosave, useAutosave } from "@/config/autosave";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PptxEditor } from "@pptx-editor.dev/react";
import { createBrowserAutomationHost, type PptxEditorInstance } from "@pptx-editor.dev/core/editor";
import "@pptx-editor.dev/core/styles/editor.css";
import blank from "../assets/blank.pptx?url&inline";
import { useSharedEditor } from "@/context/EditorContext";
import { readOutline, applyPresentationEdits } from "@/service/presentation";
import apiClient from "@/service/axiosConfig";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { ArrowLeft, Download, SaveAll } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import "./PresentationEditor.css";

export default function PresentationEditor({ id, title, pptx, revision }: {
  id: string; title: string; pptx?: string; revision: number;
}) {
  const [bytes] = useState(() => Uint8Array.from(atob(pptx ?? blank.split(",")[1]), c => c.charCodeAt(0)));
  const [localTitle, setLocalTitle] = useState(title);
  const [savedTitle, setSavedTitle] = useState(title);
  const [editor, setEditor] = useState<PptxEditorInstance>();
  const [saving, setSaving] = useState(false);
  const [editRevision, setEditRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const attempted = useRef<number>();
  const inFlight = useRef(false);
  const autosave = useAutosave();
  const dirty = savedRevision !== editRevision || savedTitle !== localTitle;
  const blocker = useBlocker(dirty || saving);
  const version = useRef(revision);
  const query = useQueryClient();
  const { presentation, docMode } = useSharedEditor();
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (!editor || !presentation) return;
    const host = createBrowserAutomationHost(editor);
    const unsubscribe = host.subscribe(() => setEditRevision(editor.session?.store.revision ?? 0));
    let active = true;
    presentation.current = async (command, modelName) => {
      if (!editor.session) throw new Error("Wait for the presentation to open.");
      const revision = host.revision();
      const { data } = await apiClient.post(`/document/actions/${id}`, { command, modelName, outline: readOutline(host) });
      if (!active) throw new Error("The presentation was closed.");
      applyPresentationEdits(host, revision, data.operations);
    };
    return () => { active = false; presentation.current = null; unsubscribe(); host.dispose(); };
  }, [editor, id, presentation]);

  const save = useCallback(async (download: boolean) => {
    if (!download && inFlight.current) return;
    const snapshot = editor?.session?.store.revision ?? 0;
    const rawTitle = localTitle;
    const titleSnapshot = rawTitle.trim() || "Untitled presentation";
    if (!download) attempted.current = snapshot;
    const result = editor?.save();
    if (!result) { toast.error("Unable to export the presentation."); return; }
    if (download) {
      const url = URL.createObjectURL(new Blob([result], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = titleSnapshot + ".pptx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      if (result.length > 6 * 1024 * 1024) throw new Error("Presentation exceeds the 6 MiB save limit. Download a copy.");
      let binary = "";
      for (let i = 0; i < result.length; i += 32768) binary += String.fromCharCode(...result.subarray(i, i + 32768));
      const pptx = btoa(binary);
      const { data } = await apiClient.post(`/document/${id}/presentation`, { pptx, revision: version.current, title: titleSnapshot });
      version.current = data.revision;
      setSavedRevision(snapshot);
      setSavedTitle(titleSnapshot);
      setLocalTitle(current => current === rawTitle ? titleSnapshot : current);
      query.setQueryData(["document", id], (old: object | undefined) => old && ({ ...old, title: titleSnapshot, pptx, revision: data.revision }));
      query.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Presentation saved");
    } catch (err) {
      toast.error(isAxiosError(err) ? err.response?.data?.message || "Save failed. Download a copy before leaving." : String(err));
    } finally { inFlight.current = false; setSaving(false); }
  }, [editor, id, localTitle, query]);

  useEffect(() => {
    if (!autosave || !dirty || saving || attempted.current === editRevision) return;
    const timer = window.setTimeout(() => void save(false), 1000);
    return () => clearTimeout(timer);
  }, [autosave, dirty, saving, editRevision, save]);

  useEffect(() => {
    if (!dirty && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);
  return <section className="presentation-editor flex h-full w-full min-w-0 flex-col">
    {blocker.state === "blocked" && <div role="alert" className="flex items-center gap-3 border p-2">
      Leave with unsaved changes?
      <button onClick={() => blocker.reset()}>Stay</button>
      <button disabled={saving} onClick={() => blocker.proceed()}>Discard and leave</button>
    </div>}
    <header className="flex items-center gap-3 pb-2">
      <button type="button" aria-label="Back to documents" title="Back to documents" onClick={() => navigate("/home")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <ArrowLeft size={18} />
      </button>
      <input aria-label="Presentation title" maxLength={255} value={localTitle} onChange={event => setLocalTitle(event.target.value)} className="mr-auto min-w-0 flex-1 rounded bg-transparent px-2 text-lg font-bold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" />
      <label><input type="checkbox" checked={autosave} onChange={event => { attempted.current = undefined; setAutosave(event.target.checked); }} /> Autosave</label>
      <Button aria-label="Save presentation" title={saving ? "Saving…" : "Save presentation"} disabled={!editor || saving} onClick={() => save(false)}>
        <SaveAll />
      </Button>
      <Button aria-label="Download presentation" title="Download presentation" disabled={!editor} onClick={() => save(true)}>
        <Download />
      </Button></header>
    <PptxEditor className={`min-h-0 flex-1 ${docMode ? "pb-24" : ""}`} document={bytes} mode="edit" colorMode={theme} notesPane={{ defaultOpen: false, className: "presentation-notes" }} onReady={setEditor} />
  </section>;
}
