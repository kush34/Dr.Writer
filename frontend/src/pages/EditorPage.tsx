
import { useParams } from "react-router-dom";
import React, { useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { UserContextProvider } from "@/context/UserContext";
import EditorPageLayout from "./EditorPageLayout";
import Editor from "@/components/Editor";
import { SharedEditorContext } from "@/context/EditorContext";

const EditorPage = () => {
  const { id } = useParams();
  return <EditorWorkspace key={id} />;
};

const EditorWorkspace = () => {
  const presentation = React.useRef<((command: string, model: string) => Promise<void>) | null>(null);
  const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(null);

  return (
    <SharedEditorContext.Provider value={{ presentation, editor: editorInstance, setEditor: setEditorInstance }}>
      <UserContextProvider>
        <EditorPageLayout>
          <div id="editor" className="flex h-full min-h-0 w-full min-w-0 overflow-hidden">
            <Editor onEditorReady={setEditorInstance} />
          </div>
        </EditorPageLayout>
      </UserContextProvider>
    </SharedEditorContext.Provider>
  );
};

export default EditorPage;
