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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react";

function EditFileDialog({fileInfo,setTitle}) {
    const [fileTitle,setFileTitle] = useState(fileInfo?.title || null);
    const [newFileTitle,setNewFileTitle] = useState(fileInfo?.title || null);
    const [dialogFlag,setDialogFlag]=useState(false);
    const handleSave = ()=>{
        if(newFileTitle != fileTitle){
            fileInfo.title = newFileTitle;
            setTitle(newFileTitle);
            console.log(fileInfo.title);
            setDialogFlag(false)
        }
    }
  return (
    <Dialog open={dialogFlag} onOpenChange={setDialogFlag}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit  </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            Make changes to your document here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              defaultValue={`${fileInfo ? fileInfo.title : `file title`}`}
              onChange = {(e)=>setNewFileTitle(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Okay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditFileDialog