import React, { useContext, useRef, useState } from 'react';
import Layout from './Layout';
import { UserContextProvider } from '../context/UserContext';
import Files  from '../components/Files';
import { Button } from "@/components/ui/button";
import apiClient from '@/service/axiosConfig';
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Description } from '@radix-ui/react-dialog';
import { ThemeContext } from '@/context/ThemeContext';

const Home = () => {
  const { toast } = useToast();
  const {theme} = useContext(ThemeContext)
  const [newTitle,setNewTitle] = useState();
  const hiddenFileInput = useRef(null);
  const handleAdd = async() =>{
    try{
      const responce  = await apiClient.post('/createDocument',{
        title: `${newTitle}`
      });
      if(responce.status == 200){
        toast({
          description: "New Document created",
        });
      }
    }catch(error){
      console.log(error);
    }
  }
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response  = await apiClient.post('/fileUpload',
          formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });
          if(response == 200){
            toast({
              Description:'file uploaded successfully'
            });
          }
    } catch (error) {
        console.error("Error uploading file:", error);
    }
};
  return (
    <UserContextProvider>
      <Layout>
          <Files>
          </Files>
          <div className="actions relative flex justify-end mr-12">
            <div>
              {/* <Button onClick={handleAdd} className='bg-zinc-900 border-2 border-zinc-900 text-white ' variant="outline">Add</Button> */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className={`${theme=='dark' ? "bg-zinc-800 text-white":"bg-zinc-900 text-white"}`} variant="outline">Add</Button>
                </DialogTrigger>
                <DialogContent className={`${theme=='dark' ? "bg-zinc-800 ":""} sm:max-w-[425px]`}>
                  <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
                    <DialogDescription>
                      Click save when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Title
                      </Label>
                      <Input
                        id="name"
                        defaultValue="New Document"
                        onChange={(e)=>setNewTitle(e.target.value)}
                        className='col-span-3 text-black'
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAdd}>Create</Button>
                    <input 
                    type="file"
                    className='hidden' 
                    ref={hiddenFileInput}
                    accept=".doc,.docx"
                    onChange={handleFileUpload}
                    name="" id="" />
                    <Button type="submit" onClick={(e)=>hiddenFileInput.current.click()}>Upload</Button>

                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>
          </div>
      </Layout>
    </UserContextProvider>
  )
}

export default Home