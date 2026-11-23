import { lazy, Suspense, useRef, useState } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDocumentData, isConflictError, updateDocumentApi } from "@/service/document";
import { addDocument, deleteDocument, syncData } from "@/service/IndexDb";
import { generateJSON, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { toast } from "@/components/ui/rare-toast";
import { useUser } from "@/context/UserContext";
import { DocumentDTO } from "@/types";
import { EditorSkeleton } from "@/components/PageSkeleton";

const PresentationEditor = lazy(() => import("./PresentationEditor"));

const normalizeContent = (content: any): JSONContent => {
  if (typeof content === "object" && content?.type === "doc") return content;
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      if (parsed?.type === "doc") return parsed;
    } catch {
      // Existing imported documents may contain HTML rather than JSON.
    }
    return generateJSON(content, [StarterKit, TextStyle, Color, TextAlign]);
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
};

type EditorProps = {
  onEditorReady: React.Dispatch<React.SetStateAction<any>>;
};

const Editor = ({ onEditorReady }: EditorProps) => {
  const { user, loading: userLoading } = useUser();
  const { id } = useParams();
  if (!id) return null;
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<DocumentDTO>({
    queryKey: ["document", id],
    enabled: !!user && !!id,
    queryFn: async (): Promise<DocumentDTO> => {
      // An offline copy is only pushed when the user may still edit; after access was lost it stays on this device.
      const synced = await syncData(id).catch((error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 403 || status === 404) return true as const;
        throw error;
      });

      const doc = await fetchDocumentData(id);

      return {
        ...doc,
        content: doc.kind === "presentation" ? doc.content : normalizeContent(doc.content),
        // The offline copy stays in IndexedDB until the user decides what to do with it.
        offlineConflict: synced === true ? undefined : synced.conflict && {
          title: synced.conflict.title,
          newContent: normalizeContent(synced.conflict.newContent),
          revision: synced.conflict.revision,
        },
      };
    },
  });

  // The revision our edits are based on. It is read once per document and then only advanced by our own
  // saves: a background refetch must never silently rebase unsaved edits onto someone else's newer version.
  const baseRevision = useRef<{ id: string; revision: number } | null>(null);
  if (data && baseRevision.current?.id !== id) baseRevision.current = { id, revision: data.revision ?? 0 };
  const conflicted = useRef(false);
  const [editorKey, setEditorKey] = useState(0);



  const updateDocument = async (content: JSONContent, title: string, automatic: boolean) => {
    if (conflicted.current && automatic) throw new Error("Document changed elsewhere");
    await queryClient.cancelQueries({ queryKey: ["document", id], exact: true });
    const revision = baseRevision.current?.revision ?? 0;
    let nextRevision = revision;
    try {
      nextRevision = await updateDocumentApi({ id, title, content, revision });
      baseRevision.current = { id, revision: nextRevision };
      conflicted.current = false;
      await deleteDocument(id);
      if (!automatic) toast.success("Document saved");
    } catch (error) {
      if (isConflictError(error)) {
        // Someone else saved first. Never retry on the newer revision: that would be a blind overwrite.
        // Keep the edits both in the editor and on this device, so reloading offers them back.
        conflicted.current = true;
        await addDocument({ _id: id, title, newContent: content, revision }).catch(() => {});
        toast.error("This document was changed elsewhere", { description: "Your edits were not saved over the newer version. Reload the page to review them." });
        throw new Error("Document changed elsewhere");
      }
      try {
        await addDocument({ _id: id, title, newContent: content, revision });
        toast.warning("Saved offline", { description: "Changes will sync when you reconnect." });
      } catch {
        toast.error("Could not save document");
        throw new Error("Could not save document");
      }
    }
    queryClient.setQueryData<DocumentDTO>(["document", id], (previous) => previous && ({ ...previous, title, content, revision: nextRevision }));
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const resolveOfflineConflict = async (keepOffline: boolean) => {
    const conflict = data?.offlineConflict;
    if (!conflict) return;
    try {
      if (keepOffline) {
        // An explicit choice by the user, so it is saved on top of the revision they just loaded.
        const revision = await updateDocumentApi({ id, title: conflict.title, content: conflict.newContent, revision: baseRevision.current?.revision ?? 0 });
        baseRevision.current = { id, revision };
        conflicted.current = false;
        await deleteDocument(id);
        queryClient.setQueryData<DocumentDTO>(["document", id], (previous) => previous && ({ ...previous, title: conflict.title, content: conflict.newContent, revision, offlineConflict: undefined }));
        setEditorKey((key) => key + 1);
        toast.success("Your offline edits were saved");
      } else {
        await deleteDocument(id);
        queryClient.setQueryData<DocumentDTO>(["document", id], (previous) => previous && ({ ...previous, offlineConflict: undefined }));
      }
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (error) {
      toast.error(isConflictError(error) ? "The document changed again. Reload and try once more." : "Could not resolve the offline edits");
    }
  };

  if (userLoading || isLoading) return <EditorSkeleton />;
  if (!user) return <p>User not logged in</p>;
  if (error) return <p>Failed to load document</p>;
  if (!data) return <p>No document data</p>;
  // Documents from before roles existed come back without one; the server still rejects writes from non-editors.
  const readOnly = !!data.role && data.role !== "owner" && data.role !== "editor";
  if (data.kind === "presentation") return <Suspense fallback={<EditorSkeleton />}><PresentationEditor key={id} id={id} title={data.title} pptx={data.pptx} revision={data.revision ?? 0} readOnly={readOnly} /></Suspense>;
  return (
    <div className="Editor flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      {data.offlineConflict && !readOnly && (
        <div role="alert" className="m-2 flex flex-wrap items-center gap-2 rounded border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <p className="min-w-0 flex-1">
            Edits made offline (“{data.offlineConflict.title}”) could not be merged because this document changed on the server. Nothing has been overwritten.
          </p>
          <button type="button" className="rounded border px-3 py-1 hover:bg-muted" onClick={() => resolveOfflineConflict(true)}>Replace with my offline edits</button>
          <button type="button" className="rounded border px-3 py-1 hover:bg-muted" onClick={() => resolveOfflineConflict(false)}>Keep the server version</button>
        </div>
      )}
      <SimpleEditor key={`${id}:${editorKey}`} title={data.title} content={data.content} onEditorReady={onEditorReady} updateDocument={updateDocument} role={data.role} />
    </div>
  );
};

export default Editor;
