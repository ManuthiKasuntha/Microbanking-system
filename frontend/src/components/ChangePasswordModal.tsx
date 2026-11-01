import React, { useState } from 'react';
import axios from 'axios';
import { getErrorMessage } from '../api/client';
import { toast } from '../utils/notify';
import { collectErrors, FormErrors, validatePassword } from '../utils/validation';

interface Props {
  onClose: () => void;
}

const EMPTY = { current_password: '', new_password: '', confirm_password: '' };

const ChangePasswordModal: React.FC<Props> = ({ onClose }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const found = collectErrors({
      current_password: form.current_password ? undefined : 'Current password is required',
      new_password:
        validatePassword(form.new_password) ||
        (form.new_password === form.current_password ? 'New password must be different' : undefined),
      confirm_password: form.confirm_password === form.new_password ? undefined : 'Passwords do not match',
    });
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors(({ [e.target.name]: _removed, ...rest }) => rest);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await axios.put('/api/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      toast.success('Password changed successfully');
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  const field = (name: keyof typeof EMPTY, label: string, autoComplete: string) => (
    <div className="form-group">
      <label htmlFor={name}>{label} *</label>
      <input
        id={name}
        type="password"
        name={name}
        value={form[name]}
        onChange={handleChange}
        autoComplete={autoComplete}
        className={errors[name] ? 'error' : ''}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && <span className="error-text">{errors[name]}</span>}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
        <div className="modal-header">
          <h4 id="change-password-title">Change Password</h4>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form className="dialog-body" onSubmit={handleSubmit} noValidate>
          {field('current_password', 'Current Password', 'current-password')}
          {field('new_password', 'New Password', 'new-password')}
          {field('confirm_password', 'Confirm New Password', 'new-password')}
          <p className="field-hint">At least 8 characters, including a letter and a number.</p>
          <div className="form-actions">
            <button type="button" className="btn-back" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-next" disabled={saving}>
              {saving ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
