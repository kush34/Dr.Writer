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
import { SendHorizontal } from 'lucide-react';
import { Input } from "@/components/ui/input";
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
    const [geminiLoading,setGeminiLoading] = useState(true);
    const [responseList,setResponseList] = useState([]);
    // const handleAddContent = ()=>{
        
    // }
    const handleSend = async ()=>{
        if(prompt == '') return;
        setGeminiLoading(false);
        setPrompt('');
        const response = await apiClient.post('/document/userprompt',{
            userPrompt:prompt
        });
        // console.log(response);
        if(response.status == 200){
            setResponseList([...responseList,response.data])
            setGeminiLoading(true);
        }else{
            toast("Could not send your prompt");
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
                    {responseList.length<=0 ? 
                        <div className='px-4 text-zinc-500'>Enter prompt for Gemini response</div>
                        
                    :
                    (responseList.map((promptAns,index)=>{
                        return (
                        <div className="m-2 p-2 rounded-md text-sm text-black bg-zinc-200" key={index}>
                            <Markdown>
                            {promptAns}
                            </Markdown>
                            {/* <div className="btn  flex justify-end ">
                                <Plus onClick={handleAddContent} className="text-zinc-500 text-sm hover:text-zinc-900 duration-10sidebar0 hover:scale-125 ease-out"/>
                                </div> */}
                        </div>
                        )
                    }))
                    }
                </div>
            </SidebarContent>
        </SidebarContent>
        <SidebarFooter className={`${theme=='dark' ? "bg-zinc-900":""}`}>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                    {geminiLoading ?
                        <div className={`${theme=='dark' ? "bg-zinc-900":""} flex`}>
                            <Input 
                            id="prompt"
                            type="text"
                            className={`${theme=='dark' ? "bg-zinc-900":""}`}
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
                    :
                    <div>
                        Loading...
                    </div>
                    }
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </SidebarFooter>
        </Sidebar>
);
}
