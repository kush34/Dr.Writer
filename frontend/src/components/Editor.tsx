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
    onSuccess: () => {
      toast.success("Saved", { description: "Changes saved" });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: async (_, variables) => {
      await addDocument({ _id: variables.id, title: variables.title, newContent: variables.content });
      toast.success("Saved", { description: "Saved offline" });
    },
  });

  const updateDocument = (editor: tEditor) => {
    if (!editor || !data) return;
    updateMutation.mutate({ id, title: data.title, content: editor.getJSON() });
  };

  if (userLoading || isLoading) return <div className="h-screen flex items-center justify-center text-lg">Syncing document…</div>;
  if (!user) return <p>User not logged in</p>;
  if (error) return <p>Failed to load document</p>;
  if(!data) return <p>No document data</p>;
  return (
    <div className="Editor">
      <SimpleEditor content={data.content} onEditorReady={onEditorReady} updateDocument={updateDocument} />
    </div>
  );
};

export default Editor;
