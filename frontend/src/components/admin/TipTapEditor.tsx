'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIc,
  Redo,
  Undo,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Modal, useToast } from '@/components/ui';

interface Props {
  initialContent: Record<string, unknown> | null;
  onChange: (doc: Record<string, unknown>, html: string) => void;
}

const EMPTY_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

type ImageInsertMode = 'choose' | 'url' | null;

export function TipTapEditor({ initialContent, onChange }: Props) {
  const toast = useToast();

  // §7.2.1 — window.alert/confirm/prompt 대체 모달 상태
  const [linkUrlOpen, setLinkUrlOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageMode, setImageMode] = useState<ImageInsertMode>(null);
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: initialContent ?? EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[400px] rounded-md border border-border bg-white p-4 outline-none focus:border-primary',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as Record<string, unknown>, editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || !initialContent) return;
    // 외부 상태 변경 시 에디터 초기화 (slug 전환)
    editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  if (!editor) {
    return <div className="text-sm text-text-muted">에디터 로딩 중...</div>;
  }

  const btnClass = (active: boolean) =>
    `flex h-8 w-8 items-center justify-center rounded-md text-sm transition ${
      active
        ? 'bg-primary text-white'
        : 'text-text-secondary hover:bg-bg-muted'
    }`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-bg-muted p-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btnClass(editor.isActive('heading', { level: 1 }))}
          title="제목 1"
          aria-label="제목 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))}
          title="제목 2"
          aria-label="제목 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
          title="굵게"
          aria-label="굵게"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
          title="기울임"
          aria-label="기울임"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
          title="글머리 목록"
          aria-label="글머리 목록"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
          title="번호 목록"
          aria-label="번호 목록"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => {
            setLinkUrl('');
            setLinkUrlOpen(true);
          }}
          className={btnClass(editor.isActive('link'))}
          title="링크"
          aria-label="링크"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setImageMode('choose')}
          className={btnClass(false)}
          title="이미지 (파일 업로드 또는 URL)"
          aria-label="이미지 삽입"
        >
          <ImageIc className="h-4 w-4" />
        </button>
        <div className="mx-1 h-6 w-px bg-border" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className={btnClass(false)}
          title="실행 취소"
          aria-label="실행 취소"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className={btnClass(false)}
          title="다시 실행"
          aria-label="다시 실행"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      <EditorContent editor={editor} />

      {/* §7.2.1 — window.prompt 대체: 링크 URL 입력 모달 */}
      <Modal
        open={linkUrlOpen}
        onClose={() => setLinkUrlOpen(false)}
        title="링크 삽입"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setLinkUrlOpen(false)}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                if (linkUrl.trim()) {
                  editor
                    .chain()
                    .focus()
                    .extendMarkRange('link')
                    .setLink({ href: linkUrl.trim() })
                    .run();
                }
                setLinkUrlOpen(false);
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              삽입
            </button>
          </>
        }
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">URL</span>
          <input
            type="url"
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </Modal>

      {/* §7.2.1 — window.confirm 대체: 이미지 삽입 방식 선택 모달 */}
      <Modal
        open={imageMode === 'choose'}
        onClose={() => setImageMode(null)}
        title="이미지 삽입"
        size="sm"
      >
        <div className="flex flex-col gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setImageMode(null);
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/jpeg,image/png,image/webp';
              input.onchange = async (ev) => {
                const file = (ev.target as HTMLInputElement).files?.[0];
                if (!file) return;
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  const token = localStorage.getItem('access_token');
                  const apiUrl =
                    process.env.NEXT_PUBLIC_API_URL ??
                    'http://localhost:3810/api';
                  const res = await fetch(`${apiUrl}/v1/admin/upload/image`, {
                    method: 'POST',
                    headers: token
                      ? { Authorization: `Bearer ${token}` }
                      : undefined,
                    body: fd,
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => null);
                    toast.error(err?.detail ?? `업로드 실패: ${res.status}`);
                    return;
                  }
                  const data = await res.json();
                  editor.chain().focus().setImage({ src: data.url }).run();
                  toast.success('이미지를 삽입했습니다.');
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : '업로드 실패',
                  );
                }
              };
              input.click();
            }}
            className="rounded-md border border-border bg-white px-4 py-3 text-left font-medium text-text hover:bg-bg"
          >
            📁 파일 업로드
            <span className="mt-1 block text-xs text-text-secondary">
              JPG · PNG · WebP 형식 이미지 파일
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setImageUrl('');
              setImageMode('url');
            }}
            className="rounded-md border border-border bg-white px-4 py-3 text-left font-medium text-text hover:bg-bg"
          >
            🔗 URL 직접 입력
            <span className="mt-1 block text-xs text-text-secondary">
              외부 이미지 주소를 입력
            </span>
          </button>
        </div>
      </Modal>

      {/* §7.2.1 — window.prompt 대체: 이미지 URL 입력 모달 */}
      <Modal
        open={imageMode === 'url'}
        onClose={() => setImageMode(null)}
        title="이미지 URL"
        size="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setImageMode(null)}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                if (imageUrl.trim()) {
                  editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
                  toast.success('이미지를 삽입했습니다.');
                }
                setImageMode(null);
              }}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              삽입
            </button>
          </>
        }
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">이미지 URL</span>
          <input
            type="url"
            autoFocus
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </Modal>
    </div>
  );
}
