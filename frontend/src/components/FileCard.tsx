import { FileText } from "lucide-react";
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
};

export default function FileCard({ file, view }: { file: tFile; view: "card" | "list" }) {
  const status = file.pending ? "Saving…" : file.uploadStatus === "failed" ? "Import failed" : file.uploadStatus === "queued" || file.uploadStatus === "processing" ? "Importing…" : "";
  const timestamp = file.editedAt || file.createdAt;
  const date = timestamp ? new Date(timestamp) : null;
  const content = <>
    {view === "card" ? <div className="h-36 overflow-hidden rounded-t-lg border-b bg-background p-2 text-[8px] leading-relaxed text-foreground" aria-hidden="true">
      <strong className="mb-2 block truncate text-[9px]">{file.title}</strong>{file.kind === "presentation" ? "PowerPoint presentation" : file.preview || <span className="text-muted-foreground">Empty document</span>}
    </div> : <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    <div className={view === "card" ? "p-3" : "min-w-0 flex-1"}>
      <div className="truncate font-medium">{file.title}</div>
      {date && !Number.isNaN(date.getTime()) && <div className="mt-1 text-xs text-muted-foreground">{file.editedAt ? "Edited" : "Created"} <time dateTime={date.toISOString()}>{date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></div>}
      {status && <div className="mt-1 text-xs text-muted-foreground">{status}</div>}
    </div>
  </>;
  const classes = view === "card" ? "block overflow-hidden rounded-lg border bg-card text-card-foreground" : "flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground";
  return file.pending ? <div aria-busy="true" className={`${classes} opacity-70`}>{content}</div> : <Link to={`/home/${file._id}`} className={`${classes} transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring`}>{content}</Link>;
}
