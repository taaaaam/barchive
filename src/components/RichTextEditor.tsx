"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

// Simple markdown to HTML converter for basic formatting
const markdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  // If content already contains HTML tags, return as is
  if (markdown.includes("<") && markdown.includes(">")) {
    return markdown;
  }

  return (
    markdown
      // Headers
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      // Strikethrough
      .replace(/~~(.*?)~~/g, "<s>$1</s>")
      // Code blocks
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      // Inline code
      .replace(/`(.*?)`/g, "<code>$1</code>")
      // Blockquotes
      .replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>")
      // Lists
      .replace(/^\* (.*$)/gim, "<li>$1</li>")
      .replace(/^- (.*$)/gim, "<li>$1</li>")
      .replace(/^(\d+)\. (.*$)/gim, "<li>$2</li>")
      // Line breaks - handle multiple newlines to preserve paragraph spacing
      .replace(/\n\n\n+/g, "</p><p></p><p>") // Multiple newlines become empty paragraphs
      .replace(/\n\n/g, "</p><p>") // Double newlines become paragraph breaks
      .replace(/\n/g, "<br>") // Single newlines become line breaks
      // Wrap in paragraphs
      .replace(/^(?!<[h|b|p|l|d|c])/gm, "<p>")
      .replace(/(?<!>)$/gm, "</p>")
      // Clean up empty paragraphs but preserve spacing
      .replace(/<p><br><\/p>/g, "<p></p>") // Keep empty paragraphs for spacing
  );
};

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  className = "",
}: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [processedContent, setProcessedContent] = useState("");
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    const htmlContent = markdownToHtml(content);
    setProcessedContent(htmlContent);
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
    ],
    content: processedContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      setHasSelection(!editor.state.selection.empty);
    },
    onSelectionUpdate: ({ editor }) => {
      setHasSelection(!editor.state.selection.empty);
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: `focus:outline-none min-h-[200px] p-4 text-gray-900 leading-relaxed`,
        "data-placeholder": placeholder,
      },
    },
  });

  useEffect(() => {
    if (editor && processedContent !== editor.getHTML()) {
      editor.commands.setContent(processedContent);
    }
  }, [editor, processedContent]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent the button from taking focus
        onClick();
      }}
      title={title}
      className={`p-2 rounded-md transition-colors ${
        isActive
          ? "bg-green text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div
      className={`border-2 rounded-lg transition-colors ${
        isFocused ? "border-green ring-2 ring-green/20" : "border-green/30"
      } ${className}`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        {/* Bold */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold") && hasSelection}
          title="Bold (Ctrl+B)"
        >
          <i className="fas fa-bold text-sm"></i>
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic") && hasSelection}
          title="Italic (Ctrl+I)"
        >
          <i className="fas fa-italic text-sm"></i>
        </ToolbarButton>

        {/* Strikethrough */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike") && hasSelection}
          title="Strikethrough"
        >
          <i className="fas fa-strikethrough text-sm"></i>
        </ToolbarButton>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Headings */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <span className="font-bold text-sm">H1</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <span className="font-bold text-sm">H2</span>
        </ToolbarButton>

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <span className="font-bold text-sm">H3</span>
        </ToolbarButton>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Bullet List */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <i className="fas fa-list-ul text-sm"></i>
        </ToolbarButton>

        {/* Ordered List */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          title="Numbered List"
        >
          <i className="fas fa-list-ol text-sm"></i>
        </ToolbarButton>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Blockquote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          title="Quote"
        >
          <i className="fas fa-quote-left text-sm"></i>
        </ToolbarButton>

        {/* Code Block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <i className="fas fa-code text-sm"></i>
        </ToolbarButton>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Undo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
        >
          <i className="fas fa-undo text-sm"></i>
        </ToolbarButton>

        {/* Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo (Ctrl+Y)"
        >
          <i className="fas fa-redo text-sm"></i>
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <div className="bg-white rounded-b-lg">
        <EditorContent editor={editor} className="min-h-[200px]" />
      </div>

      {/* Help Text */}
      <div className="px-4 py-2 bg-gray-50 rounded-b-lg border-t border-gray-100">
        <p className="text-sm text-gray-600">
          💡 <strong>Keyboard shortcuts:</strong> Bold (Ctrl+B), Italic
          (Ctrl+I), Undo (Ctrl+Z), Redo (Ctrl+Y)
        </p>
      </div>
    </div>
  );
}
