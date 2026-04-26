import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuItem
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Copy, SendHorizontal, ChevronDown } from "lucide-react";
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
}

type DocumentChatResponse = {
  documentChat: tChat[];
};

const availableModels = [
  // General Purpose
  "meta-llama/llama-3.3-70b-instruct:free",
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

  // Auto-select (OpenRouter picks best available free model)
  "openrouter/free",
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
  currentModelSetter: (model: string) => void;
}) {
  return (
    <>
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
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-md bg-zinc-200 p-3 text-sm text-black">
                    {item.prompt}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-md bg-green-400 p-3 text-sm text-black">
                    {item.response || "▍"}
                  </div>
                </div>
                <div className="flex justify-end text-sm">
                  <button onClick={() => navigator.clipboard.writeText(item.response || "")}>
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                Actions
                <input type="checkbox" checked={actionMode} onChange={(e) => setActionMode(e.target.checked)} className="h-5 w-5" />
              </span>

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
    </>
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

  const handleSend = async () => {
    if (!prompt.trim() || geminiLoading) return;
    setGeminiLoading(true);
    const currentPrompt = prompt;
    setPrompt("");

    // Optimistic update
    queryClient.setQueryData(["documentChat", documentId], (old) => ({
      ...old,
      documentChat: [...(old?.documentChat ?? []), { prompt: currentPrompt, response: "", streaming: true }]
    }));

    const user = auth.currentUser;
    const token = await user.getIdToken();

    try {
      const res = await fetch(`${import.meta.env.VITE_Backend_URL}/document/userprompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ userPrompt: currentPrompt, documentId, modelName: currentModel })
      });
      if (!res.ok || !res.body) throw new Error("Stream not available");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop()!;
        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const payload = JSON.parse(event.replace("data: ", ""));
          if (payload.type === "done") {
            console.log("Usage tokens:", payload.usageToken);
            queryClient.setQueryData(["documentChat", documentId], (old) => {
              const chats = [...old.documentChat];
              chats[chats.length - 1] = { ...chats[chats.length - 1], streaming: false };
              return { ...old, documentChat: chats };
            });
            return;
          }
          if (payload.chunk) {
            queryClient.setQueryData(["documentChat", documentId], (old) => {
              const chats = [...old.documentChat];
              chats[chats.length - 1] = { ...chats[chats.length - 1], response: chats[chats.length - 1].response + payload.chunk };
              return { ...old, documentChat: chats };
            });
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast("Error", { description: "LLM streaming failed" });
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
      handleSend={handleSend}
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
