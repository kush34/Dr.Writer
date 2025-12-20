import React, { useContext, useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";


import { UserContext } from "@/context/UserContext";
import { ThemeContext } from "@/context/ThemeContext";
import apiClient from "@/service/axiosConfig";
import socket from "@/service/socket";

import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import EditFileDialog from "../components/EditFileDialog";
import ShareFileDialog from "../components/ShareFileDialoag";

import "../service/IndexDb";
import { addDocument, syncData } from "../service/IndexDb";

const Editor = () => {
  const { theme } = useContext(ThemeContext);
  const { user, loading } = useContext(UserContext);
  const { toast } = useToast();

  const navigate = useNavigate();
  const { id } = useParams();

  const [fileInfo, setFileInfo] = useState(null);
  const [title, setTitle] = useState("");
  const [docContent, setDocContent] = useState(null);


  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: docContent,
    onUpdate({ editor }) {
      const json = editor.getJSON();
      socket.emit("text-changes", json, id);
    },
  });


  const getContent = async () => {
    try {
      const response = await apiClient.post("/document/documentData", {
        file_id: id,
      });
      if (response.status === 200) {
        setFileInfo(response.data);
        setTitle(response.data.title);
        setDocContent(response.data.content); // JSON
        console.log(response.data)
      }
    } catch (error) {
      if (error) {
        toast({
          title: "Error",
          description: "Could not load Document Content"
        })
      }
    }
  };

  const updateDocument = async () => {
    const json = editor?.getJSON();

    try {
      await apiClient.post("/document/documentUpdate", {
        file_id: id,
        title,
        newContent: json,
      });

      toast({ description: "Changes saved" });
    } catch {
      await addDocument({
        _id: id,
        title,
        newContent: json,
      });

      toast({ description: "Changes saved offline" });
    }
  };


  useEffect(() => {
    if (!user || !id) return;

    (async () => {
      const synced = await syncData(id);
      if (synced) await getContent();
    })();
  }, [user, id]);
  useEffect(() => {
    if (!editor || !docContent) return;

    editor.commands.setContent(docContent, false);
  }, [editor, docContent]);

  useEffect(() => {
    if (!editor || !user || !id) return;

    socket.emit("enter", user.email, id);

    socket.on("text-changes", (json) => {
      editor.commands.setContent(json, false);
    });

    return () => {
      socket.off("text-changes");
    };
  }, [editor, user, id]);


  if (loading) return <p>Loading...</p>;
  if (!user) return <p>User not logged in</p>;

  return (
    <div>
      <div className="nav flex justify-between">
        <div className="title flex font-semibold text-xl">
          <div className="my-2">{fileInfo?.title ?? "Title"}</div>

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

        <div className="m-2 flex gap-3 text-black">
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

export default Editor;
