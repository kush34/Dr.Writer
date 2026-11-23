import { requestEdit } from "@/service/editAction";
import { summarizeEdits } from "@/service/editPreview";
import { notifyUser, requestNotificationPermission } from "@/service/notify";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { WebSearch } from "@/components/ui/web-search";
import { StreamingResponse } from "@/components/ui/streaming-response";
import { AiStatus } from "@/components/ui/ai-status";
import { PromptBox } from "@/components/ui/prompt-box";
import { ArrowDown, Bot, Check, Copy, MessageSquare, PanelBottom, SendHorizontal } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatsForDocument } from "@/service/document";
import { useSharedEditor } from "@/context/EditorContext";
import apiClient from "@/service/axiosConfig";
import { isAxiosError } from "axios";
import { getAuth } from "firebase/auth";
import { toast } from "@/components/ui/rare-toast";
import { getDefaultModel, weakModelReason } from "@/config/models";
import { ModelSelector } from "@/components/ModelSelector";
import { ChatMessagesSkeleton } from "@/components/PageSkeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


type ToolActivity = { server: string; tool: string; displayName?: string; icon?: string; phase?: "start" | "done" | "error" };

function ToolActivityLabel({ activity }: { activity: ToolActivity }) {
  if (activity.server === "drwriter_exa" && /search/i.test(activity.tool)) return <WebSearch sources={[]} status={activity.phase === "start" ? "searching" : "done"} label={activity.phase === "error" ? "Web search failed" : activity.phase === "done" ? "Web search complete" : "Searching the web"} defaultOpen={false} />;
  const knownIcons = ["github", "googledrive", "linear", "notion"];
  const name = activity.server.toLowerCase().replace(/[^a-z0-9]/g, "");
  const icon = activity.icon || knownIcons.find((item) => name.includes(item));
  return <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
    {icon && knownIcons.includes(icon) ? <img src={`/mcp-logos/${icon}.svg`} alt="" className="size-4 shrink-0 dark:rounded-sm dark:bg-white dark:p-0.5" /> : <Bot aria-hidden="true" className="size-4 shrink-0" />}
    <span>{activity.phase === "error" ? "Failed" : activity.phase === "done" ? "Used" : "Using"} {activity.displayName || activity.server}: {activity.tool}</span>
  </div>;
}

export interface tChat {
  prompt: string
  response: string
  documentId: string
  createdAt: string
  updatedAt: string
  error?: string
  streaming?: boolean
  toolCount?: number
  toolActivity?: ToolActivity[]
  mcpWarnings?: string[]
  retryable?: boolean
}

type DocumentChatResponse = {
  documentChat: tChat[];
};

type GeminiChatBarProps = {
  documentId: string;
  mode?: "desktop" | "mobile";
  width?: string;
  side?: "left" | "right";
  docMode: boolean;
  setDocMode: (value: boolean) => void;
  citation: string;
  setCitation: (value: string) => void;
};

