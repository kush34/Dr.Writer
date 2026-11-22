import { useEffect, useRef, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { ArrowDown, Bot, Check, Copy, MessageSquare, PanelBottom, SendHorizontal } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatsForDocument } from "@/service/document";
import { useSharedEditor } from "@/context/EditorContext";
import apiClient from "@/service/axiosConfig";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { availableModels, getDefaultModel } from "@/config/models";
import { ChatMessagesSkeleton } from "@/components/PageSkeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


const providerLogos: Record<string, string> = {
  google: "googlegemini", openai: "openai", qwen: "qwen",
  nvidia: "nvidia", openrouter: "openrouter", deepseek: "deepseek",
};

function ModelLogo({ model }: { model: string }) {
  const logo = providerLogos[model.split("/")[0].toLowerCase()];
  return logo ? <img src={`/model-logos/${logo}.svg`} alt="" className="size-4 shrink-0 dark:rounded-sm dark:bg-white dark:p-0.5" /> : <Bot aria-hidden="true" className="size-4 shrink-0" />;
}

type ToolActivity = { server: string; tool: string; displayName?: string; icon?: string };

function ToolActivityLabel({ activity }: { activity: ToolActivity }) {
  const knownIcons = ["github", "googledrive", "linear", "notion"];
  const name = activity.server.toLowerCase().replace(/[^a-z0-9]/g, "");
  const icon = activity.icon || knownIcons.find((item) => name.includes(item));
  return <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
    {icon && knownIcons.includes(icon) ? <img src={`/mcp-logos/${icon}.svg`} alt="" className="size-4 shrink-0 dark:rounded-sm dark:bg-white dark:p-0.5" /> : <Bot aria-hidden="true" className="size-4 shrink-0" />}
    <span>Using {activity.displayName || activity.server}: {activity.tool}</span>
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
  modelChanges, docMode, setDocMode, citation, setCitation, docStatus,
}: {
  docMode: boolean; setDocMode: (value: boolean) => void;
  citation: string; setCitation: (value: string) => void; docStatus: string;
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
  const [modelIndex, setModelIndex] = useState(0);
  const modelListRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const isModelCommand = /^\/model(?:\s|$)/i.test(prompt);
  const matchingModels = isModelCommand ? availableModels.filter((model) => model.toLowerCase().includes(prompt.slice(6).trim().toLowerCase())) : [];
  useEffect(() => { setModelIndex(0); }, [prompt]);
  useEffect(() => {
    modelListRef.current?.querySelector<HTMLElement>(`[data-index="${modelIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [modelIndex]);
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
      {!docMode && <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <SidebarGroupLabel className="px-0 text-xl font-semibold">Dr. Writer</SidebarGroupLabel>
        <button type="button" aria-label="Switch to dock mode" title="Switch to dock mode" onClick={() => setDocMode(true)} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"><PanelBottom size={16} /></button>
      </div>}

      <div className={docMode ? "px-4 pt-2" : "relative min-h-0 flex-1"}>
      <div ref={messagesRef} className={docMode ? "" : "h-full overflow-y-auto p-3"}>
        <div className="flex flex-col gap-2">
          {docMode ? <><p role="status" className="whitespace-pre-wrap text-sm text-muted-foreground">{docStatus}</p>{data?.documentChat?.filter((item) => item.streaming).flatMap((item) => item.toolActivity ?? []).map((activity, i) => <ToolActivityLabel key={i} activity={activity} />)}</> : <>{chatLoading ? <ChatMessagesSkeleton /> : data?.documentChat?.length === 0 ? (
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
                  {item.streaming && item.toolActivity?.map((activity, i) => (
                    <ToolActivityLabel key={i} activity={activity} />
                  ))}
                  <div className="min-w-0 max-w-full overflow-hidden rounded-md bg-green-400 p-3 text-sm text-black [&_a]:break-all [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-black/40 [&_blockquote]:pl-3 [&_code]:break-words [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-bold [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-2 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc">
                    {item.response ? <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={["img"]} components={{
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

      <div className={docMode ? "p-3" : "border-t border-sidebar-border p-3"}>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2">
              {!docMode && <div className="flex items-center gap-2 text-sm">
                <span>Discuss</span>
                <button type="button" role="switch" aria-label="Edit mode" aria-checked={actionMode} title="Switch mode (Shift+Tab)" onClick={() => setActionMode(!actionMode)} className={`relative h-6 w-11 rounded-full transition-colors ${actionMode ? "bg-primary" : "bg-zinc-400"}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${actionMode ? "left-1 translate-x-5" : "left-1"}`} />
                </button>
                <span>Edit</span>
                <span className="ml-auto text-xs text-muted-foreground">Shift+Tab</span>
              </div>}
              {citation && <div className="rounded-md border bg-muted p-2 text-xs"><div className="flex justify-between gap-2"><span className="font-semibold">Selected text</span><button type="button" onClick={() => setCitation("")} aria-label="Remove cited text">Remove</button></div><p className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap">{citation}</p></div>}

              <div className="flex items-center justify-between gap-2"><p className="flex items-center gap-2 break-all text-xs text-muted-foreground"><ModelLogo model={currentModel} />Model: {currentModel}</p>{docMode && <button type="button" aria-label="Switch to chat mode" title="Switch to chat mode" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" onClick={() => setDocMode(false)}><MessageSquare size={16} /></button>}</div>
              {isModelCommand && <div ref={modelListRef} id="model-options" role="listbox" className="max-h-48 overflow-y-auto rounded-md border bg-background p-1" aria-label="Available models">
                {matchingModels.map((model, index) => <button type="button" id={`model-option-${index}`} role="option" aria-selected={index === modelIndex} data-index={index} key={model} onMouseEnter={() => setModelIndex(index)} onClick={() => { currentModelSetter(model); setPrompt(""); }} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent focus:bg-accent ${index === modelIndex ? "bg-accent" : ""}`}><ModelLogo model={model} />{model}{model === currentModel ? " ✓" : ""}</button>)}
              </div>}

              <div className="mt-2 flex">
                <Input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={docMode ? "Describe changes to your document…" : "Enter your prompt"}
                  aria-controls={isModelCommand ? "model-options" : undefined}
                  aria-activedescendant={isModelCommand && matchingModels.length ? `model-option-${modelIndex}` : undefined}
                  onKeyDown={(e) => {
                    if (isModelCommand && matchingModels.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                      e.preventDefault();
                      setModelIndex((index) => (index + (e.key === "ArrowDown" ? 1 : -1) + matchingModels.length) % matchingModels.length);
                    } else if (isModelCommand && e.key === "Enter") {
                      e.preventDefault();
                      if (matchingModels[modelIndex]) { currentModelSetter(matchingModels[modelIndex]); setPrompt(""); }
                    } else if (e.key === "Enter" && !prompt.startsWith("/")) { (docMode || actionMode) ? handleActions() : handleSend(); }
                  }}
                />
                <SendHorizontal onClick={() => { if (!prompt.startsWith("/")) (docMode || actionMode) ? handleActions() : handleSend(); }} className="m-2 cursor-pointer text-xl" />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}

