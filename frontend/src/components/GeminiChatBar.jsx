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


export function GeminiChatBar() {
    const { user, loading } = useContext(UserContext);
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
        const response = await apiClient.post('/userprompt',{
            userPrompt:prompt
        });
        // console.log(response);
        if(response.status == 200){
            setResponseList([...responseList,response.data])
            setGeminiLoading(true);
        }else{

        }
    }
    return (
        <Sidebar>
        <SidebarContent>
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
                            {promptAns}
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
        <SidebarFooter>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                    {geminiLoading ?
                    <div className="m-2">
                        <Label htmlFor="m-4 Gemini Prompt">Prompt</Label>
                        <div className="flex" >
                            <Input 
                            id="prompt"
                            type="text"
                            onChange={(e)=>setPrompt(e.target.value)} 
                            value={prompt}
                            placeholder='enter your prompt Gemini' />
                            <SendHorizontal onClick={handleSend} className="text-xl cursor-pointer m-2"/>
                        </div>
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
