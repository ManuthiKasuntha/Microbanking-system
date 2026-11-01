import React, { useState, useEffect } from 'react';
import { toast, confirmAction } from '@/utils/notify';
import {
  collectErrors, validateContact, validateDateOfBirth, validateName, validateNic, validatePassword, PATTERNS,
} from '@/utils/validation';
import EditUserModal, { BranchOption } from './EditUserModal';
import { branchesApi, employeesApi, getErrorMessage } from '@/api';
import { formatDate } from '@/utils/format';
import { getCurrentUser } from '@/features/auth/session';

interface UserFormData {
  role: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  nic: string;
  gender: string;
  date_of_birth: string;
  branch_id: number;
  contact_no_1: string;
  contact_no_2: string;
  address: string;
  email: string;
}

interface User {
  employee_id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  nic: string;
  gender: string;
  date_of_birth: string;
  branch_id: number;
  contact_id: number;
  employee_status?: 'Active' | 'Inactive';
  created_at: string;
  contact_no_1?: string | null;
  contact_no_2?: string | null;
  address?: string | null;
  email?: string | null;
}

interface FormErrors {
  [key: string]: string;
}

const CheckIcon: React.FC = () => (
  <svg className="step-check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const UserManagement: React.FC = () => {
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const currentUserId = getCurrentUser()?.id ?? null;
  const [formData, setFormData] = useState<UserFormData>({
    role: 'Agent',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    nic: '',
    gender: 'Male',
    date_of_birth: '',
    branch_id: 0,
    contact_no_1: '',
    contact_no_2: '',
    address: '',
    email: ''
  });

  const steps = [
    { number: 1, label: 'Info 1' },
    { number: 2, label: 'Info 2' },
    { number: 3, label: 'Done' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await employeesApi.list();
      setUsers(response.data.users);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load users'));
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await branchesApi.list();
      setBranches(response.data.branches);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load branches'));
    }
  };

  const branchName = (branchId: number) =>
    branches.find((b) => b.branch_id === branchId)?.name || `#${branchId}`;

  const validateStep1 = (): boolean => {
    const username = formData.username.trim();
    const newErrors = collectErrors({
      first_name: validateName(formData.first_name, 'First name'),
      last_name: validateName(formData.last_name, 'Last name'),
      nic: validateNic(formData.nic),
      date_of_birth: validateDateOfBirth(formData.date_of_birth, { minAge: 18 }),
      username: !username
        ? 'Username is required'
        : username.length < 3 || username.length > 20
          ? 'Username must be 3-20 characters'
          : PATTERNS.username.test(username) ? undefined : 'Use letters, numbers, dots and underscores only',
      password: validatePassword(formData.password),
      role: formData.role ? undefined : 'Role is required',
      branch_id: Number(formData.branch_id) ? undefined : 'Select a branch',
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors = validateContact(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      handleAddUser();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const resetForm = () => {
    setFormData({
      role: 'Agent',
      username: '',
      password: '',
      first_name: '',
      last_name: '',
      nic: '',
      gender: 'Male',
      date_of_birth: '',
      branch_id: 0,
      contact_no_1: '',
      contact_no_2: '',
      address: '',
      email: ''
    });
    setCurrentStep(1);
    setErrors({});
    setIsSubmitted(false);
    setNewEmployeeId('');
  };

  const handleAddUser = async () => {
    setIsLoading(true);
    try {
      const response = await employeesApi.register({ ...formData, branch_id: Number(formData.branch_id) });
      
      setNewEmployeeId(response.data.employee_id);
      setIsSubmitted(true);
      setCurrentStep(3);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create user'));
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsAddingUser(false);
    resetForm();
  };

  const handleAddAnother = () => {
    resetForm();
  };

  const handleToggleUserStatus = async (user: User) => {
    const targetStatus = user.employee_status === 'Active' ? 'Inactive' : 'Active';
    if (targetStatus === 'Inactive') {
      if (!await confirmAction(`Deactivate ${user.first_name} ${user.last_name}? They won't be able to login until reactivated.`, { title: 'Deactivate user', confirmLabel: 'Deactivate', danger: true })) return;
    }

    setTogglingId(user.employee_id);
    try {
      await employeesApi.setStatus(user.employee_id, targetStatus);
      toast.success(`User "${user.first_name} ${user.last_name}" ${targetStatus === 'Active' ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update user status'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };


  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'role-badge role-admin';
      case 'manager': return 'role-badge role-manager';
      case 'agent': return 'role-badge role-agent';
      default: return 'role-badge';
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
    return (
      u.employee_id.toString().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      fullName.includes(q)
    );
  });

  return (
    <div className="user-management">
      <div className="section-header">
        <div>
          <p className="section-subtitle">Manage system users and permissions</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setIsAddingUser(true)}
        >
          <span className="btn-icon-add">+</span> Add New User
        </button>
        <div><br/></div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h4>System Users</h4>
          <div className="table-tools">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID or name..."
              className="table-search-input"
            />
            {searchTerm && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                Clear
              </button>
            )}
            <span className="user-count">{filteredUsers.length} / {users.length} user(s)</span>
          </div>
        </div>
        
        {users.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">👥</div>
            <h5>No Users Found</h5>
            <p>Get started by adding your first user to the system.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setIsAddingUser(true)}
            >
              Add First User
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>NIC</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.employee_id}>
                    <td>
                      <span className="employee-id">{user.employee_id}</span>
                    </td>
                    <td>
                      <div className="user-name">
                        <strong>{user.first_name} {user.last_name}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="user-gender">{user.gender}</span>
                    </td>
                    <td>
                      <span className="username">{user.username}</span>
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.nic}</td>
                    <td>
                      <span className="branch-id" title={`Branch #${user.branch_id}`}>{branchName(user.branch_id)}</span>
                    </td>
                    <td>
                      <span className={`role-badge ${user.employee_status === 'Active' ? 'role-manager' : 'role-agent'}`}>
                        {user.employee_status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <span className="join-date">{formatDate(user.created_at)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingUser(user)}
                          title={`Edit ${user.first_name} ${user.last_name}`}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn ${user.employee_status === 'Active' ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                          onClick={() => handleToggleUserStatus(user)}
                          disabled={togglingId === user.employee_id || (user.employee_status === 'Active' && currentUserId === user.employee_id)}
                          title={user.employee_status === 'Active' ? `Deactivate ${user.first_name} ${user.last_name}` : `Activate ${user.first_name} ${user.last_name}`}
                        >
                          {togglingId === user.employee_id ? (
                            <span className="loading-spinner"></span>
                          ) : (
                            user.employee_status === 'Active' ? 'Deactivate' : 'Activate'
                          )}
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAddingUser && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h4>Add New User</h4>
              <button 
                className="close-btn"
                onClick={handleCloseModal}
              >
                ×
              </button>
            </div>

            {!isSubmitted ? (
              <>
                <div className="stepper">
                  <div className="stepper-line-container">
                    {steps.map((step, index) => (
                      <React.Fragment key={step.number}>
                        <div className="step-item">
                          <div className={`step-circle ${
                            currentStep > step.number ? 'step-completed' :
                            currentStep === step.number ? 'step-active' : 'step-inactive'
                          }`}>
                            {currentStep > step.number ? <CheckIcon /> : step.number}
                          </div>
                          <span className={`step-label ${
                            currentStep >= step.number ? 'step-label-active' : 'step-label-inactive'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                        {index < steps.length - 1 && (
                          <div className={`step-line ${
                            currentStep > step.number ? 'step-line-completed' : 'step-line-incomplete'
                          }`} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {currentStep === 1 && (
                  <div className="form-step">
                    <h3 className="step-title">Personal & Account Details</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>First Name *</label>
                        <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter first name"
                          className={errors.first_name ? 'input-error' : ''}
                        />
                        {errors.first_name && <p className="error-message">{errors.first_name}</p>}
                      </div>

                      <div className="form-group">
                        <label>Last Name *</label>
                        <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter last name"
                          className={errors.last_name ? 'input-error' : ''}
                        />
                        {errors.last_name && <p className="error-message">{errors.last_name}</p>}
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>NIC *</label>
                        <input
                          type="text"
                          name="nic"
                          value={formData.nic}
                          onChange={handleInputChange}
                          required
                          placeholder="Enter NIC number"
                          className={errors.nic ? 'input-error' : ''}
                        />
                        {errors.nic && <p className="error-message">{errors.nic}</p>}
                      </div>

                      <div className="form-group">
                        <label>Date of Birth *</label>
                        <input
                          type="date"
                          name="date_of_birth"
                          value={formData.date_of_birth}
                          onChange={handleInputChange}
                          required
                          className={errors.date_of_birth ? 'input-error' : ''}
                        />
                        {errors.date_of_birth && <p className="error-message">{errors.date_of_birth}</p>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Gender *</label>
                      <select 
                        name="gender" 
                        value={formData.gender} 
                        onChange={handleInputChange}
                        required
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="section-divider">
                      <h5>Account Information</h5>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Role *</label>
                        <select 
                          name="role" 
                          value={formData.role} 
                          onChange={handleInputChange}
                          required
                        >
                          <option value="Agent">Agent</option>
                          <option value="Manager">Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                        {errors.role && <p className="error-message">{errors.role}</p>}
                      </div>

                      <div className="form-group">
                        <label>Branch *</label>
                        <select
                          name="branch_id"
                          value={formData.branch_id || ''}
                          onChange={handleInputChange}
                          required
                          className={errors.branch_id ? 'input-error' : ''}
                        >
                          <option value="">Select a branch</option>
                          {branches.map((b) => (
                            <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                          ))}
                        </select>
                        {errors.branch_id && <p className="error-message">{errors.branch_id}</p>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Username *</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter unique username"
                        className={errors.username ? 'input-error' : ''}
                      />
                      {errors.username && <p className="error-message">{errors.username}</p>}
                    </div>

                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        placeholder="At least 8 characters, a letter and a number"
                        className={errors.password ? 'input-error' : ''}
                      />
                      {errors.password && <p className="error-message">{errors.password}</p>}
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="form-step">
                    <h3 className="step-title">Contact Information</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Primary Phone *</label>
                        <input
                          type="tel"
                          name="contact_no_1"
                          value={formData.contact_no_1}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., 0771234567"
                          className={errors.contact_no_1 ? 'input-error' : ''}
                        />
                        {errors.contact_no_1 && <p className="error-message">{errors.contact_no_1}</p>}
                      </div>

                      <div className="form-group">
                        <label>Secondary Phone</label>
                        <input
                          type="tel"
                          name="contact_no_2"
                          value={formData.contact_no_2}
                          onChange={handleInputChange}
                          placeholder="Optional"
                          className={errors.contact_no_2 ? 'input-error' : ''}
                        />
                        {errors.contact_no_2 && <p className="error-message">{errors.contact_no_2}</p>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., john.doe@example.com"
                        className={errors.email ? 'input-error' : ''}
                      />
                      {errors.email && <p className="error-message">{errors.email}</p>}
                    </div>

                    <div className="form-group">
                      <label>Address *</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        required
                        placeholder="Full address"
                        className={errors.address ? 'input-error' : ''}
                      />
                      {errors.address && <p className="error-message">{errors.address}</p>}
                    </div>
                  </div>
                )}

                <div className="stepper-actions">
                  <button 
                    type="button" 
                    className="btn-back"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    className="btn-next"
                    onClick={handleNext}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="loading-spinner"></span>
                        Creating...
                      </>
                    ) : (
                      currentStep === 2 ? 'Create User' : 'Next'
                    )}
                  </button>
                </div>
              </>
            ) : null}
            
            {isSubmitted && (
              <div className="success-state">
                <div className="success-icon-large">
                  <CheckIcon />
                </div>
                <h2>User Created Successfully!</h2>
                <div className="success-details">
                  <p><strong>Employee ID:</strong> {newEmployeeId}</p>
                  <p><strong>Name:</strong> {formData.first_name} {formData.last_name}</p>
                  <p><strong>Role:</strong> {formData.role}</p>
                  <p><strong>Username:</strong> {formData.username}</p>
                </div>
                <div className="success-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                  >
                    Close
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleAddAnother}
                  >
                    Add Another User
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          branches={branches}
          isSelf={editingUser.employee_id === currentUserId}
          onClose={() => setEditingUser(null)}
          onSaved={fetchUsers}
        />
      )}
    </div>
  );
};

export default UserManagement;