export function GeminiChatBar({ documentId, mode = "mobile", side = "left", docMode, setDocMode, citation, setCitation }: GeminiChatBarProps) {
  const { user, loading } = useUser();
  const { editor } = useSharedEditor();
  const auth = getAuth();
  const [prompt, setPrompt] = useState<string>('');
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [docStatus, setDocStatus] = useState("");
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

  const handleActions = async () => {
    if (!editor?.commands || !prompt.trim() || geminiLoading) return;
    setGeminiLoading(true);
    setDocStatus("Applying changes…");

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
      const res = await apiClient.post(`/document/actions/${documentId}`, { command, modelName: currentModel, content: JSON.parse(contentBeforeRequest) });
      const { updatedContent, question } = res.data;
      if (question) {
        setPendingQuestion({ command, question });
        setDocStatus(question);
        queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => old && ({ ...old, documentChat: old.documentChat.map((item, index) => index === old.documentChat.length - 1 ? { ...item, response: question } : item) }));
        return;
      }
      if (JSON.stringify(editor.getJSON()) !== contentBeforeRequest) throw new Error("Document changed while the request was running.");
      setPendingQuestion(null);
      setDocStatus("Document updated.");
      editor.commands.setContent(updatedContent, { emitUpdate: true });
      editor.commands.focus();
      queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => old && ({ ...old, documentChat: old.documentChat.map((item, index) => index === old.documentChat.length - 1 ? { ...item, response: "Applied changes to the document." } : item) }));
      toast.success("Document updated");
    } catch (err) {
      setPrompt(currentPrompt);
      if (citation) setCitation(citation);
      queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => ({
        ...(old ?? { documentChat: [] }),
        documentChat: (old?.documentChat ?? []).slice(0, -1)
      }));
      console.log(err);
      setDocStatus("Could not update document. Please try again.");
      toast.error("Could not update document");
    } finally {
      setGeminiLoading(false);
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
            toolActivity.push({ server: payload.server, tool: payload.tool, displayName: payload.displayName, icon: payload.icon });
            updateChat({ toolActivity: [...toolActivity] });
          }
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
      docMode={docMode} setDocMode={setDocMode} citation={citation} setCitation={setCitation} docStatus={docStatus}
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
