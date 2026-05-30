'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';

import { useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { createTimelineEntry } from '../api';

export interface TimelineFormProps {
  projectId: string;
  onCreated?: () => void;
}

export function TimelineForm({ projectId, onCreated }: TimelineFormProps) {
  const toast = useToast();
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const titleOk = title.trim().length >= 1 && title.trim().length <= 200;
  const ready = titleOk && !!entryDate;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    try {
      await createTimelineEntry(projectId, {
        entry_date: entryDate,
        title: title.trim(),
        description: description.trim() || null,
      });
      toast.success('활동을 기록했습니다.');
      setTitle('');
      setDescription('');
      onCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'project_member_required') {
          toast.error('매칭된 멤버 또는 운영자만 작성할 수 있습니다.');
          return;
        }
        toast.error(detail?.message ?? err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : '작성 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 space-y-3 rounded-md border border-border bg-surface p-4"
      data-testid="timeline-form"
    >
      <h3 className="text-sm font-bold text-text">활동 기록 추가</h3>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">날짜</span>
          <input
            type="date"
            required
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className={inputClass}
            data-testid="timeline-entry-date"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">
            제목
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          </span>
          <input
            type="text"
            required
            minLength={1}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 킥오프 미팅"
            className={inputClass}
            data-testid="timeline-title"
            aria-invalid={!!title && !titleOk}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">상세 내용 (선택)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="활동 내용을 자유롭게 기록해 주세요."
          className={cn(inputClass, 'resize-y')}
          data-testid="timeline-description"
        />
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!ready || submitting}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:bg-text-muted',
          )}
          data-testid="timeline-submit"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? '작성 중...' : '기록'}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
