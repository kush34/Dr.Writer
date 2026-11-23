import { FileText, Presentation } from "lucide-react";
import PresentationThumbnail from "./PresentationThumbnail";
import { Link } from "react-router-dom";

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
      {file.owned === false && <div className="mt-1 truncate text-xs text-muted-foreground">Shared by {file.sharedBy ?? "someone"}</div>}
      {status && <div className="mt-1 text-xs text-muted-foreground">{status}</div>}
    </div>
  </>;
  const classes = view === "card" ? "block overflow-hidden rounded-lg border bg-card text-card-foreground" : "flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground";
  return file.pending ? <div aria-busy="true" className={`${classes} opacity-70`}>{content}</div> : <Link to={`/home/${file._id}`} className={`${classes} transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring`}>{content}</Link>;
}
