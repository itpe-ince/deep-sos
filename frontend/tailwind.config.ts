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
        // Brand
        primary: {
          DEFAULT: '#2563eb',
          hover: '#1d4ed8',
          light: '#dbeafe',
        },
        secondary: {
          DEFAULT: '#059669',
          light: '#d1fae5',
        },
        accent: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',

        // 4개 캠퍼스
        campus: {
          dj: '#2563eb', // 대전
          gj: '#059669', // 공주
          ys: '#7c3aed', // 예산
          sj: '#ea580c', // 세종
        },

        // 상태
        status: {
          submitted: '#6b7280',
          reviewing: '#3b82f6',
          assigned: '#8b5cf6',
          progress: '#f59e0b',
          resolved: '#10b981',
          rejected: '#ef4444',
        },

        // 배경/표면 (mockup 기준)
        bg: '#f9fafb',
        surface: {
          DEFAULT: '#ffffff',
          hover: '#f3f4f6',
        },
        border: {
          DEFAULT: '#e5e7eb',
          focus: '#2563eb',
        },
        text: {
          DEFAULT: '#111827',
          secondary: '#6b7280',
          muted: '#9ca3af',
          disabled: '#d1d5db',
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

      fontSize: {
        xs: '0.75rem',
        sm: '0.8125rem',
        base: '0.9375rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.375rem',
        '2xl': '1.75rem',
        '3xl': '2.25rem',
        '4xl': '3rem',
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
