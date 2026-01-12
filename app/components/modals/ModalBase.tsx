'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  describedBy?: string;
  zIndex?: number;
  backdropClassName?: string;
  dialogClassName?: string;
  initialFocusSelector?: string;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  const nodes = Array.from(container.querySelectorAll(selectors.join(',')));
  return nodes.filter((el) => !el.hasAttribute('disabled')) as HTMLElement[];
}

export default function ModalBase({
  isOpen,
  onClose,
  children,
  labelledBy,
  describedBy,
  zIndex = 1000,
  backdropClassName,
  dialogClassName,
  initialFocusSelector,
}: ModalBaseProps) {
  const mountRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const container = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.setAttribute('data-portal', 'modal');
    return el;
  }, []);

  useEffect(() => {
    if (!container || typeof document === 'undefined') return;
    mountRef.current = container;
    document.body.appendChild(container);
    return () => {
      const node = mountRef.current;
      mountRef.current = null;
      if (!node) return;

      // Em dev (React 18 StrictMode/Fast Refresh) o cleanup pode rodar mais de uma vez.
      // Só remove se o nó ainda estiver anexado.
      const parent = node.parentNode;
      if (!parent) return;
      try {
        parent.removeChild(node);
      } catch {
        // no-op: nó já foi removido por outro ciclo
      }
    };
  }, [container]);

  useEffect(() => {
    if (!isOpen) return;
    lastFocusedRef.current = (document.activeElement as HTMLElement) || null;
    const dialog = dialogRef.current;

    const focusTarget = initialFocusSelector
      ? dialog?.querySelector(initialFocusSelector)
      : dialog?.querySelector('[autofocus]');

    const first = (focusTarget as HTMLElement) || getFocusableElements(dialog as HTMLElement)[0];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab') {
        const focusables = getFocusableElements(dialog as HTMLElement);
        if (focusables.length === 0) return;
        const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
        let nextIndex = currentIndex;
        if (e.shiftKey) {
          nextIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
        } else {
          nextIndex = currentIndex === focusables.length - 1 ? 0 : currentIndex + 1;
        }
        (focusables[nextIndex] || focusables[0]).focus();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = '';
      lastFocusedRef.current?.focus?.();
    };
  }, [isOpen, initialFocusSelector, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen || !container) return null;

  const backdropStyle: React.CSSProperties = { zIndex };
  const dialogStyle: React.CSSProperties = { zIndex: zIndex + 1 };

  return ReactDOM.createPortal(
    <div
      className={backdropClassName || 'fixed inset-0 bg-black/50 flex items-center justify-center p-4'}
      style={backdropStyle}
      onMouseDown={handleBackdropClick}
      aria-hidden={false}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={dialogClassName || 'w-full max-w-2xl bg-white dark:bg-[var(--card)] rounded-2xl shadow-2xl outline-none'}
        style={dialogStyle}
      >
        {children}
      </div>
    </div>,
    container
  );
}
