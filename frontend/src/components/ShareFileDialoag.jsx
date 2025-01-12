import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { UserPlus } from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useContext, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/service/axiosConfig";
import { useParams } from "react-router-dom";
import { ThemeContext } from "@/context/ThemeContext";

function ShareFileDialog() {
  const {theme} = useContext(ThemeContext)
    const [userToAddMail,setUserToAddMail] = useState('');
    const id = useParams();
    const [dialogFlag,setDialogFlag]=useState(false);
    const { toast } = useToast();
    
    const handleOkay = async ()=>{
        if(userToAddMail == ''){ 
            toast({
                description: "Please Enter Mail Address ",
            });
            return;
          }
          const response = await apiClient.post('/document/adduser',{
            file_id:id.id,
            userToAddMail,
          })
          console.log(response);
          if(response.status == 200){
            toast({
                description: `User Added : ${userToAddMail}`,
            });
        }
        setDialogFlag(false)
    }
  return (
    <Dialog open={dialogFlag} onOpenChange={setDialogFlag}>
      <DialogTrigger asChild>
        <Button className='border-2 text-black hover:bg-black hover:text-white ' variant="outline"> <UserPlus /></Button>
      </DialogTrigger>
      <DialogContent className={`${theme=='dark' ? "bg-zinc-900":""} sm:max-w-[425px]`}>
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Make changes to your document here. Click Add User when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Email
            </Label>
            <Input
              id="name"
              onChange = {(e)=>setUserToAddMail(e.target.value)}
              className="col-span-3 text-black"
              placeholder='enter mail of user to add'
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleOkay}>Add User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareFileDialog