'use client';

import {
  ArrowLeft,
  MessageSquare,
  Paperclip,
  Pin,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';

import {
  createPost,
  createPostComment,
  deletePost,
  deletePostComment,
  getPost,
  listPostComments,
  listPosts,
  uploadPostAttachment,
} from '../api';
import type { PostComment, PostDetail, PostListItem } from '../types';

/**
 * M03-15~18 — 프로젝트 멤버 전용 게시판.
 *
 * 설계 근거:
 *  - feature-spec §M03-15~18 (작성·목록·상세·댓글·첨부, 멤버 전용)
 *  - design.md §7.2.1 (ConfirmModal — window.confirm 금지)
 *
 * 멤버 전용 이중 차단: 비멤버는 목록 조회 시 403 → 컴포넌트가 아무것도 렌더하지 않음
 * (UI 차단). 시스템 차단은 백엔드 require_project_member 가 담당.
 */
type View = 'list' | 'detail' | 'new';
type PendingDelete =
  | { kind: 'post'; id: string }
  | { kind: 'comment'; id: string }
  | null;

export function ProjectBoard({ projectId }: { projectId: string }) {
  const toast = useToast();
  const [allowed, setAllowed] = useState<boolean | null>(null); // null=확인중
  const [view, setView] = useState<View>('list');

  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await listPosts(projectId, { limit: 50 });
      setPosts(res.data);
      setAllowed(true);
    } catch (err) {
      // 401(비로그인)·403(비멤버) → 게시판 탭 자체 숨김 (이중 차단의 UI 측)
      if (err instanceof ApiError && (err.status === 403 || err.status === 401)) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      toast.error(err instanceof Error ? err.message : '게시글 목록 조회 실패');
    }
  }, [projectId, toast]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  async function openDetail(postId: string) {
    try {
      const [detail, cs] = await Promise.all([
        getPost(projectId, postId),
        listPostComments(projectId, postId),
      ]);
      setPost(detail);
      setComments(cs.data);
      setView('detail');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '게시글 조회 실패');
    }
  }

  async function reloadComments(postId: string) {
    try {
      const cs = await listPostComments(projectId, postId);
      setComments(cs.data);
    } catch {
      /* noop */
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === 'post') {
        await deletePost(projectId, pendingDelete.id);
        toast.success('게시글을 삭제했습니다.');
        setView('list');
        setPost(null);
        await fetchList();
      } else {
        await deletePostComment(pendingDelete.id);
        toast.success('댓글을 삭제했습니다.');
        if (post) await reloadComments(post.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setPendingDelete(null);
    }
  }

  // 비멤버 또는 확인 전 → 렌더 안 함 (탭 자체 비노출)
  if (allowed === null || allowed === false) return null;

  return (
    <section data-testid="project-board" aria-labelledby="board-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="board-heading" className="text-lg font-bold text-text">
          프로젝트 게시판
          <span className="ml-2 align-middle text-xs font-normal text-text-muted">
            멤버 전용 · 비공개
          </span>
        </h2>
        {view === 'list' ? (
          <button
            type="button"
            onClick={() => setView('new')}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover"
            data-testid="board-new"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />새 글
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setView('list');
              setPost(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text hover:border-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            목록
          </button>
        )}
      </div>

      {view === 'list' ? (
        <PostList posts={posts} onOpen={openDetail} />
      ) : null}

      {view === 'new' ? (
        <PostForm
          projectId={projectId}
          onCancel={() => setView('list')}
          onCreated={async () => {
            setView('list');
            await fetchList();
          }}
        />
      ) : null}

      {view === 'detail' && post ? (
        <PostDetailView
          post={post}
          comments={comments}
          onDeletePost={() => setPendingDelete({ kind: 'post', id: post.id })}
          onDeleteComment={(id) => setPendingDelete({ kind: 'comment', id })}
          onAddComment={async (body) => {
            try {
              await createPostComment(projectId, post.id, body);
              await reloadComments(post.id);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : '댓글 작성 실패');
            }
          }}
        />
      ) : null}

      <ConfirmModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete?.kind === 'comment' ? '댓글 삭제' : '게시글 삭제'}
        description={
          pendingDelete?.kind === 'comment'
            ? '이 댓글을 삭제하시겠습니까? 되돌릴 수 없습니다.'
            : '이 게시글을 삭제하시겠습니까? 댓글도 함께 정리되며 되돌릴 수 없습니다.'
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
      />
    </section>
  );
}

