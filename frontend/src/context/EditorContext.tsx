import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/react";

type tSharedEditorContext = {
  editor: Editor | null
  setEditor: React.Dispatch<React.SetStateAction<Editor | null>>
}
export const SharedEditorContext = createContext<tSharedEditorContext>({
  editor: null,
  setEditor: () => {},
});


export const useSharedEditor = () => useContext(SharedEditorContext);
