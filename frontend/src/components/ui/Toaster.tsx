import React, { useEffect, useState } from 'react';
import { subscribeToToasts, ToastMessage } from '@/utils/notify';

const DISPLAY_MS = { success: 4000, info: 4000, error: 7000 };
const ICONS = { success: '✓', error: '!', info: 'i' };

const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = (id: number) => setToasts((current) => current.filter((t) => t.id !== id));

  useEffect(
    () =>
      subscribeToToasts((toast) => {
        setToasts((current) => [...current.slice(-3), toast]);
        setTimeout(() => dismiss(toast.id), DISPLAY_MS[toast.kind]);
      }),
    []
  );

  return (
    <div className="toaster" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span className="toast-icon" aria-hidden="true">{ICONS[t.kind]}</span>
          <span className="toast-text">{t.text}</span>
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toaster;
