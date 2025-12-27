import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
} from "@/components/ui/sidebar";
import { getAuth } from 'firebase/auth';
import { useEffect, useRef } from "react";
import { Copy, SendHorizontal } from 'lucide-react';
import { Input } from "@/components/ui/input";
import React from "react";
import { Plus } from 'lucide-react';
import { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";
import { Label } from "@/components/ui/label"
import apiClient from "@/service/axiosConfig";
import { ThemeContext } from "@/context/ThemeContext";
import Markdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatsForDocument } from "@/service/document";

export function GeminiChatBar({ documentId }) {
    const { user, loading } = useContext(UserContext);
    const { toast } = useToast();
    const { theme } = useContext(ThemeContext);

    const [prompt, setPrompt] = useState('');
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [responseList, setResponseList] = useState([]);

    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ["documentChat", documentId],
        enabled: !!user && !!documentId,
        queryFn: () => getChatsForDocument(documentId)
    });
    
    const handleSend = async () => {
        if (!prompt.trim() || geminiLoading) return;

        const currentPrompt = prompt;
        setPrompt("");
        setGeminiLoading(true);

        const chatKey = ["documentChat", documentId];

        //Optimistic update: add user message + empty assistant message
        queryClient.setQueryData(chatKey, (old) => {
            const prev = old?.documentChat ?? [];
            return {
                ...old,
                documentChat: [
                    ...prev,
                    { prompt: currentPrompt, response: "", streaming: true },
                ],
            };
        });

        try {
            // 🔐 Firebase token
            const auth = getAuth();
            const firebaseUser = auth.currentUser;
            if (!firebaseUser) throw new Error("User not authenticated");

            const token = await firebaseUser.getIdToken();

            const res = await fetch(
                `${import.meta.env.VITE_Backend_URL}/document/userprompt`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        userPrompt: currentPrompt,
                        documentId,
                    }),
                }
            );

            if (!res.ok || !res.body) {
                throw new Error("Stream not available");
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const events = buffer.split("\n\n");
                buffer = events.pop(); // keep incomplete chunk

                for (const event of events) {
                    if (!event.startsWith("data: ")) continue;

                    const payload = JSON.parse(event.replace("data: ", ""));

                    if (payload.done) {
                        // mark streaming false
                        queryClient.setQueryData(chatKey, (old) => {
                            const chats = [...old.documentChat];
                            const last = chats[chats.length - 1];
                            chats[chats.length - 1] = { ...last, streaming: false };
                            return { ...old, documentChat: chats };
                        });
                        return;
                    }

                    if (payload.chunk) {
                        // Stream chunk into cache
                        queryClient.setQueryData(chatKey, (old) => {
                            const chats = [...old.documentChat];
                            const last = chats[chats.length - 1];

                            chats[chats.length - 1] = {
                                ...last,
                                response: last.response + payload.chunk,
                            };

                            return { ...old, documentChat: chats };
                        });
                    }
                }
            }
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Gemini streaming failed",
            });

            // Rollback assistant message only
            queryClient.setQueryData(chatKey, (old) => {
                const chats = [...old.documentChat];
                chats.pop(); // remove assistant
                return { ...old, documentChat: chats };
            });
        } finally {
            setGeminiLoading(false);
        }
    };

    const copyPrompt = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not copy!" })
        }
    }

    if (loading) return <p>Loading...</p>;
    if (!user) return <p>User not logged in</p>;
    return (
        <Sidebar className={`${theme == 'dark' ? "bg-zinc-950" : ""} `}>
            <SidebarContent className={`${theme == 'dark' ? "bg-zinc-950" : ""}`}>
                <SidebarGroup>
                    <SidebarGroupLabel className='text-xl font-semibold'>Dr. Writer</SidebarGroupLabel>
                </SidebarGroup>
                <SidebarContent>
                    <div className="overflow-y-scroll no-scrollbar p-1 flex flex-col gap-2">
                        {data?.documentChat?.length <= 0 ? (
                            <div className="px-4 text-zinc-500">
                                Enter prompt for Gemini response
                            </div>
                        ) : (
                            data?.documentChat?.map((item, index) => (
                                <div key={index} className="flex flex-col gap-3 w-full">
                                    <div className="flex justify-start">
                                        <div className="bg-zinc-200 text-black rounded-md text-sm p-3 max-w-[80%]">
                                            <Markdown>{item.prompt}</Markdown>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="bg-green-400 text-black rounded-md text-sm p-3 max-w-[80%] whitespace-pre-wrap">
                                            <Markdown>{item.response || "▍"}</Markdown>
                                        </div>
                                    </div>
                                    <div className="flex text-sm justify-end">
                                        <button onClick={() => copyPrompt(item.response)}>
                                            <Copy size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))

                        )}
                    </div>
                </SidebarContent>

            </SidebarContent>
            <SidebarFooter className={`${theme == 'dark' ? "bg-zinc-950" : ""}`}>
                <SidebarContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            {geminiLoading ?
                                <div>
                                    Loading...
                                </div>
                                :
                                <div className={`${theme == 'dark' ? "bg-zinc-950" : ""} flex`}>
                                    <Input
                                        id="prompt"
                                        type="text"
                                        className={`${theme == 'dark' ? "bg-zinc-950" : ""} outline-none`}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        value={prompt}
                                        placeholder='enter your prompt Gemini'
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSend();
                                            }
                                        }}
                                    />
                                    <SendHorizontal onClick={handleSend} className="text-xl cursor-pointer m-2" />
                                </div>

                            }
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarContent>
            </SidebarFooter>
        </Sidebar>
    );
}
