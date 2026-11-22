import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDocumentData, updateDocumentApi } from "@/service/document";
import { addDocument, syncData } from "@/service/IndexDb";
import { Editor as tEditor, generateJSON, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
import { DocumentDTO } from "@/types";
import { EditorSkeleton } from "@/components/PageSkeleton";

const normalizeContent = (content: any): JSONContent => {
  if (typeof content === "object" && content?.type === "doc") return content;
  if (typeof content === "string") return generateJSON(content, [StarterKit, TextStyle, Color, TextAlign]);
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
        content: normalizeContent(doc.content),
      };
    },
  });



  const updateMutation = useMutation({
    mutationFn: updateDocumentApi,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["documents"] });
      queryClient.setQueryData(["documents"], (old: any) => old && ({ ...old, documents: old.documents.map((item: any) => item._id === variables.id ? { ...item, title: variables.title, editedAt: new Date().toISOString() } : item) }));
      return { toastId: toast.loading("Saving document…") };
    },
    onSuccess: (_result, _variables, context) => {
      toast.success("Document saved", { id: context?.toastId });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: async (_, variables, context) => {
      try {
        await addDocument({ _id: variables.id, title: variables.title, newContent: variables.content });
        toast.warning("Saved offline", { id: context?.toastId, description: "Changes will sync when you reconnect." });
      } catch {
        toast.error("Could not save document", { id: context?.toastId });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      }
    },
  });

  const updateDocument = (editor: tEditor, title: string) => {
    if (!editor || !data) return;
    updateMutation.mutate({ id, title: title, content: editor.getJSON() });
  };

  if (userLoading || isLoading) return <EditorSkeleton />;
  if (!user) return <p>User not logged in</p>;
  if (error) return <p>Failed to load document</p>;
  if (!data) return <p>No document data</p>;
  return (
    <div className="Editor flex h-full min-h-0 w-full min-w-0 overflow-hidden">
      <SimpleEditor title={data.title} content={data.content} onEditorReady={onEditorReady} updateDocument={updateDocument} />
    </div>
  );
};

export default Editor;
