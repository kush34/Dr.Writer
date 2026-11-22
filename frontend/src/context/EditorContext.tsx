import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/react";

type tSharedEditorContext = {
  presentation?: React.MutableRefObject<((command: string, model: string) => Promise<void>) | null>
  editor: Editor | null
  setEditor: React.Dispatch<React.SetStateAction<Editor | null>>
  docMode: boolean
  setDocMode: React.Dispatch<React.SetStateAction<boolean>>
}
export const SharedEditorContext = createContext<tSharedEditorContext>({
  editor: null,
  setEditor: () => {},
  docMode: false,
  setDocMode: () => {},
});


export const useSharedEditor = () => useContext(SharedEditorContext);
