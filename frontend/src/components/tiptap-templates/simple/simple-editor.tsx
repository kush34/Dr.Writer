"use client"

import { SetStateAction, useEffect, useRef, useState } from "react"
import { Editor, EditorContent, EditorContext, JSONContent, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { closeSingleQuote, Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"
import { useWindowSize } from "@/hooks/use-window-size"
import { useCursorVisibility } from "@/hooks/use-cursor-visibility"

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"

// --- Lib ---
import { MAX_FILE_SIZE } from "@/lib/tiptap-utils"
import { uploadDocumentImage } from "@/service/document"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

import content from "@/components/tiptap-templates/simple/data/content.json"
import { useBlocker, useNavigate, useParams } from "react-router-dom"
import { useUser } from "@/context/UserContext"
import socket from "@/service/socket"
import { Plus, Save, SaveAll, SaveIcon, Share, Share2, Share2Icon, Undo2 } from "lucide-react"
import ShareFileDialog from "@/components/ShareFileDialoag"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { createDocx } from "./export-docx"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { setAutosave, useAutosave } from "@/config/autosave"

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

type SimpleEditorProps = {
  content: JSONContent;
  title: string;
  onEditorReady?: (editor: Editor) => void;
  updateDocument: (content: JSONContent, title: string, automatic: boolean) => Promise<void>;
};


export function SimpleEditor({ title, content, onEditorReady, updateDocument }: SimpleEditorProps) {
  const isMobile = useIsBreakpoint()
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, loading: userLoading } = useUser();
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const [localTitle, setLocalTitle] = useState(title);
  const autosave = useAutosave()
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const attemptedSnapshot = useRef<string | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const initializedEditor = useRef<Editor | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: (file, onProgress, abortSignal) => {
          if (!id) {
            throw new Error("Document id is required for image uploads");
          }

          return uploadDocumentImage(id, file, onProgress, abortSignal);
        },
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content,
    onTransaction: ({ transaction }) => {
      if (transaction.docChanged) setRevision((value) => value + 1)
    },
  })

  const snapshot = editor ? JSON.stringify({ title: localTitle, content: editor.getJSON() }) : null
  const dirty = savedSnapshot !== null && snapshot !== savedSnapshot
  const blocker = useBlocker(dirty || saving)

  const save = async (automatic: boolean) => {
    if (!editor || savingRef.current || !snapshot) return
    const currentContent = editor.getJSON()
    const currentTitle = localTitle
    savingRef.current = true
    setSaving(true)
    attemptedSnapshot.current = snapshot
    try {
      await updateDocument(currentContent, currentTitle, automatic)
      setSavedSnapshot(snapshot)
    } catch {
      // The save handler reports the failure; keep the document dirty.
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!autosave || !dirty || saving || snapshot === attemptedSnapshot.current) return
    const timer = window.setTimeout(() => void save(true), 1000)
    return () => window.clearTimeout(timer)
  }, [autosave, dirty, saving, snapshot, revision])

  useEffect(() => {
    if (!dirty && !saving) return
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [dirty, saving])

  const exportDocument = async (format: "pdf" | "docx") => {
    if (!editor) return
    const documentTitle = localTitle.trim() || "Untitled document"
    const container = document.createElement("div")
    container.innerHTML = editor.getHTML()

    try {
      if (format === "docx") {
        const file = await createDocx(editor.getJSON())
        const url = URL.createObjectURL(file)
        const link = document.createElement("a")
        link.href = url
        link.download = `${documentTitle.replace(/[\\/:*?"<>|]/g, "_")}.docx`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else {
        const frame = document.createElement("iframe")
        frame.style.cssText = "position:fixed;width:0;height:0;border:0"
        document.body.appendChild(frame)
        const printDocument = frame.contentDocument
        if (!printDocument || !frame.contentWindow) {
          frame.remove()
          throw new Error("Could not open print preview")
        }
        printDocument.open()
        printDocument.write('<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;line-height:1.5;margin:2cm}img{max-width:100%;height:auto}pre{white-space:pre-wrap}blockquote{border-left:3px solid #ccc;padding-left:1em}</style></head><body></body></html>')
        printDocument.close()
        printDocument.title = documentTitle
        printDocument.body.appendChild(container)
        await Promise.all(Array.from(printDocument.images).map((image) => image.decode().catch(() => {})))
        frame.contentWindow.onafterprint = () => frame.remove()
        frame.contentWindow.focus()
        frame.contentWindow.print()
      }
    } catch (error) {
      console.error("Document export failed:", error)
      const detail = error instanceof Error ? error.message : "Unknown error"
      toast.error(`Could not export ${format.toUpperCase()}: ${detail}`)
    }
  }

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])
  useEffect(() => {
    if (editor && onEditorReady) {
      setTimeout(() => onEditorReady(editor), 0);
    }
  }, [editor]);
  useEffect(() => {
    if (!editor || initializedEditor.current === editor) return;
    initializedEditor.current = editor;
    setSavedSnapshot(JSON.stringify({ title, content: editor.getJSON() }));
  }, [editor, title])

  useEffect(() => {
    if (!editor || !user || !id) return;

    socket.emit("enter", user.email, id);

    socket.on("text-changes", ({ content, sender }) => {
      if (sender === user.email) return;
      editor.commands.setContent(content);
    });

    return () => {
      socket.off("enter");
      socket.off("text-changes");
    }
  }, [editor, user, id]);
  return (
    <div className="simple-editor-wrapper flex flex-col justify-center">
      <div className="m-2 flex min-w-0 items-center gap-2">
        <input
          aria-label="Document title"
          className="min-w-0 flex-1 rounded bg-transparent px-2 text-xl font-bold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
        />
        <label className="flex shrink-0 items-center gap-1 text-sm text-foreground">
          <input type="checkbox" checked={autosave} onChange={(event) => { attemptedSnapshot.current = null; setAutosave(event.target.checked) }} />
          Autosave
        </label>
        <span role="status" className="shrink-0 text-xs text-muted-foreground">{saving ? "Saving…" : dirty ? "Unsaved" : "Saved"}</span>
        <ShareFileDialog />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label="Export document" disabled={!editor}><Download /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void exportDocument("pdf")}>Export as PDF</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exportDocument("docx")}>Export as DOCX</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          aria-label="Save document" disabled={!editor || saving}
          onClick={() => void save(false)}>
          <SaveAll />
        </Button>
        <Button aria-label="Back to documents" onClick={() => navigate("/home")}>
          <Undo2 />
        </Button>
      </div>
      <Dialog open={blocker.state === "blocked"} onOpenChange={(open) => { if (!open && blocker.state === "blocked") blocker.reset() }}>
        <DialogContent onOpenAutoFocus={(event) => { event.preventDefault(); cancelRef.current?.focus() }}>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>Your document has unsaved changes. Discard them and leave?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button ref={cancelRef} type="button" className="rounded-md border px-4 py-2" onClick={() => blocker.reset?.()}>Cancel</button>
            <button type="button" className="rounded-md bg-destructive px-4 py-2 text-white disabled:opacity-50" disabled={saving} onClick={() => blocker.proceed?.()}>Discard and go back</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                bottom: `calc(100% - ${height - rect.y}px)`,
              }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>
        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
