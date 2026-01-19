import { createContext, useContext } from "react";

type tSharedEditorContext = {
  editor: null
  setEditor: React.Dispatch<React.SetStateAction<null>>
}
export const SharedEditorContext = createContext<tSharedEditorContext>({
  editor: null,
  setEditor: () => {},
});


export const useSharedEditor = () => useContext(SharedEditorContext);
