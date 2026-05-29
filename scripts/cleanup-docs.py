#!/usr/bin/env python3
"""
2건 동시 처리:
1. feature-spec.md — 각 기능의 '처리', '응답', '연관' 항목 제거 (기관 담당자 제출용)
2. feature-list.md — 모든 스크린샷 섹션 제거 (상세 문서로 이관)
"""
from pathlib import Path
import re

SPEC = Path('docs/02-design/features/uscp-feature-spec.md')
LIST = Path('docs/01-plan/uscp-feature-list.md')


# ────────────────────────────────────────────────
# 1) feature-spec.md — 3개 항목 제거
# ────────────────────────────────────────────────
def remove_bullet_field(text: str, field_name: str) -> str:
    """`- **field_name**:` 라인 + 이어지는 indented sub-bullet 라인 제거."""
    lines = text.split('\n')
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith(f'- **{field_name}**:'):
            # Skip this line
            i += 1
            # Skip subsequent indented sub-bullets (2+ space prefix)
            while i < len(lines):
                next_line = lines[i]
                if next_line.startswith('  ') or next_line.startswith('\t'):
                    i += 1
                else:
                    break
            continue
        out.append(line)
        i += 1
    return '\n'.join(out)


spec_text = SPEC.read_text(encoding='utf-8')
orig_spec_lines = len(spec_text.split('\n'))

for fld in ['처리', '응답', '연관']:
    spec_text = remove_bullet_field(spec_text, fld)

# 0.1 명세 형식 표에서도 3개 행 제거
spec_text = spec_text.replace(
    "| **처리** | 시스템 내부 처리 단계 (순차) |\n",
    ""
).replace(
    "| **응답** | HTTP 상태 코드 / UI 결과 |\n",
    ""
).replace(
    "| **연관** | 화면 # / API endpoint / DB 테이블 |\n",
    ""
)

# Version History 추가
spec_text = spec_text.replace(
    "| 1.0 | 2026-05-28 | 116개 기능 상세 명세서 신규 작성",
    "| 1.1 | 2026-05-28 | **기관 담당자 제출용 정리** — 각 기능에서 '처리'·'응답'·'연관' 3개 기술 항목 제거. 목적·입력·권한·예외 4개 기능 항목만 유지. (참고: 모듈별 화면 스크린샷은 §모듈 헤더에 유지, API/Table 매트릭스는 부록 A에 통합 유지) |\n| 1.0 | 2026-05-28 | 116개 기능 상세 명세서 신규 작성"
)

SPEC.write_text(spec_text, encoding='utf-8')
new_spec_lines = len(spec_text.split('\n'))
print(f"✓ feature-spec.md: {orig_spec_lines} → {new_spec_lines} 줄 ({orig_spec_lines - new_spec_lines} 줄 삭제)")


# ────────────────────────────────────────────────
# 2) feature-list.md — 스크린샷 섹션 제거
# ────────────────────────────────────────────────
list_text = LIST.read_text(encoding='utf-8')
orig_list_lines = len(list_text.split('\n'))

# (a) 상단 📷 스크린샷 안내 + v3.3→v3.4 보강 결과 표 섹션 제거
# 시작: "## 📷 스크린샷 안내"
# 끝: 다음 "---" 다음의 첫 "## M01" 직전까지
pattern_top = re.compile(
    r'## 📷 스크린샷 안내.*?(?=## M01\. 회원·인증 모듈)',
    re.DOTALL
)
list_text = pattern_top.sub('', list_text)

# (b) 각 모듈의 "### 📷 MXX 관련 화면" 섹션 제거
# 시작: "### 📷 M0X 관련 화면"
# 끝: 다음 "---" 또는 다음 "##" 또는 다음 "###" 헤더 직전까지
pattern_module = re.compile(
    r'### 📷 M\d+ 관련 화면\n.*?(?=\n---|\n## |\n### )',
    re.DOTALL
)
list_text = pattern_module.sub('', list_text)

# 정리: 연속된 빈 줄 정규화
list_text = re.sub(r'\n{3,}', '\n\n', list_text)

# Version History 추가
list_text = list_text.replace(
    "| 3.6 | 2026-05-28 | **기능 상세 명세서 신규 작성**",
    "| 3.7 | 2026-05-28 | 상세 명세서([`uscp-feature-spec.md`](../02-design/features/uscp-feature-spec.md))로 이관 — 본 목록에서 **모든 스크린샷 섹션 제거**. 본 문서는 116개 기능 목록만 유지 (상세 화면 참조는 명세서로 일원화). |\n| 3.6 | 2026-05-28 | **기능 상세 명세서 신규 작성**"
)

LIST.write_text(list_text, encoding='utf-8')
new_list_lines = len(list_text.split('\n'))
print(f"✓ feature-list.md: {orig_list_lines} → {new_list_lines} 줄 ({orig_list_lines - new_list_lines} 줄 삭제)")


# ────────────────────────────────────────────────
# 검증
# ────────────────────────────────────────────────
print("\n=== 검증 ===")

# spec.md: 처리/응답/연관 라인이 0개여야 함
spec_text_check = SPEC.read_text(encoding='utf-8')
remain_spec = sum(1 for line in spec_text_check.split('\n')
                  if line.startswith('- **처리**') or line.startswith('- **응답**') or line.startswith('- **연관**'))
print(f"feature-spec.md 잔존 (처리/응답/연관): {remain_spec}개 (0 기대)")

# spec.md: 기능 ID 개수 116개 유지
spec_fn_count = len(re.findall(r'^### M\d+-\d+:', spec_text_check, re.MULTILINE))
print(f"feature-spec.md 기능 ID 개수: {spec_fn_count} (116 기대)")

# list.md: 스크린샷 섹션 0개
list_text_check = LIST.read_text(encoding='utf-8')
remain_list_screenshots = len(re.findall(r'### 📷.*관련 화면', list_text_check))
print(f"feature-list.md 잔존 스크린샷 섹션: {remain_list_screenshots}개 (0 기대)")

# list.md: 116개 모듈 헤더는 유지
list_module_count = len(re.findall(r'^## M\d+\.', list_text_check, re.MULTILINE))
print(f"feature-list.md 모듈 헤더 개수: {list_module_count} (9 기대)")
