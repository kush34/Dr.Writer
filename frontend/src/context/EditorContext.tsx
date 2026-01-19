import { createContext, useContext } from "react";

type tSharedEditorContext = {
  editor: null
  setEditor: ()=>void
}
export const SharedEditorContext = createContext<tSharedEditorContext>({
  editor: null,
  setEditor: () => {},
});


export const useSharedEditor = () => useContext(SharedEditorContext);