function GeminiChatPanel({
  data,
  chatLoading,
  currentModel,
  actionMode,
  setActionMode,
  prompt,
  setPrompt,
  handleActions,
  handleSend,
  retrySend,
  geminiLoading,
  currentModelSetter,
  modelChanges, docMode, setDocMode, citation, setCitation, docStatus, editLoading, editPreview, reviewSummary, reviewInDocument, onReviewDecision, question,
}: {
  docMode: boolean; setDocMode: (value: boolean) => void;
  citation: string; setCitation: (value: string) => void; docStatus: string; editLoading: boolean; editPreview: string; reviewSummary: string | null; reviewInDocument: boolean; onReviewDecision: (accept: boolean) => void; question: string | null;
  data: DocumentChatResponse | undefined;
  chatLoading: boolean;
  currentModel: string;
  actionMode: boolean;
  setActionMode: (value: boolean) => void;
  prompt: string;
  setPrompt: (value: string) => void;
  handleActions: () => Promise<void>;
  handleSend: () => Promise<void>;
  retrySend: (index: number) => Promise<void>;
  geminiLoading: boolean;
  currentModelSetter: (model: string) => void;
  modelChanges: { index: number; from: string; to: string }[];
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const isModelCommand = /^\/model(?:\s|$)/i.test(prompt);
  const openModelPicker = () => {
    setPrompt("");
    modelPickerRef.current?.querySelector<HTMLButtonElement>("button")?.click();
  };
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copyResponse = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Could not copy response");
    }
  };

  const time = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : <time dateTime={value} className="text-xs text-muted-foreground">{date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>;
  };

  return (
    <div className={docMode ? "flex w-full flex-col rounded-3xl border bg-background shadow-lg" : "flex min-h-0 flex-1 flex-col"} onKeyDown={(event) => {
      if (event.key === "Tab" && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        setActionMode(!actionMode);
      }
    }}>
      {reviewSummary && <section aria-label="Review proposed changes" className="space-y-3 border-b px-4 py-3">
        <div><h3 className="text-sm font-semibold">Review changes</h3><p className="text-xs text-muted-foreground">{reviewInDocument ? "Changes are visible in the document. Accept them or discard to restore the previous version." : "Check the proposed edits before applying them."}</p></div>
        {!reviewInDocument && <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{reviewSummary}</div>}
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => onReviewDecision(true)}>Accept changes</Button><Button type="button" size="sm" variant="outline" onClick={() => onReviewDecision(false)}>Discard</Button></div>
      </section>}
      {!docMode && <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <SidebarGroupLabel className="px-0 text-xl font-semibold">Dr. Writer</SidebarGroupLabel>
        <button type="button" aria-label="Switch to dock mode" title="Switch to dock mode" onClick={() => setDocMode(true)} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"><PanelBottom size={16} /></button>
      </div>}

      <div className={docMode ? "px-4 pt-2" : "relative min-h-0 flex-1"}>
      <div ref={messagesRef} className={docMode ? "" : "h-full overflow-y-auto p-3"}>
        <div className="flex flex-col gap-2">
          {docMode ? <>{editLoading ? <AiStatus state="writing" label={docStatus || "Preparing edits"} timer={false} /> : docStatus !== question && <p role="status" className="whitespace-pre-wrap text-sm text-muted-foreground">{docStatus}</p>}{data?.documentChat?.filter((item) => item.streaming).flatMap((item) => item.toolActivity ?? []).map((activity, i) => <ToolActivityLabel key={i} activity={activity} />)}</> : <>{chatLoading ? <ChatMessagesSkeleton /> : data?.documentChat?.length === 0 ? (
            <div className="px-4 text-muted-foreground">Enter prompt for {currentModel} response</div>
          ) : (
            data?.documentChat?.map((item, index) => (
              <div key={index} className="flex w-full flex-col gap-3">
                {modelChanges.filter((change) => change.index === index).map((change, i) => <p key={i} role="status" className="text-center text-xs text-muted-foreground">Model changed from {change.from} to {change.to}</p>)}
                <div className="flex flex-col items-start gap-1">
                  <div className="max-w-[80%] rounded-md bg-zinc-200 p-3 text-sm text-black">
                    {item.prompt}
                  </div>
                  {time(item.createdAt)}
                </div>
                {!!item.mcpWarnings?.length && <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950">Unavailable MCP servers: {item.mcpWarnings.join(", ")}. The answer may not use these tools.</div>}
                {item.error ? (
                  <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                    <p>{item.error}</p>
                    {item.retryable !== false ? <button className="mt-2 font-semibold underline disabled:opacity-50" disabled={geminiLoading} onClick={() => retrySend(index)}>Retry</button> : <p className="mt-2">Check whether any tool made changes before submitting again.</p>}
                  </div>
                ) : <div className="flex flex-col items-end gap-1">
                  {item.streaming && !item.toolActivity?.length && <AiStatus state="thinking" timer={false} />}
                  {item.toolActivity?.map((activity, i) => (
                    <ToolActivityLabel key={i} activity={activity} />
                  ))}
                  <div className="min-w-0 max-w-full overflow-hidden rounded-md bg-green-400 p-3 text-sm text-black [&_a]:break-all [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-black/40 [&_blockquote]:pl-3 [&_code]:break-words [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc">
                    {item.streaming && item.response ? <StreamingResponse text={item.response} status="streaming" actions={false} /> : item.response ? <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={["img"]} components={{
                      table: ({ children }) => <div className="my-2 max-w-full overflow-x-auto"><table className="min-w-max border-collapse text-left">{children}</table></div>,
                      th: ({ children }) => <th className="border border-black/30 px-2 py-1 align-top">{children}</th>,
                      td: ({ children }) => <td className="max-w-xs whitespace-normal border border-black/30 px-2 py-1 align-top">{children}</td>,
                      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
                    }}>{item.response}</ReactMarkdown> : "▍"}
                  </div>
                  {!item.streaming && item.response && time(item.updatedAt)}
                  {!item.streaming && item.response && item.toolCount !== undefined && <span className="text-xs text-muted-foreground">{item.toolCount} {item.toolCount === 1 ? "tool call" : "tool calls"}</span>}
                </div>}
                {!item.error && item.response && (
                <div className="flex justify-end text-sm">
                  <button aria-label={copiedIndex === index ? "Copied" : "Copy response"} onClick={() => copyResponse(item.response, index)}>
                    {copiedIndex === index ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                )}
              </div>
            ))
          )}
          {modelChanges.filter((change) => change.index >= (data?.documentChat?.length ?? 0)).map((change, i) => <p key={i} role="status" className="text-center text-xs text-muted-foreground">Model changed from {change.from} to {change.to}</p>)}</>}
        </div>
      </div>
      {!docMode && !!data?.documentChat?.length && <button type="button" aria-label="Scroll to bottom of chat" title="Scroll to bottom" onClick={() => { const messages = messagesRef.current; if (messages) messages.scrollTo({ top: messages.scrollHeight, behavior: "smooth" }); }} className="absolute bottom-3 right-3 rounded-full border bg-background p-2 shadow-md hover:bg-accent"><ArrowDown size={16} /></button>}
      </div>

      {editPreview && !reviewSummary && <div className="max-h-48 overflow-y-auto whitespace-pre-wrap border-t px-4 py-2 text-sm text-muted-foreground" aria-label="AI work preview">{editPreview}</div>}
      {question && !reviewSummary && !editLoading && <section aria-label="Dr. Writer needs your input" className="mx-3 mb-0 mt-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">Needs your input</p><p className="mt-1 whitespace-pre-wrap text-sm">{question}</p><p className="mt-1 text-xs text-muted-foreground">Type your answer below and send it to continue.</p></section>}
      <div className={docMode ? "p-3" : "border-t border-sidebar-border p-3"}>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2">
              {!docMode && editLoading && <AiStatus state="writing" label={docStatus || "Preparing edits"} timer={false} />}
              {!docMode && <div className="flex items-center gap-2 text-sm">
                <span>Discuss</span>
                <button type="button" role="switch" aria-label="Edit mode" aria-checked={actionMode} title="Switch mode (Shift+Tab)" onClick={() => setActionMode(!actionMode)} className={`relative h-6 w-11 rounded-full transition-colors ${actionMode ? "bg-primary" : "bg-zinc-400"}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${actionMode ? "left-1 translate-x-5" : "left-1"}`} />
                </button>
                <span>Edit</span>
                <span className="ml-auto text-xs text-muted-foreground">Shift+Tab</span>
              </div>}
              {citation && <div className="rounded-md border bg-muted p-2 text-xs"><div className="flex justify-between gap-2"><span className="font-semibold">Selected text</span><button type="button" onClick={() => setCitation("")} aria-label="Remove cited text">Remove</button></div><p className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap">{citation}</p></div>}

              <div className="flex items-center justify-between gap-2"><div ref={modelPickerRef}><ModelSelector value={currentModel} onChange={currentModelSetter} /></div>{docMode && <button type="button" aria-label="Switch to chat mode" title="Switch to chat mode" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => setDocMode(false)}><MessageSquare size={16} /></button>}</div>
              {(docMode || actionMode) && weakModelReason(currentModel) && <p role="status" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-900 dark:text-amber-200">{weakModelReason(currentModel)} Pick a larger model for edits.</p>}

              {docMode ? <PromptBox
                className="w-full max-w-none"
                value={prompt}
                onValueChange={setPrompt}
                onSubmit={() => {
                  if (isModelCommand) openModelPicker();
                  else if (!prompt.startsWith("/")) void handleActions();
                }}
                disabled={geminiLoading}
                efforts={[{ id: "default", label: "Send" }]}
                hint={null}
                placeholder={question ? "Type your answer…" : "Describe changes to your document…"}
                inputProps={{
                  "aria-label": question ? "Answer the question" : "Describe changes to your document",
                }}
              /> : <div className="mt-2 flex">
                <Input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={docMode ? "Describe changes to your document…" : "Enter your prompt"}
                  onKeyDown={(e) => {
                    if (isModelCommand && e.key === "Enter") { e.preventDefault(); openModelPicker(); }
                    else if (e.key === "Enter" && !prompt.startsWith("/")) { (docMode || actionMode) ? handleActions() : handleSend(); }
                  }}
                />
                <SendHorizontal onClick={() => { if (isModelCommand) openModelPicker(); else if (!prompt.startsWith("/")) (docMode || actionMode) ? handleActions() : handleSend(); }} className="m-2 cursor-pointer text-xl" />
              </div>}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}

export function GeminiChatBar({ documentId, mode = "mobile", side = "left", docMode, setDocMode, citation, setCitation }: GeminiChatBarProps) {
  const { user, loading } = useUser();
  const { editor, presentation, setReviewPending } = useSharedEditor();
  const auth = getAuth();
  const [prompt, setPrompt] = useState<string>('');
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [docStatus, setDocStatus] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editPreview, setEditPreview] = useState("");
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [reviewInDocument, setReviewInDocument] = useState(false);
  const reviewResolver = useRef<((accepted: boolean) => void) | null>(null);
  useEffect(() => () => { reviewResolver.current?.(false); reviewResolver.current = null; }, []);
  const requestReview = (operations: unknown, inDocument = false) => {
    const summary = summarizeEdits(operations);
    notifyUser("Edits are ready to review", "Dr. Writer finished. Accept or discard the changes.");
    setEditLoading(false);
    setReviewInDocument(inDocument);
    setReviewSummary(summary);
    return new Promise<boolean>(resolve => { reviewResolver.current = resolve; });
  };
  const finishReview = (accepted: boolean) => {
    const resolve = reviewResolver.current;
    reviewResolver.current = null;
    setReviewSummary(null);
    setEditPreview("");
    if (accepted) setEditLoading(true);
    resolve?.(accepted);
  };
  const [pendingQuestion, setPendingQuestion] = useState<{ command: string; question: string } | null>(null);
  const [actionMode, setActionMode] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<string>(getDefaultModel);
  const [modelChanges, setModelChanges] = useState<{ index: number; from: string; to: string }[]>([]);

  const queryClient = useQueryClient();
  const { data, isLoading: chatLoading } = useQuery<DocumentChatResponse>({
    queryKey: ["documentChat", documentId],
    enabled: !!user && !!documentId,
    queryFn: () => getChatsForDocument(documentId)
  });

  const saveAction = async (actionPrompt: string, response: string) => {
    try {
      await apiClient.post(`/document/actions/${documentId}/history`, { prompt: actionPrompt, response });
    } catch {
      toast.error("The action was completed, but its history could not be saved.");
    }
  };

  const handleActions = async () => {
    if (!prompt.trim() || geminiLoading) return;
    requestNotificationPermission();
    setEditPreview("");
    const showPreview = (text: string) => setEditPreview(current => current ? `${current}\n\n${text}` : text);
    if (presentation?.current) {
      setGeminiLoading(true);
      setEditLoading(true);
      setDocStatus("Preparing slide edits");
      try {
        const applied = await presentation.current(prompt, currentModel, setDocStatus, showPreview, operations => requestReview(operations));
        if (!applied) { setDocStatus("Changes discarded."); return; }
        setPrompt(current => current === prompt ? "" : current);
        queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => ({
          ...(old ?? { documentChat: [] }),
          documentChat: [
            ...(old?.documentChat ?? []),
            { prompt, response: "Slides updated. Save to keep your changes.", documentId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
        }));
        await saveAction(prompt, "Slides updated. Save to keep your changes.");
        setDocStatus("Slides updated. Save to keep your changes.");
        toast.success("Slides updated");
      } catch (error) {
        const message = isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : "Could not edit slides.";
        setDocStatus(message);
        toast.error(message);
        notifyUser("Slide edit failed", message);
      } finally { setGeminiLoading(false); setEditLoading(false); }
      return;
    }
    if (!editor?.commands) { toast.error("Wait for the editor to open."); return; }
    setGeminiLoading(true);
    setEditLoading(true);
    setDocStatus("Preparing document edits");

    const currentPrompt = prompt;
    const withCitation = citation ? `${currentPrompt}\n\nSelected document text for reference:\n${citation}` : currentPrompt;
    const command = pendingQuestion ? `${pendingQuestion.command}\nClarification: ${pendingQuestion.question}\nAnswer: ${withCitation}` : withCitation;
    setCitation("");
    const contentBeforeRequest = JSON.stringify(editor.getJSON());
    setPrompt("");

    queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => ({
      ...(old ?? { documentChat: [] }),
      documentChat: [
        ...(old?.documentChat ?? []),
        {
          prompt: currentPrompt,
          response: "Applying changes to the document…",
          documentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
    }));

    try {
      const result = await requestEdit(documentId, { command, modelName: currentModel, content: JSON.parse(contentBeforeRequest) }, setDocStatus, showPreview);
      const { updatedContent, question } = result;
      if (question) {
        await saveAction(currentPrompt, question);
        setPendingQuestion({ command, question });
        notifyUser("Dr. Writer needs your input", question);
        setDocStatus(question);
        queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => old && ({ ...old, documentChat: old.documentChat.map((item, index) => index === old.documentChat.length - 1 ? { ...item, response: question } : item) }));
        return;
      }
      if (editor.isDestroyed || JSON.stringify(editor.getJSON()) !== contentBeforeRequest) throw new Error("Document changed while the request was running.");
      const previousEditable = editor.isEditable;
      let accepted = false;
      let previewSnapshot: string | null = null;
      setReviewPending(true);
      try {
        editor.setEditable(false);
        const proposed = editor.schema.nodeFromJSON(updatedContent as Parameters<typeof editor.schema.nodeFromJSON>[0]);
        editor.view.dispatch(editor.state.tr.replaceWith(0, editor.state.doc.content.size, proposed.content).setMeta("addToHistory", false));
        previewSnapshot = JSON.stringify(editor.getJSON());
        setDocStatus("Review the changes in your document");
        accepted = await requestReview(result.operations, true);
        if (!editor.isDestroyed && JSON.stringify(editor.getJSON()) !== previewSnapshot) {
          accepted = false;
          throw new Error("The document changed during review. The newer changes were kept.");
        }
      } finally {
        if (!editor.isDestroyed) {
          if (!accepted && (previewSnapshot === null || JSON.stringify(editor.getJSON()) === previewSnapshot)) {
            const original = editor.schema.nodeFromJSON(JSON.parse(contentBeforeRequest));
            editor.view.dispatch(editor.state.tr.replaceWith(0, editor.state.doc.content.size, original.content).setMeta("addToHistory", false));
          }
          editor.setEditable(previousEditable);
        }
        setReviewPending(false);
      }
      if (!accepted) {
        setPrompt(currentPrompt);
        queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => old && ({ ...old, documentChat: old.documentChat.slice(0, -1) }));
        setDocStatus("Changes discarded.");
        return;
      }
      setPendingQuestion(null);
      setDocStatus("Document updated.");
      editor.commands.focus();
      await saveAction(currentPrompt, "Applied changes to the document. Save to keep your changes.");
      queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => old && ({ ...old, documentChat: old.documentChat.map((item, index) => index === old.documentChat.length - 1 ? { ...item, response: "Applied changes to the document. Save to keep your changes." } : item) }));
      toast.success("Document updated");
    } catch (err) {
      setPrompt(currentPrompt);
      if (citation) setCitation(citation);
      queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => ({
        ...(old ?? { documentChat: [] }),
        documentChat: (old?.documentChat ?? []).slice(0, -1)
      }));
      const message = err instanceof Error ? err.message : "Could not update document. Please try again.";
      setDocStatus(message);
      toast.error(message);
      notifyUser("Document edit failed", message);
    } finally {
      setGeminiLoading(false);
      setEditLoading(false);
    }
  };

  const handleSend = async (retryIndex?: number) => {
    const currentPrompt = retryIndex === undefined ? prompt : data?.documentChat[retryIndex]?.prompt;
    if (!currentPrompt?.trim() || geminiLoading) return;
    setGeminiLoading(true);
    const sentPrompt = retryIndex === undefined && citation ? `${currentPrompt}\n\nSelected document text for reference:\n${citation}` : currentPrompt;
    if (retryIndex === undefined) { setPrompt(""); setCitation(""); }

    // Optimistic update
    let chatIndex = retryIndex ?? 0;
    queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => {
      const chats = [...(old?.documentChat ?? [])];
      if (retryIndex === undefined) chatIndex = chats.length;
      chats[chatIndex] = { prompt: sentPrompt, response: "", streaming: true, documentId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return { ...old, documentChat: chats };
    });

    const updateChat = (changes: Partial<tChat>) => queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => {
      if (!old?.documentChat[chatIndex]) return old;
      const chats = [...old.documentChat];
      chats[chatIndex] = { ...chats[chatIndex], ...changes };
      return { ...old, documentChat: chats };
    });

    let retryable = true;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      retryable = false;
      const res = await fetch(`${import.meta.env.VITE_Backend_URL}/document/userprompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userPrompt: sentPrompt, documentId, modelName: currentModel })
      });
      if (!res.ok) {
        retryable = true;
        const body = await res.json().catch(() => null);
        if (body?.retryable === false) retryable = false;
        throw new Error(body?.error || "Could not get a response. Please try again.");
      }
      if (!res.body) throw new Error("Could not start the response. Please try again.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let responseText = "";
      const toolActivity: ToolActivity[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error("The response was interrupted. Please try again.");
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop()!;
        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const payload = JSON.parse(event.replace("data: ", ""));
          if (payload.error) { retryable = payload.retryable === true && toolActivity.length === 0; throw new Error(payload.error); }
          if (payload.type === "mcp_warning") updateChat({ mcpWarnings: payload.servers });
          if (payload.type === "tool") {
            if (payload.phase === "done" || payload.phase === "error") {
              const last = toolActivity.findLastIndex((activity) => activity.server === payload.server && activity.tool === payload.tool && activity.phase === "start");
              if (last >= 0) toolActivity[last] = { ...toolActivity[last], phase: payload.phase };
            } else toolActivity.push({ server: payload.server, tool: payload.tool, displayName: payload.displayName, icon: payload.icon, phase: "start" });
            updateChat({ toolActivity: [...toolActivity] });
          }
          if (payload.type === "reset") { responseText = ""; updateChat({ response: "" }); }
          if (payload.type === "done") {
            console.log("Usage tokens:", payload.usageToken);
            updateChat({ streaming: false, toolCount: payload.toolCount, updatedAt: new Date().toISOString() });
            return;
          }
          if (payload.chunk) {
            responseText += payload.chunk;
            updateChat({ response: responseText });
          }
        }
      }
    } catch (err) {
      updateChat({ streaming: false, retryable, error: err instanceof TypeError ? "Could not connect. Check your connection." : err instanceof Error ? err.message : "Could not get a response." });
    } finally {
      setGeminiLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not logged in</p>;

  const panel = (
    <GeminiChatPanel
      docMode={docMode} setDocMode={setDocMode} citation={citation} setCitation={setCitation} docStatus={docStatus} editLoading={editLoading} editPreview={editPreview} reviewSummary={reviewSummary} reviewInDocument={reviewInDocument} onReviewDecision={finishReview} question={pendingQuestion?.question ?? null}
      data={data}
      chatLoading={chatLoading}
      currentModel={currentModel}
      currentModelSetter={(model) => { if (model !== currentModel) { setModelChanges((changes) => [...changes, { index: data?.documentChat?.length ?? 0, from: currentModel, to: model }]); setCurrentModel(model); } }}
      modelChanges={modelChanges}
      actionMode={actionMode}
      setActionMode={setActionMode}
      prompt={prompt}
      setPrompt={setPrompt}
      handleActions={handleActions}
      handleSend={() => handleSend()}
      retrySend={handleSend}
      geminiLoading={geminiLoading}
    />
  );

  if (docMode) return panel;

  if (mode === "desktop") {
    return (
      <aside className="flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground"
        style={{ width: "100%" }}
      >
        {panel}
      </aside>
    );
  }

  return (
    <Sidebar side={side}>
      <SidebarContent className="min-h-0">
        {panel}
      </SidebarContent>
    </Sidebar>
  );
}
