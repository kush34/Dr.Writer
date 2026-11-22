import { lazy, Suspense } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDocumentData, updateDocumentApi } from "@/service/document";
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
      await syncData(id);

      const doc = await fetchDocumentData(id);

      return {
        ...doc,
        content: doc.kind === "presentation" ? doc.content : normalizeContent(doc.content),
      };
    },
  });



  const updateDocument = async (content: JSONContent, title: string, automatic: boolean) => {
    await queryClient.cancelQueries({ queryKey: ["document", id], exact: true });
    try {
      await updateDocumentApi({ id, title, content });
      await deleteDocument(id);
      if (!automatic) toast.success("Document saved");
    } catch {
      try {
        await addDocument({ _id: id, title, newContent: content });
        toast.warning("Saved offline", { description: "Changes will sync when you reconnect." });
      } catch {
        toast.error("Could not save document");
        throw new Error("Could not save document");
      }
    }
    queryClient.setQueryData<DocumentDTO>(["document", id], (previous) => previous && ({ ...previous, title, content }));
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  if (userLoading || isLoading) return <EditorSkeleton />;
  if (!user) return <p>User not logged in</p>;
  if (error) return <p>Failed to load document</p>;
  if (!data) return <p>No document data</p>;
  if (data.kind === "presentation") return <Suspense fallback={<EditorSkeleton />}><PresentationEditor key={id} id={id} title={data.title} pptx={data.pptx} revision={data.revision ?? 0} /></Suspense>;
  return (
    <div className="Editor flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      <SimpleEditor key={id} title={data.title} content={data.content} onEditorReady={onEditorReady} updateDocument={updateDocument} />
    </div>
  );
};

export default Editor;
