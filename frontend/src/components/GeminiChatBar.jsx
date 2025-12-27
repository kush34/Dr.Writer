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

export function GeminiChatBar({ documentId }) {
    const { user, loading } = useContext(UserContext);
    const { toast } = useToast();
    const { theme } = useContext(ThemeContext);

    const [prompt, setPrompt] = useState('');
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [responseList, setResponseList] = useState([]);

    const fetchChats = async () => {
        try {
            const response = await apiClient.get(`document/getChats/${documentId}`)
            console.log(response.data)
            if (response.status === 200) {
                setResponseList(response.data)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Could not Document LLM Chats",
            });

            console.log('Fetching chats from GET document/getChats/:documentId ', error)
        }
    }
    const handleSend = async () => {
        if (!prompt.trim()) return;

        const currentPrompt = prompt;
        setPrompt("");
        setGeminiLoading(true);

        const tempIndex = responseList.length;

        // Optimistic UI
        setResponseList((prev) => [
            ...prev,
            { prompt: currentPrompt, response: "" },
        ]);

        try {
            // 🔐 Get Firebase token
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error("User not authenticated");

            const token = await user.getIdToken();

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

                    if (payload.done) return;

                    if (payload.chunk) {
                        setResponseList((prev) => {
                            const updated = [...prev];
                            updated[tempIndex] = {
                                ...updated[tempIndex],
                                response: updated[tempIndex].response + payload.chunk,
                            };
                            return updated;
                        });
                    }
                }
            }
        } catch (err) {
            console.error(err);
            toast({
                title: "Error",
                description: "Streaming failed",
            });


            // Rollback optimistic UI on failure
            setResponseList((prev) => prev.slice(0, -1));
        } finally {
            setGeminiLoading(false);
        }
    };

    const copyPrompt = async (text)=>{
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
             console.error(error);
            toast({title:"Error",description:"Could not copy!"})
        }
    }
    useEffect(() => {
        if(loading && !user) return;
        if (!documentId) return;
            fetchChats();
    }, [documentId,loading,user]);

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
                        {responseList.length <= 0 ? (
                            <div className="px-4 text-zinc-500">
                                Enter prompt for Gemini response
                            </div>
                        ) : (
                            responseList.map((item, index) => (
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
                                        <button onClick={()=>copyPrompt(item.response)}>
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
