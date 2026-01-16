import React, { useContext, useState } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Copy, SendHorizontal } from "lucide-react";
import { UserContext } from "@/context/UserContext";
import { ThemeContext } from "@/context/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatsForDocument } from "@/service/document";
import { useSharedEditor } from "@/context/EditorContext";
import apiClient from "@/service/axiosConfig";

export function GeminiChatBar({ documentId }) {
  const { user, loading } = useContext(UserContext);
  const { toast } = useToast();
  const { theme } = useContext(ThemeContext);
  const { editor } = useSharedEditor();

  const [prompt, setPrompt] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [actionMode, setActionMode] = useState(false);

  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["documentChat", documentId],
    enabled: !!user && !!documentId,
    queryFn: () => getChatsForDocument(documentId)
  });

  const handleActions = async () => {
    if (!editor?.commands) return;
    try {
      const res = await apiClient.post(`/document/actions/${documentId}`, { command: prompt });
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

    try {
      const res = await fetch(`${import.meta.env.VITE_Backend_URL}/document/userprompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt: currentPrompt, documentId })
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
        buffer = events.pop();
        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          const payload = JSON.parse(event.replace("data: ", ""));
          if (payload.done) {
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
      toast({ title: "Error", description: "Gemini streaming failed" });
    } finally {
      setGeminiLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not logged in</p>;

  return (
    <Sidebar className={`${theme === "dark" ? "bg-zinc-950" : ""}`}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xl font-semibold">Dr. Writer</SidebarGroupLabel>
        </SidebarGroup>
        <SidebarContent>
          <div className="overflow-y-scroll no-scrollbar p-1 flex flex-col gap-2">
            {data?.documentChat?.length === 0 ? (
              <div className="px-4 text-zinc-500">Enter prompt for Gemini response</div>
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
                <div className="flex">
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
