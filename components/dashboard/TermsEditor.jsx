// components/dashboard/TermsEditor.jsx
"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

export default function TermsEditor({ value, onChange }) {
  return (
    <CKEditor
      editor={ClassicEditor}
      data={value || ""}
      onChange={(event, editor) => onChange(editor.getData())}
      config={{
        toolbar: [
          "bold",
          "italic",
          "underline",
          "|",
          "bulletedList",
          "numberedList",
          "|",
          "alignment",
          "|",
          "undo",
          "redo",
        ],
      }}
    />
  );
}