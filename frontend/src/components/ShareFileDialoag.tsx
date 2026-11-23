import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, X } from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/rare-toast";
import { fetchDocumentMembers, removeDocumentMember, shareDocument, type ShareRole } from "@/service/document";

const ROLE_LABELS: Record<ShareRole, string> = { editor: "Editor", commenter: "Commenter", viewer: "Viewer" };
const ROLE_HELP: Record<ShareRole, string> = {
  editor: "Can edit, save and use AI edits.",
  commenter: "Can read for now. Comments are not available yet, so this is the same as Viewer.",
  viewer: "Can read and ask questions, but not change anything.",
};

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

/** Owner-only dialog: share the document with a role, change a role, or remove someone. */
function ShareFileDialog() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>("editor");

  const membersKey = ["document-members", id];
  const { data: members, isLoading, error } = useQuery({
    queryKey: membersKey,
    queryFn: () => fetchDocumentMembers(id!),
    enabled: open && !!id,
  });

  const share = useMutation({
    mutationFn: (input: { email: string; role: ShareRole }) => shareDocument(id!, input.email, input.role),
    onSuccess: (_data, input) => {
      toast.success("Access updated", { description: `${input.email} is now ${ROLE_LABELS[input.role].toLowerCase()}` });
      queryClient.invalidateQueries({ queryKey: membersKey });
    },
    onError: (err) => toast.error("Could not share document", { description: errorMessage(err, "Check the email address and try again.") }),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => removeDocumentMember(id!, userId),
    onSuccess: () => {
      toast.success("Access removed");
      queryClient.invalidateQueries({ queryKey: membersKey });
    },
    onError: (err) => toast.error("Could not remove access", { description: errorMessage(err, "Try again.") }),
  });

  const handleAdd = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Failed", { description: "Please enter an email address" });
      return;
    }
    share.mutate({ email: trimmed, role }, { onSuccess: () => setEmail('') });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className='border' variant="outline" aria-label="Share document"> <Plus /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>Choose what the person can do. Adding someone who already has access changes their role.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); handleAdd(); }}>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="share-email" className="text-right">Email</Label>
            <Input id="share-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" placeholder="enter email of the person to add" />
          </div>
          <div className="grid grid-cols-4 items-center gap-3">
            <Label htmlFor="share-role" className="text-right">Role</Label>
            <select id="share-role" value={role} onChange={(e) => setRole(e.target.value as ShareRole)} className="col-span-3 h-9 rounded-md border bg-background px-2 text-sm">
              {(Object.keys(ROLE_LABELS) as ShareRole[]).map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
            </select>
            <p className="col-span-3 col-start-2 text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={share.isPending}>{share.isPending ? "Adding…" : "Add user"}</Button>
          </div>
        </form>
        <section aria-label="People with access" className="space-y-2">
          <h3 className="text-sm font-medium">People with access</h3>
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : error ? <p role="alert" className="text-sm text-destructive">Could not load the list of people.</p>
            : <ul className="max-h-56 space-y-1 overflow-y-auto">
              {members?.map((member) => (
                <li key={member.userId} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">{member.name ? `${member.name} · ` : ""}{member.email}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{member.role === "owner" ? "Owner" : ROLE_LABELS[member.role]}</span>
                  {member.role !== "owner" && (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${member.email}`} title="Remove access" disabled={remove.isPending} onClick={() => remove.mutate(member.userId)}>
                      <X />
                    </Button>
                  )}
                </li>
              ))}
            </ul>}
        </section>
      </DialogContent>
    </Dialog>
  )
}

export default ShareFileDialog
