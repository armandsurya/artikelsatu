import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Image as ImgIcon, Undo2, Redo2 } from "lucide-react";

export function TiptapEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: "Tulis isi artikel di sini..." }),
    ],
    content: value,
    editorProps: { attributes: { class: "prose prose-slate max-w-none min-h-[400px] px-4 py-3 focus:outline-none" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    immediatelyRender: false,
  });

  if (!editor) return <div className="h-96 rounded-lg border border-border bg-background" />;

  const btn = (active: boolean) =>
    `inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></button>
        <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></button>
        <div className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></button>
        <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></button>
        <div className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></button>
        <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></button>
        <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></button>
        <div className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn(false)} onClick={() => {
          const url = prompt("URL:"); if (url) editor.chain().focus().setLink({ href: url }).run();
        }}><LinkIcon className="h-4 w-4" /></button>
        <button type="button" className={btn(false)} onClick={() => {
          const url = prompt("URL gambar:"); if (url) editor.chain().focus().setImage({ src: url }).run();
        }}><ImgIcon className="h-4 w-4" /></button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="h-4 w-4" /></button>
          <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="h-4 w-4" /></button>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
