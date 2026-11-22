import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Grid2X2, List } from "lucide-react";
import { fetchDocuments } from "@/service/document";
import FileCard, { tFile } from "./FileCard";
import { Button } from "@/components/ui/button";
import { FileListSkeleton } from "@/components/PageSkeleton";
import { useUser } from "@/context/UserContext";

export default function Files() {
  const { user, loading } = useUser();
  const [view, setView] = useState<"card" | "list">(() => localStorage.getItem("drwriter.fileView") === "list" ? "list" : "card");
  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"], queryFn: fetchDocuments, enabled: !loading && !!user,
    refetchInterval: (query) => query.state.data?.documents?.some((file: tFile) => file.uploadStatus === "queued" || file.uploadStatus === "processing") ? 3000 : false,
  });
  const files: tFile[] = data?.documents ?? [];
  const changeView = (next: "card" | "list") => { setView(next); localStorage.setItem("drwriter.fileView", next); };
  return <div className="space-y-5 p-4">
    <div className="flex items-center justify-between gap-4"><div><h1 className="text-xl font-semibold">Documents</h1>{isLoading ? <div className="mt-2 h-3 w-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" /> : <p className="text-sm text-muted-foreground">{files.length} {files.length === 1 ? "file" : "files"}</p>}</div>
      <div className="flex gap-1" aria-label="Document view">
        <Button type="button" variant={view === "card" ? "secondary" : "ghost"} size="icon" aria-label="Card view" aria-pressed={view === "card"} onClick={() => changeView("card")}><Grid2X2 /></Button>
        <Button type="button" variant={view === "list" ? "secondary" : "ghost"} size="icon" aria-label="List view" aria-pressed={view === "list"} onClick={() => changeView("list")}><List /></Button>
      </div>
    </div>
    {isLoading ? <FileListSkeleton view={view} /> : error ? <p role="alert">Could not load documents.</p> : files.length === 0 ? <p className="text-muted-foreground">No documents yet.</p> : <div className={view === "card" ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "space-y-2"}>{files.map((file) => <FileCard key={file._id} file={file} view={view} />)}</div>}
  </div>;
}
