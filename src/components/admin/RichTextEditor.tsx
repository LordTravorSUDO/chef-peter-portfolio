/**
 * RichTextEditor — Tiptap-based rich text editor for article content.
 *
 * Features:
 *   - Headings H2, H3, H4
 *   - Bold, italic, underline
 *   - Numbered lists, bullet lists
 *   - Blockquotes
 *   - Links (with URL prompt)
 *   - Horizontal rules
 *   - Image insertion (via URL or media picker)
 *   - Undo / redo
 *   - Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y)
 *   - Placeholder text
 *   - Readable layout on desktop and mobile
 *
 * The editor produces clean HTML which is stored in the articles.body column.
 */

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Quote, Link as LinkIcon, Minus, Image as ImageIcon,
  Undo, Redo, Heading2, Heading3, Heading4,
} from 'lucide-react';

interface Props {
  value:    string;
  onChange:  (html: string) => void;
  /** Called when the user clicks the image toolbar button — opens the media picker */
  onInsertImage?: (editor: Editor) => void;
  placeholder?: string;
}

// ---------------------------------------------------------------------------
// Toolbar button — defined at module level so its identity is stable.
// (It used to be declared inside the editor's render: every editor update
// created a new component type, React replaced the button between mousedown
// and mouseup, and the click — e.g. "Insert image" — was lost.)
// ---------------------------------------------------------------------------
function TBtn({
  onClick, active, disabled, label, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Keep focus (and the cursor position) in the editor while clicking
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded transition ${
        active
          ? 'bg-[#1B365D] text-white'
          : 'text-[#6B7A8D] hover:bg-[#F4F6F8] hover:text-[#1B365D]'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-[#DDE3EA] mx-0.5" />;
}

export default function RichTextEditor({ value, onChange, onInsertImage, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write your article content here…',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none min-h-[400px] px-5 py-4 text-[#1A2B40] leading-relaxed',
      },
    },
  });

  // Sync external value changes (e.g. loading an article)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [editor, value]);

  // ---------------------------------------------------------------------------
  // Toolbar action handlers
  // ---------------------------------------------------------------------------
  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Link URL', previousUrl ?? 'https://');
    if (url === null) return;     // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    // Basic URL validation
    try { new URL(url); } catch { return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const insertImageUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Image URL', 'https://');
    if (!url) return;
    editor.chain().focus().setImage({ src: url, alt: '' }).run();
  }, [editor]);

  const handleImageButton = useCallback(() => {
    if (!editor) return;
    if (onInsertImage) {
      onInsertImage(editor);
    } else {
      insertImageUrl();
    }
  }, [editor, onInsertImage, insertImageUrl]);

  if (!editor) {
    return (
      <div className="bg-white rounded-xl border border-[#DDE3EA] p-8 flex justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#1B365D]/20 border-t-[#1B365D] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#DDE3EA] overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-[#DDE3EA] px-2 py-1.5 flex items-center flex-wrap gap-0.5 bg-[#FAFBFC] sticky top-0 z-10">
        {/* Undo / Redo */}
        <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo (Ctrl+Z)">
          <Undo className="w-4 h-4" />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo (Ctrl+Y)">
          <Redo className="w-4 h-4" />
        </TBtn>

        <Divider />

        {/* Headings */}
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} label="Heading 2">
          <Heading2 className="w-4 h-4" />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} label="Heading 3">
          <Heading3 className="w-4 h-4" />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()} active={editor.isActive('heading', { level: 4 })} label="Heading 4">
          <Heading4 className="w-4 h-4" />
        </TBtn>

        <Divider />

        {/* Inline formatting */}
        <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} label="Underline (Ctrl+U)">
          <UnderlineIcon className="w-4 h-4" />
        </TBtn>

        <Divider />

        {/* Lists */}
        <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet list">
          <List className="w-4 h-4" />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list">
          <ListOrdered className="w-4 h-4" />
        </TBtn>

        <Divider />

        {/* Quote */}
        <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="Quote">
          <Quote className="w-4 h-4" />
        </TBtn>

        {/* Link */}
        <TBtn onClick={setLink} active={editor.isActive('link')} label="Insert link">
          <LinkIcon className="w-4 h-4" />
        </TBtn>

        {/* Horizontal rule */}
        <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Horizontal rule">
          <Minus className="w-4 h-4" />
        </TBtn>

        {/* Image */}
        <TBtn onClick={handleImageButton} label="Insert image">
          <ImageIcon className="w-4 h-4" />
        </TBtn>
      </div>

      {/* Editor content area */}
      <EditorContent editor={editor} className="tiptap-content-wrapper" />

      {/* Editor styles — scoped via CSS class */}
      <style>{`
        .prose-editor {
          font-size: 0.9375rem;
          line-height: 1.7;
        }
        .prose-editor:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
        .prose-editor.is-editor-empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .prose-editor h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1B365D;
          margin: 1.5em 0 0.5em;
          line-height: 1.3;
        }
        .prose-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1B365D;
          margin: 1.25em 0 0.4em;
          line-height: 1.3;
        }
        .prose-editor h4 {
          font-size: 1.0625rem;
          font-weight: 600;
          color: #1A2B40;
          margin: 1em 0 0.3em;
          line-height: 1.3;
        }
        .prose-editor p {
          margin: 0.6em 0;
        }
        .prose-editor ul, .prose-editor ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
        }
        .prose-editor ul { list-style: disc; }
        .prose-editor ol { list-style: decimal; }
        .prose-editor li { margin: 0.25em 0; }
        .prose-editor blockquote {
          border-left: 3px solid #4A777A;
          padding-left: 1em;
          margin: 1em 0;
          color: #4A5A6D;
          font-style: italic;
        }
        .prose-editor a {
          color: #4A777A;
          text-decoration: underline;
        }
        .prose-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
        }
        .prose-editor hr {
          border: none;
          border-top: 1px solid #DDE3EA;
          margin: 1.5em 0;
        }
        /* Mobile adjustments */
        @media (max-width: 640px) {
          .prose-editor {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
}
