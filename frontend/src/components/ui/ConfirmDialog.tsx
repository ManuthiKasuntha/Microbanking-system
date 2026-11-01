import React, { useEffect, useRef, useState } from 'react';
import { ConfirmRequest, subscribeToConfirms } from '../../utils/notify';

const ConfirmDialog: React.FC = () => {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);

  useEffect(() => subscribeToConfirms(setRequest), []);

  useEffect(() => {
    if (!request) return;
    confirmButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const close = (confirmed: boolean) => {
    request?.resolve(confirmed);
    setRequest(null);
  };

  if (!request) return null;

  return (
    <div className="modal-overlay" onClick={() => close(false)}>
      <div
        className="modal-content confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h4 id="confirm-title">{request.title || 'Please confirm'}</h4>
        </div>
        <div className="dialog-body">
          <p className="confirm-message">{request.message}</p>
          <div className="form-actions">
            <button type="button" className="btn-back" onClick={() => close(false)}>
              {request.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              ref={confirmButton}
              className={request.danger ? 'btn btn-danger' : 'btn-next'}
              onClick={() => close(true)}
            >
              {request.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
