import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

export type tFile = {
  _id: string;
  title: string;
  preview?: string;
  uploadStatus?: string;
  pending?: boolean;
};

export default function FileCard({ file, view }: { file: tFile; view: "card" | "list" }) {
  const status = file.pending ? "Saving…" : file.uploadStatus === "failed" ? "Import failed" : file.uploadStatus === "queued" || file.uploadStatus === "processing" ? "Importing…" : "";
  const content = <>
    {view === "card" ? <div className="h-36 overflow-hidden rounded-t-lg border-b bg-muted/50 p-4" aria-hidden="true">
      <div className="mx-auto h-full max-w-36 overflow-hidden rounded-t-sm bg-background px-3 pt-3 text-[8px] leading-relaxed text-foreground shadow-sm"><strong className="mb-2 block truncate text-[9px]">{file.title}</strong>{file.preview || <span className="text-muted-foreground">Empty document</span>}</div>
    </div> : <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    <div className={view === "card" ? "p-3" : "min-w-0 flex-1"}>
      <div className="truncate font-medium">{file.title}</div>
      {status && <div className="mt-1 text-xs text-muted-foreground">{status}</div>}
    </div>
  </>;
  const classes = view === "card" ? "block overflow-hidden rounded-lg border bg-card text-card-foreground" : "flex items-center gap-3 rounded-lg border bg-card p-3 text-card-foreground";
  return file.pending ? <div aria-busy="true" className={`${classes} opacity-70`}>{content}</div> : <Link to={`/home/${file._id}`} className={`${classes} transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring`}>{content}</Link>;
}
