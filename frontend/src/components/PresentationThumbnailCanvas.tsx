import { PptxEditor } from "@pptx-editor.dev/react";
import "@pptx-editor.dev/core/styles/editor.css";
import "./PresentationThumbnail.css";
import { useTheme } from "@/context/ThemeContext";

export default function PresentationThumbnailCanvas({ bytes }: { bytes: Uint8Array }) {
  const { theme } = useTheme();
  return <PptxEditor
    className="presentation-thumbnail-editor"
    document={bytes}
    mode="view"
    colorMode={theme}
    toolbar={false}
    menu={false}
    contextMenu={false}
    slideRail={false}
    notesPane={false}
  />;
}
