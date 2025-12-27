import { ThemeContext } from "@/context/ThemeContext";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { UserContext } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import apiClient from "@/service/axiosConfig";
import socket from "@/service/socket";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, generateJSON, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShareFileDialog from "./ShareFileDialoag";
import EditFileDialog from "./EditFileDialog";
import { Button } from "./ui/button";
import { Printer } from "lucide-react";
import { addDocument, syncData } from "@/service/IndexDb";

const Editor = () => {
  const { theme } = useContext(ThemeContext);
  const { user, loading: userLoading } = useContext(UserContext);
  const { toast } = useToast();

  const navigate = useNavigate();
  const { id } = useParams();

  const [fileInfo, setFileInfo] = useState(null);
  const [title, setTitle] = useState("");
  const [docContent, setDocContent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const normalizeContent = (content) => {
    // already ProseMirror JSON
    if (typeof content === "object" && content?.type === "doc") {
      return content;
    }

    // legacy HTML (React-Quill)
    if (typeof content === "string") {
      return generateJSON(content, [
        StarterKit,
        TextStyle,
        Color,
        TextAlign,
      ]);
    }

    // fallback empty doc
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  };

  // --- Fetch document from server ---
  const getContent = async () => {
    const response = await apiClient.post("/document/documentData", {
      file_id: id,
    });

    const { title, content } = response.data;

    setFileInfo(response.data);
    setTitle(title);

    // normalize old HTML → JSON
    const normalized = normalizeContent(content);
    setDocContent(normalized);
  };

  const updateDocument = async (editor) => {
    if (!editor) return;

    try {
      await apiClient.post("/document/documentUpdate", {
        file_id: id,
        title,
        newContent: editor.getJSON(),
      });
      toast({ description: "Changes saved" });
    } catch {
      await addDocument({
        _id: id,
        title,
        newContent: editor.getJSON(),
      });
      toast({ description: "Saved offline" });
    }
  };

  // --- Sync + fetch lifecycle ---
  useEffect(() => {
    if (!user || !id) return;

    (async () => {
      try {
        setIsLoading(true);
        // attempt offline sync
        // always fetch fresh server state
        await syncData(id);
        await getContent();
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not load document",
        });
        console.log(error)
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user, id]);

  // --- Hard loading guards ---
  if (userLoading || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-lg">
        Syncing document…
      </div>
    );
  }

  if (!user) return <p>User not logged in</p>;

  return (
    <div>
      <SimpleEditor
        content={docContent}
        updateDocument={updateDocument}
        className="my-tiptap-ui"
      />
    </div>
  );
};
export default Editor