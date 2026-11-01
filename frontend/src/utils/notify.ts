// Tiny event bus so any component (or plain function) can show a toast or ask for confirmation
// without prop drilling. <Toaster /> and <ConfirmDialog /> in App subscribe to these events.

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  message: string;
  resolve: (confirmed: boolean) => void;
}

const toastListeners = new Set<(toast: ToastMessage) => void>();
const confirmListeners = new Set<(request: ConfirmRequest) => void>();
let nextId = 1;

const emitToast = (kind: ToastKind, text: string) => {
  const toast = { id: nextId++, kind, text };
  toastListeners.forEach((listener) => listener(toast));
};

export const toast = {
  success: (text: string) => emitToast('success', text),
  error: (text: string) => emitToast('error', text),
  info: (text: string) => emitToast('info', text),
};

export const subscribeToToasts = (listener: (toast: ToastMessage) => void) => {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
};

export const confirmAction = (message: string, options: ConfirmOptions = {}): Promise<boolean> =>
  new Promise((resolve) => {
    if (confirmListeners.size === 0) {
      resolve(window.confirm(message));
      return;
    }
    confirmListeners.forEach((listener) => listener({ message, resolve, ...options }));
  });

export const subscribeToConfirms = (listener: (request: ConfirmRequest) => void) => {
  confirmListeners.add(listener);
  return () => {
    confirmListeners.delete(listener);
  };
};
