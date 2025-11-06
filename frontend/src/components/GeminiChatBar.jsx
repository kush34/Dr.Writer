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
import { useEffect, useRef } from "react";
import { SendHorizontal } from 'lucide-react';
import { Input } from "@/components/ui/input";
import React from "react";
import { Plus } from 'lucide-react';
import { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";
import { Label } from "@/components/ui/label"
import apiClient from "@/service/axiosConfig";
import { ThemeContext } from "@/context/ThemeContext";
import Markdown from "react-markdown";
import { toast } from "@/hooks/use-toast";

export function GeminiChatBar({ documentId }) {
    const { user, loading } = useContext(UserContext);
    const { theme } = useContext(ThemeContext);
    if (loading) return <p>Loading...</p>;
    if (!user) return <p>User not logged in</p>;
    const [prompt, setPrompt] = useState('');
    const [geminiLoading, setGeminiLoading] = useState(false);
    const [responseList, setResponseList] = useState([]);

    const fetchChats = async () => {
        try {
            const response = await apiClient.get(`document/getChats/${documentId}`)
            console.log(response.data)
            setResponseList(response.data)
        } catch (error) {
            toast('Could not get Chats')
            console.log('Fetching chats from GET document/getChats/:documentId ', error)
        }
    }
    const handleSend = async () => {

        if (prompt == '') return;
        setGeminiLoading(true);
        setPrompt('');
        try {
            const response = await apiClient.post('/document/userprompt', {
                userPrompt: prompt,
                documentId
            });
            // console.log(response);
            if (response.status === 200) {
                setResponseList([...responseList, response.data]);
            } else {
                toast("Could not send your prompt");
            }

        } catch (error) {
            toast("Something went wrong");

        } finally {
            setGeminiLoading(false);
        }
    }
    useEffect(() => {
        fetchChats();
    }, [])
    return (
        <Sidebar className={`${theme == 'dark' ? "bg-zinc-950" : ""} `}>
            <SidebarContent className={`${theme == 'dark' ? "bg-zinc-950" : ""}`}>
                <SidebarGroup>
                    <SidebarGroupLabel className='text-xl font-semibold'>Dr. Writer</SidebarGroupLabel>
                </SidebarGroup>
                <SidebarContent>
                    <div className="overflow-y-scroll no-scrollbar p-1">
                        {responseList.length <= 0 ? (
                            <div className="px-4 text-zinc-500">
                                Enter prompt for Gemini response
                            </div>
                        ) : (
                            responseList.map((item, index) => (
                                <div className="flex flex-col gap-3 w-full">
                                    <div className="flex justify-start">
                                        <div className="bg-zinc-200 text-black rounded-md text-sm p-3 max-w-[80%]">
                                            <Markdown>{item.prompt}</Markdown>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <div className="bg-green-400 text-black rounded-md text-sm p-3 max-w-[80%]">
                                            <Markdown>{item.response}</Markdown>
                                        </div>
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
