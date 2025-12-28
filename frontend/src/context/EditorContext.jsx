import { createContext, useContext } from "react";

export const SharedEditorContext = createContext({
  editor: null,
  setEditor: () => {},
});


export const useSharedEditor = () => useContext(SharedEditorContext);
