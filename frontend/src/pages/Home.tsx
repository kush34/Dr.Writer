import React, { useContext, useRef, useState } from "react";
import Layout from "./Layout";
import Files from "../components/Files";
import { Button } from "@/components/ui/button";
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDocument, uploadDocument } from "@/service/document";
import { toast } from "sonner";

const Home = () => {
  const queryClient = useQueryClient();

  const [newTitle, setNewTitle] = useState<string>("New Document");
  const [dialogOpen, setDialogOpen] = useState(false);
  const hiddenFileInput = useRef<HTMLInputElement | null>(null);

  const addPending = async (id: string, title: string) => {
    await queryClient.cancelQueries({ queryKey: ["documents"] });
    queryClient.setQueryData(["documents"], (old: any) => ({ ...old, documents: [{ _id: id, title, pending: true }, ...(old?.documents ?? [])] }));
  };
  const replacePending = (id: string, document?: any) => queryClient.setQueryData(["documents"], (old: any) => ({ ...old, documents: (old?.documents ?? []).flatMap((item: any) => item._id === id ? (document ? [document] : []) : [item]) }));

  // CREATE DOC
  const createMutation = useMutation({
    mutationFn: createDocument,
    onMutate: async (title) => {
      const id = `pending-${crypto.randomUUID()}`;
      await addPending(id, title);
      setDialogOpen(false);
      const toastId = toast.loading("Creating document…");
      return { id, toastId };
    },
    onSuccess: (result, _title, context) => {
      if (context) { replacePending(context.id, result.document); toast.success("Document created", { id: context.toastId }); }
    },
    onError: (_error, _title, context) => {
      if (context) { replacePending(context.id); toast.error("Could not create document", { id: context.toastId }); }
    },
  });

  // UPLOAD DOC
  const uploadMutation = useMutation({
    mutationFn: ({
      formData,
      onProgress,
    }: {
      formData: FormData;
      onProgress?: (progress: number) => void;
    }) => uploadDocument(formData, onProgress),
    onMutate: async ({ formData }) => {
      const file = formData.get("file") as File;
      const id = `pending-${crypto.randomUUID()}`;
      await addPending(id, file.name);
      setDialogOpen(false);
      return { id };
    },
    onSuccess: (result: any, _variables, context) => { if (context) replacePending(context.id, result.document); },
    onError: (_error, _variables, context) => { if (context) replacePending(context.id); },
  });


  const handleAdd = () => {
    if (!newTitle.trim()) { toast.error("Enter a document title"); return; }
    createMutation.mutate(newTitle.trim());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = `document-upload-${Date.now()}`;
    const formData = new FormData();
    formData.append("file", file);

    toast.loading("Uploading document", {
      id: toastId,
      description: `${file.name} • 0%`,
      duration: Infinity,
    });

    uploadMutation.mutate(
      {
        formData,
        onProgress: (progress) => {
          toast.loading("Uploading document", {
            id: toastId,
            description: `${file.name} • ${progress}%`,
            duration: Infinity,
          });
        },
      },
      {
        onSuccess: () => {
          toast.dismiss(toastId);
          toast.success("Upload received", {
            description: `${file.name} is being imported`,
          });
        },
        onError: (error) => {
          toast.dismiss(toastId);
          toast.error("Upload failed", {
            description:
              error instanceof Error
                ? error.message
                : "Unable to upload the selected file",
          });
        },
      }
    );

    e.target.value = "";
  };

  return (
    <Layout>
      <Files />
      <div className="flex justify-end mr-12">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary">Add</Button>
          </DialogTrigger>

          <DialogContent>
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
                  className="col-span-3"
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

              <Button
                disabled={uploadMutation.isPending}
                onClick={() => {
                  if (hiddenFileInput && hiddenFileInput.current)
                    hiddenFileInput.current.click();
                }}
              >
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
