
import React, { useState } from "react";
import { UserContextProvider } from "@/context/UserContext";
import EditorPageLayout from "./EditorPageLayout";
import Editor from "@/components/Editor";
import { SharedEditorContext } from "@/context/EditorContext";

const EditorPage = () => {
  const [editorInstance, setEditorInstance] = useState(null);

  return (
    <SharedEditorContext.Provider value={{ editor: editorInstance, setEditor: setEditorInstance }}>
      <UserContextProvider>
        <EditorPageLayout>
          <div id="editor" className="m-8">
            <Editor onEditorReady={setEditorInstance} />
          </div>
        </EditorPageLayout>
      </UserContextProvider>
    </SharedEditorContext.Provider>
  );
};

export default EditorPage;
