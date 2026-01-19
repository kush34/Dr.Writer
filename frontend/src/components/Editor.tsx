import React, { useContext } from "react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { ThemeContext } from "@/context/ThemeContext";
import { UserContext } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDocumentData, updateDocumentApi } from "@/service/document";
import { addDocument, syncData } from "@/service/IndexDb";
import { generateJSON } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";

const normalizeContent = (content) => {
  if (typeof content === "object" && content?.type === "doc") return content;
  if (typeof content === "string") return generateJSON(content, [StarterKit, TextStyle, Color, TextAlign]);
  return { type: "doc", content: [{ type: "paragraph" }] };
};

const Editor = ({ onEditorReady }) => {
  const { theme } = useContext(ThemeContext);
  const { user, loading: userLoading } = useContext(UserContext);
  const { toast } = useToast();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["document", id],
    enabled: !!user && !!id,
    queryFn: async () => {
      await syncData(id);
      const doc = await fetchDocumentData(id);
      return { ...doc, content: normalizeContent(doc.content) };
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateDocumentApi,
    onSuccess: () => {
      toast({ description: "Changes saved" });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: async (_, variables) => {
      await addDocument({ _id: variables.id, title: variables.title, newContent: variables.content });
      toast({ description: "Saved offline" });
    },
  });

  const updateDocument = (editor) => {
    if (!editor || !data) return;
    updateMutation.mutate({ id, title: data.title, content: editor.getJSON() });
  };

  if (userLoading || isLoading) return <div className="h-screen flex items-center justify-center text-lg">Syncing document…</div>;
  if (!user) return <p>User not logged in</p>;
  if (error) return <p>Failed to load document</p>;

  return (
    <div>
      <SimpleEditor content={data.content} onEditorReady={onEditorReady} updateDocument={updateDocument} />
    </div>
  );
};

export default Editor;
