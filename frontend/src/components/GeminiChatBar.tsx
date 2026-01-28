import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
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
import type { Editor } from "@tiptap/core";

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
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
];

export function GeminiChatBar({ documentId }: { documentId: string }) {
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
    if (!editor?.commands) return;
    try {
      const res = await apiClient.post(`/document/actions/${documentId}`, { command: prompt, modelName: currentModel });
      const { updatedContent } = res.data;
      editor.commands.setContent(updatedContent, false);
      editor.commands.focus();
    } catch (err) {
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

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xl font-semibold">Dr. Writer</SidebarGroupLabel>
        </SidebarGroup>
        <SidebarContent>
          <div className="overflow-y-scroll no-scrollbar p-3 flex flex-col gap-2">
            {data?.documentChat?.length === 0 ? (
              <div className="px-4 text-zinc-500">Enter prompt for {currentModel} response</div>
            ) : (
              data?.documentChat?.map((item, index) => (
                <div key={index} className="flex flex-col gap-3 w-full">
                  <div className="flex justify-start">
                    <div className="bg-zinc-200 text-black rounded-md text-sm p-3 max-w-[80%]">
                      {item.prompt}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-green-400 text-black rounded-md text-sm p-3 max-w-[80%] whitespace-pre-wrap">
                      {item.response || "▍"}
                    </div>
                  </div>
                  <div className="flex text-sm justify-end">
                    <button onClick={() => navigator.clipboard.writeText(item.response || "")}>
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </SidebarContent>
      </SidebarContent>
      <SidebarFooter>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex flex-col gap-2">
                <span className="flex gap-2 items-center">
                  Actions
                  <input type="checkbox" checked={actionMode} onChange={(e) => setActionMode(e.target.checked)} className="w-5 h-5" />
                </span>

                {/* Model selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="border px-2 py-1 rounded flex items-center justify-between w-full">
                    {currentModel} <ChevronDown size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    {availableModels.map((model) => (
                      <DropdownMenuItem key={model} onClick={() => setCurrentModel(model)}>
                        {model}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex mt-2">
                  <Input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt"
                    onKeyDown={(e) => e.key === "Enter" && (actionMode ? handleActions() : handleSend())}
                  />
                  <SendHorizontal onClick={actionMode ? handleActions : handleSend} className="text-xl cursor-pointer m-2" />
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </SidebarFooter>
    </Sidebar>
  );
}
