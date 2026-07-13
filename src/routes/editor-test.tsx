import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CKEditorField } from "@/components/admin/CKEditorField";

export const Route = createFileRoute("/__editor-test")({
  head: () => ({ meta: [{ title: "Editor Test" }, { name: "robots", content: "noindex" }] }),
  component: EditorTest,
});

function EditorTest() {
  const [v, setV] = useState("<p>hello</p>");
  return (
    <div style={{ padding: 24 }}>
      <h1>Editor Test</h1>
      <CKEditorField value={v} onChange={setV} />
      <pre style={{ marginTop: 16 }}>{v}</pre>
    </div>
  );
}
