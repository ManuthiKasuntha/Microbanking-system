import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getErrorMessage } from '../api/client';
import { toast, confirmAction } from '../utils/notify';
import { validateContact } from '../utils/validation';

interface Branch {
  branch_id: number;
  name: string;
  contact_id: number;
  created_at: string;
  contact_no_1: string;
  contact_no_2: string;
  address: string;
  email: string;
}

interface BranchFormData {
  name: string;
  contact_no_1: string;
  contact_no_2: string;
  address: string;
  email: string;
}

interface FormErrors {
  [key: string]: string;
}

const EMPTY_FORM: BranchFormData = { name: '', contact_no_1: '', contact_no_2: '', address: '', email: '' };

const BranchManagement: React.FC = () => {
  const [isAddingBranch, setIsAddingBranch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<BranchFormData>(EMPTY_FORM);

  useEffect(() => {
    fetchBranches();
  }, []);

const fetchBranches = async () => {
  try {
    const result = await axios.get('/api/admin/branches');
    setBranches(result.data.branches);
  } catch (error) {
    console.error('Failed to fetch branches:', error);
    toast.error('Failed to load branches');
  }
};

  const validateForm = (): boolean => {
    const newErrors: FormErrors = validateContact(formData);
    const name = formData.name.trim();
    if (!name) newErrors.name = 'Branch name is required';
    else if (name.length < 2 || name.length > 50) newErrors.name = 'Branch name must be 2-50 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openEditForm = (branch: Branch) => {
    setEditingBranchId(branch.branch_id);
    setFormData({
      name: branch.name,
      contact_no_1: branch.contact_no_1 || '',
      contact_no_2: branch.contact_no_2 || '',
      address: branch.address || '',
      email: branch.email || '',
    });
    setErrors({});
    setIsAddingBranch(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (editingBranchId) {
        await axios.put(`/api/admin/branches/${editingBranchId}`, formData);
        toast.success(`Branch "${formData.name}" updated successfully`);
      } else {
        await axios.post('/api/admin/branches', formData);
        toast.success(`Branch "${formData.name}" created successfully`);
      }
      clearForm();
      fetchBranches();
    } catch (error) {
      toast.error(getErrorMessage(error, editingBranchId ? 'Failed to update branch' : 'Failed to create branch'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBranch = async (branchId: number, branchName: string) => {
    if (!await confirmAction(`Are you sure you want to delete branch "${branchName}"? This action will also remove associated contact information.`, { title: 'Delete branch', confirmLabel: 'Delete', danger: true })) {
      return;
    }

    setIsDeleting(branchId);
    try {
      await axios.delete(`/api/admin/branches/${branchId}`);
      
      toast.success(`Branch "${branchName}" deleted successfully`);
      fetchBranches();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete branch'));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const clearForm = () => {
    setFormData(EMPTY_FORM);
    setErrors({});
    setEditingBranchId(null);
    setIsAddingBranch(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredBranches = branches.filter((b) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      b.branch_id.toString().includes(q) ||
      b.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="branch-management">
      <div className="section-header">
        <div>
          <p className="section-subtitle">Manage bank branches and their contact information</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setIsAddingBranch(true)}
        >
          <span className="btn-icon-add">+</span> Add New Branch
        </button>
        <div><br/></div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h4>Bank Branches</h4>
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
            <span className="branch-count">
              {filteredBranches.length} / {branches.length} branch(es)
            </span>
          </div>
        </div>
        
        {branches.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">🏦</div>
            <h5>No Branches Found</h5>
            <p>Get started by adding your first branch to the system.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setIsAddingBranch(true)}
            >
              Add First Branch
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="branches-table">
              <thead>
                <tr>
                  <th>Branch ID</th>
                  <th>Branch Name</th>
                  <th>Contact Number</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch) => (
                  <tr key={branch.branch_id} className={isDeleting === branch.branch_id ? 'deleting' : ''}>
                    <td>
                      <span className="branch-id">{branch.branch_id}</span>
                    </td>
                    <td>
                      <strong>{branch.name}</strong>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div className="primary-contact">{branch.contact_no_1}</div>
                        {branch.contact_no_2 && (
                          <div className="secondary-contact">{branch.contact_no_2}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="branch-email">{branch.email}</span>
                    </td>
                    <td>
                      <span className="branch-address" title={branch.address}>
                        {branch.address}
                      </span>
                    </td>
                    <td>
                      <span className="created-date">{formatDate(branch.created_at)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditForm(branch)}
                          title={`Edit ${branch.name}`}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteBranch(branch.branch_id, branch.name)}
                          disabled={isDeleting === branch.branch_id}
                          title={`Delete ${branch.name}`}
                        >
                          {isDeleting === branch.branch_id ? (
                            <span className="loading-spinner"></span>
                          ) : (
                            'Delete'
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

      {isAddingBranch && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h4>{editingBranchId ? `Edit Branch #${editingBranchId}` : 'Add New Branch'}</h4>
              <button 
                className="close-btn"
                onClick={clearForm}
              >
                ×
              </button>
            </div>

            <form className="branch-form" onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label>Branch Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Main Branch, Colombo"
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Primary Contact Number *</label>
                  <input
                    type="text"
                    name="contact_no_1"
                    value={formData.contact_no_1}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., +94112345678"
                    className={errors.contact_no_1 ? 'error' : ''}
                  />
                  {errors.contact_no_1 && <span className="error-text">{errors.contact_no_1}</span>}
                </div>

                <div className="form-group">
                  <label>Secondary Contact Number</label>
                  <input
                    type="text"
                    name="contact_no_2"
                    value={formData.contact_no_2}
                    onChange={handleInputChange}
                    placeholder="e.g., +94112345679"
                    className={errors.contact_no_2 ? 'error' : ''}
                  />
                  {errors.contact_no_2 && <span className="error-text">{errors.contact_no_2}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., branch@microbank.com"
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 123 Main Street, Colombo 01"
                  className={errors.address ? 'error' : ''}
                />
                {errors.address && <span className="error-text">{errors.address}</span>}
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-back"
                  onClick={clearForm}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-next"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    editingBranchId ? 'Save Changes' : 'Create Branch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchManagement;