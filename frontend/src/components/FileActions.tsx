import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/rare-toast";
import { deleteDocument, setDocumentTags } from "@/service/document";
import { addTag, MAX_TAGS } from "@/service/tags";
import type { tFile } from "./FileCard";

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/** Per-document menu on Home: owners and editors edit tags, only the owner can delete. */
export default function FileActions({ file }: { file: tFile }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<"tags" | "delete" | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [problem, setProblem] = useState("");
  const isOwner = file.role === "owner";
  const close = () => setDialog(null);

  const saveTags = useMutation({
    mutationFn: (tags: string[]) => setDocumentTags(file._id, tags),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast.success("Tags updated"); close(); },
    onError: (error) => toast.error("Could not update tags", { description: errorMessage(error, "Try again.") }),
  });
  const remove = useMutation({
    mutationFn: () => deleteDocument(file._id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast.success("Document deleted"); close(); },
    onError: (error) => toast.error("Could not delete document", { description: errorMessage(error, "Try again.") }),
  });

  const openTags = () => { setDraft(file.tags ?? []); setInput(""); setProblem(""); setDialog("tags"); };
  const submitInput = () => {
    if (!input.trim()) return;
    const result = addTag(draft, input);
    if ("error" in result) return setProblem(result.error);
    setDraft(result.tags); setInput(""); setProblem("");
  };

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" size="icon" className="size-7 shadow-sm" aria-label={`Actions for ${file.title}`}><MoreHorizontal /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={openTags}><Tag /> Edit tags</DropdownMenuItem>
        {isOwner && <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDialog("delete")}><Trash2 /> Delete</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={dialog === "tags"} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Tags</DialogTitle>
          <DialogDescription>Labels for “{file.title}”. Everyone it is shared with sees them. Up to {MAX_TAGS} tags.</DialogDescription>
        </DialogHeader>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); submitInput(); }}>
          <Input value={input} onChange={(event) => { setInput(event.target.value); setProblem(""); }} placeholder="Add a tag" aria-label="New tag" maxLength={60} />
          <Button type="submit" variant="secondary">Add</Button>
        </form>
        {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
        {draft.length === 0 ? <p className="text-sm text-muted-foreground">No tags yet.</p> :
          <ul className="flex flex-wrap gap-2" aria-label="Current tags">{draft.map((tag) =>
            <li key={tag} className="flex items-center gap-1 rounded-full border bg-muted py-0.5 pl-2.5 pr-1 text-sm">
              {tag}<button type="button" className="rounded-full p-0.5 hover:bg-accent" aria-label={`Remove tag ${tag}`} onClick={() => setDraft(draft.filter((item) => item !== tag))}><X className="size-3" /></button>
            </li>)}</ul>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button type="button" disabled={saveTags.isPending} onClick={() => saveTags.mutate(draft)}>{saveTags.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={dialog === "delete"} onOpenChange={(open) => !open && !remove.isPending && close()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete “{file.title}”?</DialogTitle>
          <DialogDescription>This permanently deletes the document, its chat history and uploaded images for everyone it is shared with. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={remove.isPending} onClick={close}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? "Deleting…" : "Delete document"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
