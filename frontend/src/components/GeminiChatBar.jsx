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
import { useRef } from "react";
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

export function GeminiChatBar() {
    const { user, loading } = useContext(UserContext);
    const {theme} = useContext(ThemeContext);
    if (loading) return <p>Loading...</p>;
    if (!user) return <p>User not logged in</p>;
    const [prompt,setPrompt] = useState('');
    const [geminiLoading,setGeminiLoading] = useState(false);
    const [responseList,setResponseList] = useState([]);


    const handleSend = async ()=>{
        
        if(prompt == '') return;
        setGeminiLoading(true);
        setPrompt('');
        try {
            const response = await apiClient.post('/document/userprompt',{
                userPrompt:prompt
            });
            // console.log(response);
            if (response.status === 200) {
                setResponseList([...responseList, prompt, response.data.rawText]);
            }else{
                toast("Could not send your prompt");
            }
            
        } catch (error) {
            toast("Something went wrong");
            
        }finally{
            setGeminiLoading(false);
        }
    }
    return (
        <Sidebar className={`${theme=='dark' ? "bg-zinc-900":""}`}>
        <SidebarContent className={`${theme=='dark' ? "bg-zinc-900":""}`}>
            <SidebarGroup>
                <SidebarGroupLabel className='text-xl font-semibold'>Dr. Writer</SidebarGroupLabel>
            </SidebarGroup>
            <SidebarContent>
                <div className="overflow-y-scroll no-scrollbar">
                    {responseList.length <= 0 ? (
                        <div className="px-4 text-zinc-500">
                        Enter prompt for Gemini response
                    </div>
                    ) : (
                        responseList.map((item, index) => (
                            <div key={index} className="space-y-2 m-2">

                        {/* Gemini message */}
                        <div className="p-2 rounded-md text-sm bg-zinc-200 text-black">
                            <Markdown>{item}</Markdown>
                        </div>
                        </div>
                    ))
                    )}
                </div>
            </SidebarContent>

        </SidebarContent>
        <SidebarFooter className={`${theme=='dark' ? "bg-zinc-900":""}`}>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                    {geminiLoading ?
                    <div>
                        Loading...
                    </div>
                    :
                    <div className={`${theme=='dark' ? "bg-zinc-900":""} flex`}>
                            <Input 
                            id="prompt"
                            type="text"
                            className={`${theme=='dark' ? "bg-zinc-900":""} outline-none`}
                            onChange={(e)=>setPrompt(e.target.value)} 
                            value={prompt}
                            placeholder='enter your prompt Gemini' 
                            onKeyDown={(e)=>{
                                if(e.key === 'Enter'){
                                    handleSend();
                                }
                            }}
                            />
                            <SendHorizontal onClick={handleSend} className="text-xl cursor-pointer m-2"/>
                        </div>
                    
                    }
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </SidebarFooter>
        </Sidebar>
);
}