function PostList({
  posts,
  onOpen,
}: {
  posts: PostListItem[];
  onOpen: (id: string) => void;
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-bg-muted/40 p-6 text-center text-sm text-text-muted">
        아직 게시글이 없습니다. 첫 글을 작성해 보세요.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {posts.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p.id)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-bg-muted/50"
            data-testid={`board-post-${p.id}`}
          >
            {p.is_pinned ? (
              <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="고정" />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
              {p.title}
            </span>
            {p.has_attachment ? (
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-label="첨부" />
            ) : null}
            {p.comment_count > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-xs text-text-muted">
                <MessageSquare className="h-3.5 w-3.5" />
                {p.comment_count}
              </span>
            ) : null}
            <span className="shrink-0 text-xs text-text-muted">{p.author.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PostForm({
  projectId,
  onCancel,
  onCreated,
}: {
  projectId: string;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !body.trim()) {
      toast.error('제목과 본문을 입력해 주세요.');
      return;
    }
    if (file && file.size > 20 * 1024 * 1024) {
      toast.error('첨부파일은 20MB 이내여야 합니다.');
      return;
    }
    setSubmitting(true);
    try {
      let attachment_key: string | null = null;
      let attachment_filename: string | null = null;
      if (file) {
        const up = await uploadPostAttachment(projectId, file);
        attachment_key = up.minio_key;
        attachment_filename = up.filename;
      }
      await createPost(projectId, {
        title: title.trim(),
        body: body.trim(),
        attachment_key,
        attachment_filename,
      });
      toast.success('게시글을 작성했습니다.');
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { message?: string } })?.detail;
        toast.error(detail?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : '게시글 작성 실패');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-surface p-5"
      data-testid="board-post-form"
    >
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">제목</span>
        <input
          type="text"
          required
          maxLength={100}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          data-testid="board-title"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">본문</span>
        <textarea
          required
          rows={8}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${inputClass} resize-y`}
          data-testid="board-body"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">
          첨부파일 <span className="text-text-muted">(선택 · 20MB 이내, 1개)</span>
        </span>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-md file:border-0 file:bg-bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
          data-testid="board-file"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          data-testid="board-submit"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? '저장 중...' : '등록'}
        </button>
      </div>
    </form>
  );
}

function PostDetailView({
  post,
  comments,
  onDeletePost,
  onDeleteComment,
  onAddComment,
}: {
  post: PostDetail;
  comments: PostComment[];
  onDeletePost: () => void;
  onDeleteComment: (id: string) => void;
  onAddComment: (body: string) => Promise<void>;
}) {
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  return (
    <article className="rounded-xl border border-border bg-surface p-5" data-testid="board-detail">
      <header className="mb-3 border-b border-border pb-3">
        <div className="mb-1 flex items-center gap-1.5">
          {post.is_pinned ? <Pin className="h-4 w-4 text-primary" aria-label="고정" /> : null}
          <h3 className="text-lg font-bold text-text">{post.title}</h3>
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>
            {post.author.name} · {new Date(post.created_at).toLocaleString('ko-KR')}
          </span>
          {post.can_edit ? (
            <button
              type="button"
              onClick={onDeletePost}
              className="inline-flex items-center gap-1 text-danger hover:underline"
              data-testid="board-delete-post"
            >
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          ) : null}
        </div>
      </header>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{post.body}</p>

      {post.attachment ? (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-muted px-3 py-2 text-sm text-text-secondary">
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          {post.attachment.filename ?? '첨부파일'}
        </div>
      ) : null}

      {/* 댓글 (M03-17) */}
      <div className="mt-6 border-t border-border pt-4">
        <h4 className="mb-3 text-sm font-semibold text-text">
          댓글 {comments.length}
        </h4>
        <ul className="mb-4 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm" data-testid={`board-comment-${c.id}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-text">{c.author.name}</span>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <time>{new Date(c.created_at).toLocaleString('ko-KR')}</time>
                  {c.can_edit ? (
                    <button
                      type="button"
                      onClick={() => onDeleteComment(c.id)}
                      className="inline-flex items-center gap-0.5 text-danger hover:underline"
                      data-testid={`board-delete-comment-${c.id}`}
                    >
                      <Trash2 className="h-3 w-3" /> 삭제
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-text-secondary">{c.body}</p>
            </li>
          ))}
          {comments.length === 0 ? (
            <li className="text-sm text-text-muted">첫 댓글을 남겨보세요.</li>
          ) : null}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (posting || !comment.trim()) return;
            setPosting(true);
            await onAddComment(comment.trim());
            setComment('');
            setPosting(false);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            rows={2}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="댓글을 입력하세요 (1~1,000자)"
            className={`${inputClass} resize-y`}
            data-testid="board-comment-input"
          />
          <button
            type="submit"
            disabled={posting || !comment.trim()}
            className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            data-testid="board-comment-submit"
          >
            등록
          </button>
        </form>
      </div>
    </article>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
