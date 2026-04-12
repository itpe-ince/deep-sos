import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, MessageCircle, ThumbsUp, Eye, ArrowLeft } from 'lucide-react';
import { serverFetch, type IssueItem } from '@/lib/server-api';
import { IssueInteractions } from '@/components/issue/IssueInteractions';

const STATUS_FLOW = [
  { key: 'submitted', label: '접수' },
  { key: 'reviewing', label: '검토' },
  { key: 'assigned', label: '배정' },
  { key: 'progress', label: '진행' },
  { key: 'resolved', label: '해결' },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IssueDetailPage({ params }: PageProps) {
  const { id } = await params;
  let issue: IssueItem;
  try {
    issue = await serverFetch<IssueItem>(`/issues/${id}`);
  } catch {
    notFound();
  }

  const currentStep = STATUS_FLOW.findIndex((s) => s.key === issue.status);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/issues"
        className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> 목록으로
      </Link>

      <article className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <header className="mb-6 border-b border-border pb-6">
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-light px-3 py-1 font-medium text-primary">
              {issue.category}
            </span>
            <span className="text-text-muted">
              {new Date(issue.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">{issue.title}</h1>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">처리 단계</h2>
          <ol className="flex items-center gap-2">
            {STATUS_FLOW.map((s, i) => {
              const done = i <= currentStep;
              return (
                <li key={s.key} className="flex flex-1 items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      done ? 'bg-primary text-white' : 'bg-bg-muted text-text-muted'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-xs ${
                      done ? 'font-medium text-primary' : 'text-text-muted'
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < STATUS_FLOW.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${done ? 'bg-primary' : 'bg-border'}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">문제 설명</h2>
          <p className="whitespace-pre-line text-text-primary">{issue.description}</p>
        </section>

        {issue.location_address && (
          <section className="mb-8 rounded-xl bg-bg-muted p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <MapPin className="h-4 w-4" /> 위치
            </h3>
            <p className="text-sm text-text-primary">{issue.location_address}</p>
          </section>
        )}

        <footer className="flex items-center gap-6 border-t border-border pt-6 text-sm text-text-secondary">
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-4 w-4" /> {issue.vote_count} 공감
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4" /> {issue.comment_count} 댓글
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" /> {issue.view_count} 조회
          </span>
        </footer>
      </article>

      <IssueInteractions
        issueId={issue.id}
        initialVoteCount={issue.vote_count}
        initialCommentCount={issue.comment_count}
      />
    </div>
  );
}
