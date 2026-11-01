import React, { useState } from 'react';
import { toast } from '@/utils/notify';
import { collectErrors, FormErrors, validateContact, validateName } from '@/utils/validation';
import { employeesApi, getErrorMessage } from '@/api';

export interface EditableUser {
  employee_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id: number;
  contact_no_1?: string | null;
  contact_no_2?: string | null;
  address?: string | null;
  email?: string | null;
}

export interface BranchOption {
  branch_id: number;
  name: string;
}

interface Props {
  user: EditableUser;
  branches: BranchOption[];
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const EditUserModal: React.FC<Props> = ({ user, branches, isSelf, onClose, onSaved }) => {
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    branch_id: user.branch_id,
    contact_no_1: user.contact_no_1 || '',
    contact_no_2: user.contact_no_2 || '',
    address: user.address || '',
    email: user.email || '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: name === 'branch_id' ? Number(value) : value });
    setErrors(({ [name]: _removed, ...rest }) => rest);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = {
      ...collectErrors({
        first_name: validateName(form.first_name, 'First name'),
        last_name: validateName(form.last_name, 'Last name'),
        branch_id: form.branch_id ? undefined : 'Select a branch',
      }),
      ...validateContact(form),
    };
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await employeesApi.update(user.employee_id, form);
      toast.success(`${form.first_name} ${form.last_name} updated successfully`);
      onSaved();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  const input = (name: keyof typeof form, label: string, type = 'text', required = true) => (
    <div className="form-group">
      <label htmlFor={`edit-${name}`}>{label}{required && ' *'}</label>
      <input
        id={`edit-${name}`}
        type={type}
        name={name}
        value={form[name]}
        onChange={handleChange}
        className={errors[name] ? 'input-error' : ''}
        aria-invalid={!!errors[name]}
      />
      {errors[name] && <p className="error-message">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
        <div className="modal-header">
          <h4 id="edit-user-title">Edit User: {user.username}</h4>
          <button className="close-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form className="form-step" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            {input('first_name', 'First Name')}
            {input('last_name', 'Last Name')}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-role">Role *</label>
              <select id="edit-role" name="role" value={form.role} onChange={handleChange} disabled={isSelf}>
                <option value="Agent">Agent</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
              {isSelf && <p className="field-hint">You cannot change your own role.</p>}
            </div>
            <div className="form-group">
              <label htmlFor="edit-branch_id">Branch *</label>
              <select
                id="edit-branch_id"
                name="branch_id"
                value={form.branch_id}
                onChange={handleChange}
                className={errors.branch_id ? 'input-error' : ''}
              >
                {branches.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                ))}
              </select>
              {errors.branch_id && <p className="error-message">{errors.branch_id}</p>}
            </div>
          </div>
          <div className="form-row">
            {input('contact_no_1', 'Primary Phone', 'tel')}
            {input('contact_no_2', 'Secondary Phone', 'tel', false)}
          </div>
          {input('email', 'Email', 'email')}
          {input('address', 'Address')}
          <div className="form-actions">
            <button type="button" className="btn-back" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-next" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
