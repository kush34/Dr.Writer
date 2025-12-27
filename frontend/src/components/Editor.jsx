import { ThemeContext } from "@/context/ThemeContext";
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    onUpdate({ editor }) {
      if (!id || !user) return;
      socket.emit("text-changes", {
        content: editor.getJSON(),
        sender: user.email,
      }, id);
    },
  });
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

  // --- Hydrate editor exactly once ---
  useEffect(() => {
    if (!editor || !docContent) return;
    editor.commands.setContent(docContent, false);
  }, [editor, docContent]);

  // --- Socket collaboration ---
  useEffect(() => {
    if (!editor || !user || !id) return;

    socket.emit("enter", user.email, id);

    socket.on("text-changes", ({ content, sender }) => {
      if (sender === user.email) return;
      editor.commands.setContent(content, false);
    });

    return () => socket.off("text-changes");
  }, [editor, user, id]);

  // --- Save ---
  const updateDocument = async () => {
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
      <div className="nav flex justify-between">
        <div className="title flex font-semibold text-xl">
          <div className="my-2">{title || "Untitled"}</div>

          <div className="mx-2 text-sm text-zinc-400 hover:text-zinc-700 cursor-pointer">
            <EditFileDialog fileInfo={fileInfo} setTitle={setTitle} />
          </div>

          <ShareFileDialog />

          <Button
            onClick={window.print}
            variant="outline"
            className={`mx-2 ${theme ? "text-black" : ""}`}
          >
            <Printer />
          </Button>
        </div>

        <div className="m-2 flex gap-3 text-secondary">
          <Button onClick={updateDocument} variant="outline">
            Save
          </Button>
          <Button onClick={() => navigate("/home")} variant="outline">
            Back
          </Button>
        </div>
      </div>

      <EditorContent
        editor={editor}
        className="editor border rounded-md p-4"
        style={{ minHeight: "80vh" }}
      />
    </div>
  );
};
export default Editor