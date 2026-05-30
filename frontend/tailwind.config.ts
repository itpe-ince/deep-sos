import type { Config } from 'tailwindcss';

/**
 * mockup/styles/base/variables.css 의 디자인 토큰을
 * Tailwind 설정으로 1:1 매핑합니다.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — design.md §7.1 (충남대·공주대 색조 기반)
        primary: {
          DEFAULT: '#1E40AF',
          hover: '#1d3596',
          dark: '#1d3596',
          light: '#dbeafe',
        },
        secondary: {
          DEFAULT: '#475569',
          light: '#e2e8f0',
        },
        accent: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        success: '#10B981',
        warning: '#F59E0B',

        // 5개 지역 (design.md §3.2 region ENUM)
        region: {
          dj: '#1E40AF', // 대전 (daejeon)
          gj: '#059669', // 공주 (gongju)
          ys: '#7c3aed', // 예산 (yesan)
          cn: '#0891b2', // 천안 (cheonan)
          sj: '#ea580c', // 세종 (sejong)
        },

        // 6단계 의제 워크플로우 (design.md §3.2 issue_stage ENUM)
        stage: {
          reported: '#6b7280',         // 1. 제보
          reviewing: '#3b82f6',         // 2. 검토중
          published: '#8b5cf6',         // 3. 공개등록
          'mentor-assigned': '#7c3aed', // 4. 멘토배정
          'in-progress': '#f59e0b',     // 5. 처리중
          resolved: '#10B981',          // 6. 해결완료
          rejected: '#ef4444',          // 반려
        },

        // 3종 트랙 라벨 (design.md §3.2 issue_track ENUM, mockup issues.html 기반)
        track: {
          'policy-reflection-bg': '#dbeafe',
          'policy-reflection-fg': '#1e40af',
          'policy-reflection-border': '#93c5fd',
          'policy-reference-bg': '#ede9fe',
          'policy-reference-fg': '#6d28d9',
          'policy-reference-border': '#c4b5fd',
          'citizen-autonomy-bg': '#d1fae5',
          'citizen-autonomy-fg': '#047857',
          'citizen-autonomy-border': '#6ee7b7',
        },

        // 배경/표면 (design.md §7.1)
        bg: '#F8FAFC',
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#f3f4f6',
        },
        border: {
          DEFAULT: '#e5e7eb',
          focus: '#1E40AF',
        },
        text: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
          disabled: '#cbd5e1',
        },
      },

      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'D2Coding', 'monospace'],
      },

      // design.md §7.1: scale xs(12) sm(14) base(16) lg(18) xl(20) 2xl(24) 3xl(30)
      fontSize: {
        xs: '0.75rem',     // 12px
        sm: '0.875rem',    // 14px
        base: '1rem',      // 16px (design.md 표준)
        md: '1rem',
        lg: '1.125rem',    // 18px
        xl: '1.25rem',     // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '1.875rem', // 30px
        '4xl': '2.25rem',
      },

      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
      },

      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },

      boxShadow: {
        sm: '0 1px 2px 0 rgba(0,0,0,0.05)',
        md: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
        xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      },

      maxWidth: {
        content: '1200px',
        layout: '1440px',
      },

      zIndex: {
        dropdown: '500',
        sticky: '800',
        lnb: '900',
        gnb: '1000',
        drawer: '1050',
        'modal-backdrop': '1100',
        modal: '1200',
        toast: '1300',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
