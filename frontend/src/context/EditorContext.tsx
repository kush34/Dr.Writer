import { createContext, useContext } from "react";
import type { Editor } from "@tiptap/react";

type tSharedEditorContext = {
  presentation?: React.MutableRefObject<((command: string, model: string, onProgress: (status: string) => void, onPreview: (text: string) => void, onReview: (operations: unknown) => Promise<boolean>) => Promise<boolean>) | null>
  editor: Editor | null
  setEditor: React.Dispatch<React.SetStateAction<Editor | null>>
  reviewPending: boolean
  reviewPendingRef: React.MutableRefObject<boolean>
  setReviewPending: (pending: boolean) => void
  docMode: boolean
  setDocMode: React.Dispatch<React.SetStateAction<boolean>>
}
export const SharedEditorContext = createContext<tSharedEditorContext>({
  editor: null,
  setEditor: () => {},
  reviewPending: false,
  reviewPendingRef: { current: false },
  setReviewPending: () => {},
  docMode: false,
  setDocMode: () => {},
});


export const useSharedEditor = () => useContext(SharedEditorContext);
