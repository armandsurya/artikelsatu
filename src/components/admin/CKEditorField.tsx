import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { MediaLibraryModal } from "./homepage/primitives";
import { contentStats, sanitizeHtml } from "@/lib/editor/sanitize";
import { SupabaseUploadAdapterPlugin } from "@/lib/editor/uploadAdapter";
import { ImageIcon, Loader2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  onStats?: (s: ReturnType<typeof contentStats>) => void;
  minHeight?: number;
  placeholder?: string;
};

type CKEditorMod = typeof import("@ckeditor/ckeditor5-react");
type CKE5 = typeof import("ckeditor5");

/**
 * Modern WYSIWYG built on CKEditor 5. Client-only: CKEditor relies on
 * `window` and `document`, so we mount after hydration.
 */
export function CKEditorField({ value, onChange, onStats, minHeight = 480, placeholder }: Props) {
  const [mods, setMods] = useState<{ react: CKEditorMod; cke: CKE5 } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("@ckeditor/ckeditor5-react"), import("ckeditor5"), import("ckeditor5/ckeditor5.css")])
      .then(([react, cke]) => { if (!cancelled) setMods({ react, cke }); })
      .catch((e) => { console.error("[CKEditor] load failed", e); if (!cancelled) setLoadError(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, []);

  const insertImageUrl = useCallback((url: string) => {
    const editor = editorRef.current as { model: { change: (cb: (writer: unknown) => void) => void; document: { selection: unknown }; insertContent?: unknown }; execute: (cmd: string, opts?: unknown) => void } | null;
    if (!editor) return;
    try {
      editor.execute("insertImage", { source: url });
    } catch (e) {
      console.error("[CKEditor] insertImage failed", e);
    }
  }, []);

  const config = useMemo(() => {
    if (!mods) return null;
    const { cke } = mods;
    return {
      licenseKey: "GPL" as const,
      plugins: [
        cke.Essentials, cke.Paragraph, cke.Heading, cke.Bold, cke.Italic, cke.Underline, cke.Strikethrough,
        cke.Subscript, cke.Superscript, cke.Code, cke.CodeBlock, cke.BlockQuote, cke.Highlight,
        cke.FontSize, cke.FontFamily, cke.FontColor, cke.FontBackgroundColor,
        cke.Alignment, cke.Indent, cke.IndentBlock,
        cke.List, cke.TodoList, cke.ListProperties,
        cke.Link, cke.AutoLink, cke.LinkImage,
        cke.Image, cke.ImageToolbar, cke.ImageCaption, cke.ImageStyle, cke.ImageResize,
        cke.ImageUpload, cke.ImageInsertViaUrl, cke.PictureEditing,
        cke.Table, cke.TableToolbar, cke.TableProperties, cke.TableCellProperties,
        cke.TableColumnResize, cke.TableCaption,
        cke.HorizontalLine, cke.RemoveFormat,
        cke.FindAndReplace, cke.WordCount,
        cke.SourceEditing, cke.HtmlEmbed, cke.GeneralHtmlSupport,
        cke.PasteFromOffice, cke.AutoImage,
        cke.SpecialCharacters, cke.SpecialCharactersEssentials,
        cke.Clipboard,
      ],
      toolbar: {
        items: [
          "undo", "redo", "|",
          "heading", "|",
          "bold", "italic", "underline", "strikethrough", "subscript", "superscript", "|",
          "fontSize", "fontColor", "fontBackgroundColor", "highlight", "|",
          "alignment", "outdent", "indent", "|",
          "bulletedList", "numberedList", "todoList", "|",
          "blockQuote", "horizontalLine", "code", "codeBlock", "|",
          "link", "openMediaLibrary", "insertImage", "insertTable", "specialCharacters", "|",
          "removeFormat", "findAndReplace", "sourceEditing",
        ],
        shouldNotGroupWhenFull: true,
      },
      heading: {
        options: [
          { model: "paragraph", title: "Paragraph", class: "ck-heading_paragraph" },
          { model: "heading1", view: "h1", title: "Heading 1", class: "ck-heading_heading1" },
          { model: "heading2", view: "h2", title: "Heading 2", class: "ck-heading_heading2" },
          { model: "heading3", view: "h3", title: "Heading 3", class: "ck-heading_heading3" },
          { model: "heading4", view: "h4", title: "Heading 4", class: "ck-heading_heading4" },
          { model: "heading5", view: "h5", title: "Heading 5", class: "ck-heading_heading5" },
          { model: "heading6", view: "h6", title: "Heading 6", class: "ck-heading_heading6" },
        ],
      },
      image: {
        toolbar: [
          "imageTextAlternative", "toggleImageCaption", "|",
          "imageStyle:inline", "imageStyle:alignLeft", "imageStyle:alignCenter", "imageStyle:alignRight", "imageStyle:block", "|",
          "resizeImage", "linkImage",
        ],
      },
      table: {
        contentToolbar: [
          "tableColumn", "tableRow", "mergeTableCells",
          "tableProperties", "tableCellProperties", "toggleTableCaption",
        ],
      },
      link: { addTargetToExternalLinks: true, defaultProtocol: "https://" },
      fontSize: { options: [10, 12, 14, "default", 18, 20, 24, 30, 36, 48], supportAllValues: true },
      htmlSupport: { allow: [{ name: /.*/, attributes: true, classes: true, styles: true }] },
      placeholder: placeholder ?? "Mulai menulis artikel di sini…",
      extraPlugins: [
        SupabaseUploadAdapterPlugin as unknown as never,
        // Custom "Open Media Library" toolbar button
        ((editor: { ui: { componentFactory: { add: (n: string, cb: (locale: unknown) => unknown) => void } }; t?: (s: string) => string }) => {
          editor.ui.componentFactory.add("openMediaLibrary", (locale) => {
            const view = new cke.ButtonView(locale as never);
            view.set({ label: "Media Library", tooltip: true, withText: false, icon: '<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm2 0v7l3-3 3 3 2-2 2 2V5H5zm4 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/></svg>' });
            view.on("execute", () => setLibraryOpen(true));
            return view;
          });
        }) as unknown as never,
      ],
    };
  }, [mods, placeholder]);

  if (loadError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Editor gagal dimuat: {loadError}</div>;
  }

  if (!mods || !config) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-background text-sm text-muted-foreground" style={{ minHeight }}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat editor…
      </div>
    );
  }

  const { react, cke } = mods;
  const CKEditorComp = react.CKEditor as unknown as (props: {
    editor: unknown;
    data?: string;
    config?: unknown;
    onReady?: (editor: unknown) => void;
    onChange?: (evt: unknown, editor: unknown) => void;
  }) => ReactElement;

  return (
    <div className="cke-wrapper" style={{ ["--cke-min-height" as string]: `${minHeight}px` }}>
      <CKEditorComp
        editor={cke.ClassicEditor}
        data={value || ""}
        config={config as unknown}
        onReady={(editor) => {
          editorRef.current = editor;
          try {
            const e = editor as { plugins: { get: (n: string) => { on: (evt: string, cb: (_: unknown, data: unknown) => void) => void; getData?: () => string } }; getData: () => string };
            const wc = e.plugins.get("WordCount");
            wc.on("update", () => onStats?.(contentStats(e.getData())));
            onStats?.(contentStats(e.getData()));
          } catch (err) {
            console.warn("[CKEditor] WordCount hookup failed", err);
          }
        }}
        onChange={(_evt, editor) => {
          const e = editor as { getData: () => string };
          onChange(e.getData());
        }}
      />
      {libraryOpen && (
        <MediaLibraryModal
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => { insertImageUrl(url); setLibraryOpen(false); }}
        />
      )}
    </div>
  );
}

// Re-export helpers so callers can share the same math.
export { contentStats, sanitizeHtml } from "@/lib/editor/sanitize";

// Tiny placeholder icon used by MediaLibrary import chain when lucide isn't required elsewhere.
export const __CKEditorFieldIconMarker = ImageIcon;
