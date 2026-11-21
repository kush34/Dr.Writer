import { useEffect, useRef, useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Check, Copy, SendHorizontal, ChevronDown } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatsForDocument } from "@/service/document";
import { useSharedEditor } from "@/context/EditorContext";
import apiClient from "@/service/axiosConfig";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export interface tChat {
  prompt: string
  response: string
  documentId: string
  createdAt: string
  updatedAt: string
  error?: string
  streaming?: boolean
}

type DocumentChatResponse = {
  documentChat: tChat[];
};

const availableModels = [
  // Auto-select (OpenRouter picks an available free model)
  "openrouter/free",

  // General Purpose
  "google/gemma-3-27b-it:free",
  "openai/gpt-oss-120b:free",
  "openai/gpt-oss-20b:free",

  // Coding
  "qwen/qwen3-coder:free",

  // Reasoning
  "nvidia/nemotron-3-super-120b-a12b:free",

  // Vision + Tools
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",

];

type GeminiChatBarProps = {
  documentId: string;
  mode?: "desktop" | "mobile";
  width?: string;
};

function GeminiChatPanel({
  data,
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
}: {
  data: DocumentChatResponse | undefined;
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
}) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
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
    return Number.isNaN(date.getTime()) ? null : <time dateTime={value} className="text-xs text-zinc-500">{date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={(event) => {
      if (event.key === "Tab" && event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        setActionMode(!actionMode);
      }
    }}>
      <div className="border-b border-sidebar-border px-4 py-3">
        <SidebarGroupLabel className="px-0 text-xl font-semibold">Dr. Writer</SidebarGroupLabel>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
          {data?.documentChat?.length === 0 ? (
            <div className="px-4 text-zinc-500">Enter prompt for {currentModel} response</div>
          ) : (
            data?.documentChat?.map((item, index) => (
              <div key={index} className="flex w-full flex-col gap-3">
                <div className="flex flex-col items-start gap-1">
                  <div className="max-w-[80%] rounded-md bg-zinc-200 p-3 text-sm text-black">
                    {item.prompt}
                  </div>
                  {time(item.createdAt)}
                </div>
                {item.error ? (
                  <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                    <p>{item.error}</p>
                    <button className="mt-2 font-semibold underline disabled:opacity-50" disabled={geminiLoading} onClick={() => retrySend(index)}>Retry</button>
                  </div>
                ) : <div className="flex flex-col items-end gap-1">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-md bg-green-400 p-3 text-sm text-black">
                    {item.response || "▍"}
                  </div>
                  {!item.streaming && item.response && time(item.updatedAt)}
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
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span>Discuss</span>
                <button type="button" role="switch" aria-label="Edit mode" aria-checked={actionMode} title="Switch mode (Shift+Tab)" onClick={() => setActionMode(!actionMode)} className={`relative h-6 w-11 rounded-full transition-colors ${actionMode ? "bg-primary" : "bg-zinc-400"}`}>
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${actionMode ? "left-1 translate-x-5" : "left-1"}`} />
                </button>
                <span>Edit</span>
                <span className="ml-auto text-xs text-zinc-500">Shift+Tab</span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex w-full items-center justify-between rounded border px-2 py-1">
                  {currentModel} <ChevronDown size={16} />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full">
                  {availableModels.map((model) => (
                    <DropdownMenuItem key={model} onClick={() => currentModelSetter(model)}>
                      {model}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="mt-2 flex">
                <Input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt"
                  onKeyDown={(e) => e.key === "Enter" && (actionMode ? handleActions() : handleSend())}
                />
                <SendHorizontal onClick={actionMode ? handleActions : handleSend} className="m-2 cursor-pointer text-xl" />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}

export function GeminiChatBar({ documentId, mode = "mobile" }: GeminiChatBarProps) {
  const { user, loading } = useUser();
  const { editor } = useSharedEditor();
  const auth = getAuth();
  const [prompt, setPrompt] = useState<string>('');
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [actionMode, setActionMode] = useState<boolean>(false);
  const [currentModel, setCurrentModel] = useState<string>(availableModels[0]); // default model

  const queryClient = useQueryClient();
  const { data } = useQuery<DocumentChatResponse>({
    queryKey: ["documentChat", documentId],
    enabled: !!user && !!documentId,
    queryFn: () => getChatsForDocument(documentId)
  });

  const handleActions = async () => {
    if (!editor?.commands || !prompt.trim()) return;

    const currentPrompt = prompt;
    setPrompt("");

    queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => ({
      ...(old ?? { documentChat: [] }),
      documentChat: [
        ...(old?.documentChat ?? []),
        {
          prompt: currentPrompt,
          response: "Applied changes to the document.",
          documentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ]
    }));

    try {
      const res = await apiClient.post(`/document/actions/${documentId}`, { command: currentPrompt, modelName: currentModel });
      const { updatedContent } = res.data;
      editor.commands.setContent(updatedContent, false);
      editor.commands.focus();
    } catch (err) {
      setPrompt(currentPrompt);
      queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => ({
        ...(old ?? { documentChat: [] }),
        documentChat: (old?.documentChat ?? []).slice(0, -1)
      }));
      console.log(err);
      toast({ title: "Error", description: "LLM operation failed" });
    }
  };

  const handleSend = async (retryIndex?: number) => {
    const currentPrompt = retryIndex === undefined ? prompt : data?.documentChat[retryIndex]?.prompt;
    if (!currentPrompt?.trim() || geminiLoading) return;
    setGeminiLoading(true);
    if (retryIndex === undefined) setPrompt("");

    // Optimistic update
    let chatIndex = retryIndex ?? 0;
    queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => {
      const chats = [...(old?.documentChat ?? [])];
      if (retryIndex === undefined) chatIndex = chats.length;
      chats[chatIndex] = { prompt: currentPrompt, response: "", streaming: true, documentId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      return { ...old, documentChat: chats };
    });

    const updateChat = (changes: Partial<tChat>) => queryClient.setQueryData(["documentChat", documentId], (old: DocumentChatResponse | undefined) => {
      if (!old?.documentChat[chatIndex]) return old;
      const chats = [...old.documentChat];
      chats[chatIndex] = { ...chats[chatIndex], ...changes };
      return { ...old, documentChat: chats };
    });

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const res = await fetch(`${import.meta.env.VITE_Backend_URL}/document/userprompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userPrompt: currentPrompt, documentId, modelName: currentModel })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Could not get a response. Please try again.");
      }
      if (!res.body) throw new Error("Could not start the response. Please try again.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let responseText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error("The response was interrupted. Please try again.");
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop()!;
        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const payload = JSON.parse(event.replace("data: ", ""));
          if (payload.error) throw new Error(payload.error);
          if (payload.type === "done") {
            console.log("Usage tokens:", payload.usageToken);
            updateChat({ streaming: false, updatedAt: new Date().toISOString() });
            return;
          }
          if (payload.chunk) {
            responseText += payload.chunk;
            updateChat({ response: responseText });
          }
        }
      }
    } catch (err) {
      updateChat({ streaming: false, error: err instanceof TypeError ? "Could not connect. Check your connection and retry." : err instanceof Error ? err.message : "Could not get a response. Please try again." });
    } finally {
      setGeminiLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not logged in</p>;

  const panel = (
    <GeminiChatPanel
      data={data}
      currentModel={currentModel}
      currentModelSetter={setCurrentModel}
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
    <Sidebar>
      <SidebarContent className="min-h-0">
        {panel}
      </SidebarContent>
    </Sidebar>
  );
}
