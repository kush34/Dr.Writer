import React, { useContext, useRef, useState } from "react";
import Layout from "./Layout";
import Files from "../components/Files";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThemeContext } from "@/context/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createDocument, uploadDocument } from "@/service/document";

const Home = () => {
  const { toast } = useToast();
  const { theme } = useContext(ThemeContext);
  const queryClient = useQueryClient();

  const [newTitle, setNewTitle] = useState("New Document");
  const hiddenFileInput = useRef(null);

  // CREATE DOC
  const createMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ description: "New document created" });
    },
  });

  // UPLOAD DOC
  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast({ description: "File uploaded successfully" });
    },
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate(newTitle);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    uploadMutation.mutate(formData);
  };

  return (
    <Layout>
      <Files />

      <div className="flex justify-end mr-12">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-green-400">Add</Button>
          </DialogTrigger>

          <DialogContent className={theme === "dark" ? "bg-zinc-800" : ""}>
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>Click save when you're done.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Title</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="col-span-3 text-black"
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleAdd} disabled={createMutation.isPending}>
                Create
              </Button>

              <input
                type="file"
                hidden
                ref={hiddenFileInput}
                accept=".doc,.docx"
                onChange={handleFileUpload}
              />

              <Button onClick={() => hiddenFileInput.current.click()}>
                Upload
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Home;
