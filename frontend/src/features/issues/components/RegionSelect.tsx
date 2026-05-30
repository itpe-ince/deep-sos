'use client';

import { cn } from '@/lib/utils';

import { REGIONS, type RegionCode } from '../types';

/**
 * 5개 지역 선택 — 칩 그리드 UI.
 *
 * 설계 근거:
 *  - feature-spec §M02-01 (5개 지역 선택)
 *  - mockup/pages/user/issue-new.html
 *  - design.md §7.1 region 색상 토큰
 */
export interface RegionSelectProps {
  value: RegionCode | null;
  onChange: (region: RegionCode) => void;
  /** 라벨 (legend 또는 시각 헤더용) */
  label?: string;
}

export function RegionSelect({
  value,
  onChange,
  label = '지역 선택',
}: RegionSelectProps) {
  return (
    <fieldset className="block" data-testid="region-select">
      <legend className="mb-2 block text-sm font-semibold text-text">
        {label}
        <span className="ml-1 text-danger" aria-hidden="true">
          *
        </span>
      </legend>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        {REGIONS.map((r) => {
          const selected = value === r.code;
          return (
            <label
              key={r.code}
              className={cn(
                'cursor-pointer rounded-md border px-3 py-3 text-center text-sm font-medium transition',
                selected
                  ? 'border-2 bg-primary-light text-primary'
                  : 'border-border bg-surface text-text hover:border-primary',
              )}
              style={selected ? { borderColor: r.color } : undefined}
              data-testid={`region-${r.code}`}
              data-selected={selected}
            >
              <input
                type="radio"
                name="region"
                value={r.code}
                checked={selected}
                onChange={() => onChange(r.code)}
                className="sr-only"
              />
              <span
                className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle"
                style={{ backgroundColor: r.color }}
                aria-hidden="true"
              />
              {r.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
