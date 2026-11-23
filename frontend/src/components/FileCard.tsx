import { FileText, Presentation } from "lucide-react";
import PresentationThumbnail from "./PresentationThumbnail";
import { Link } from "react-router-dom";
import FileActions from "./FileActions";

export type tFile = {
  _id: string;
  title: string;
  kind?: string;
  preview?: string;
  editedAt?: string;
  createdAt?: string;
  uploadStatus?: string;
  pending?: boolean;
  owned?: boolean;
  sharedBy?: string;
  role?: "owner" | "editor" | "commenter" | "viewer";
  tags?: string[];
};

export default function FileCard({ file, view }: { file: tFile; view: "card" | "list" }) {
  const isPresentation = file.kind === "presentation";
  const TypeIcon = isPresentation ? Presentation : FileText;
  const status = file.pending ? "Saving…" : file.uploadStatus === "failed" ? "Import failed" : file.uploadStatus === "queued" || file.uploadStatus === "processing" ? "Importing…" : "";
  const timestamp = file.editedAt || file.createdAt;
  const date = timestamp ? new Date(timestamp) : null;
  const content = <>
    {view === "card" ? <div className="relative h-36 overflow-hidden rounded-t-lg border-b bg-background text-foreground" aria-hidden="true">
      {isPresentation ? <PresentationThumbnail id={file._id} /> : <div className="h-full overflow-hidden p-2 text-[8px] leading-relaxed">
        <strong className="mb-2 block truncate text-[9px]">{file.title}</strong>{file.preview || <span className="text-muted-foreground">Empty document</span>}
      </div>}
      <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-background/90 px-2 py-1 text-[10px] font-medium shadow-sm">
        <TypeIcon className="size-3" />{isPresentation ? "Presentation" : "Document"}
      </span>
    </div> : <TypeIcon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    <div className={view === "card" ? "p-3" : "min-w-0 flex-1"}>
      <div className="truncate font-medium">{file.title}</div>
      {date && !Number.isNaN(date.getTime()) && <div className="mt-1 text-xs text-muted-foreground">{file.editedAt ? "Edited" : "Created"} <time dateTime={date.toISOString()}>{date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></div>}
      {file.owned === false && <div className="mt-1 truncate text-xs text-muted-foreground">Shared by {file.sharedBy ?? "someone"}{file.role && file.role !== "owner" && <> · {file.role === "editor" ? "Can edit" : file.role === "commenter" ? "Can comment" : "View only"}</>}</div>}
      {status && <div className="mt-1 text-xs text-muted-foreground">{status}</div>}
      {!!file.tags?.length && <ul className="mt-2 flex flex-wrap gap-1" aria-label="Tags">
        {file.tags.slice(0, 3).map((tag) => <li key={tag} className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{tag}</li>)}
        {file.tags.length > 3 && <li className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">+{file.tags.length - 3}</li>}
      </ul>}
    </div>
  </>;
  const classes = view === "card" ? "block overflow-hidden rounded-lg border bg-card text-card-foreground" : "flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground";
  if (file.pending) return <div aria-busy="true" className={`${classes} opacity-70`}>{content}</div>;
  const canManage = file.role === "owner" || file.role === "editor";
  return <div className="relative">
    <Link to={`/home/${file._id}`} className={`${classes} transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${canManage && view === "list" ? "pr-14" : ""}`}>{content}</Link>
    {canManage && <div className={view === "card" ? "absolute left-2 top-2" : "absolute right-3 top-1/2 -translate-y-1/2"}><FileActions file={file} /></div>}
  </div>;
}
