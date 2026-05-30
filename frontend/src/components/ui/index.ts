/**
 * USCP V2 공통 UI 컴포넌트 barrel export.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §7.2.1, §7.2.2
 *
 * 사용 규칙:
 * - window.alert / window.confirm 절대 금지 → 본 모듈의 Modal/ConfirmModal/Toast 사용
 * - 모달은 항상 header/content/footer 3분할 + 내부 스크롤
 * - backdrop 클릭으로 닫기 금지 (Modal 컴포넌트가 강제)
 */
export { Modal, type ModalProps } from './Modal';
export { ConfirmModal, type ConfirmModalProps } from './ConfirmModal';
export { ToastProvider, useToast } from './Toast';
