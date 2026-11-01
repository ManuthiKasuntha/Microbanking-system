import React, { useState, useEffect } from 'react';
import { toast } from '@/utils/notify';
import { teamApi } from '@/api';
import { formatCurrency, formatDate } from '@/utils/format';
import { ageOn } from '@/utils/validation';

interface Account {
  account_id: number;
  open_date: string;
  account_status: string;
  balance: number;
  saving_plan_id: number;
  branch_id: number;
  customer_id: number;
  first_name: string;
  last_name: string;
  nic: string;
  gender: string;
  date_of_birth: string;
  contact_no_1: string;
  email: string;
  address: string;
  plan_type: string;
  interest: number;
  min_balance: number;
}

interface AccountSummary {
  total_accounts: number;
  active_accounts: number;
  closed_accounts: number;
  total_balance: number;
  average_balance: number;
}

const CustomerAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('balance');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const response = await teamApi.branchAccounts();
      setAccounts(response.data.accounts);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      toast.error('Failed to load customer accounts');
    } finally {
      setIsLoading(false);
    }
  };




  const getStatusBadgeClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active': return 'status-badge status-active';
      case 'closed': return 'status-badge status-closed';
      default: return 'status-badge';
    }
  };

  const getPlanBadgeClass = (planType: string): string => {
    switch (planType.toLowerCase()) {
      case 'children': return 'plan-badge plan-children';
      case 'teen': return 'plan-badge plan-teen';
      case 'adult': return 'plan-badge plan-adult';
      case 'senior': return 'plan-badge plan-senior';
      case 'joint': return 'plan-badge plan-joint';
      default: return 'plan-badge';
    }
  };

  const filteredAccounts = accounts
    .filter(account => {
      const term = searchTerm.trim().toUpperCase();
      const isAllDigits = /^[0-9]+$/.test(term);
      const isTwelveDigitNic = /^[0-9]{12}$/.test(term);
      const isOldNic = /^[0-9]{9}V$/.test(term);

      let matchesSearch = true;
      if (term) {
        if (isAllDigits && !isTwelveDigitNic) {
          matchesSearch = account.account_id.toString() === term;
        } else if (isTwelveDigitNic || isOldNic) {
          matchesSearch = account.nic.toUpperCase() === term;
        } else {
          matchesSearch = false;
        }
      }

      const matchesStatus = statusFilter === 'all' || account.account_status.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: string | number = a[sortBy as keyof Account] as string | number;
      let bValue: string | number = b[sortBy as keyof Account] as string | number;
      
      if (sortBy === 'balance') {
        aValue = parseFloat(String(aValue));
        bValue = parseFloat(String(bValue));
      } else if (sortBy === 'open_date') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline', marginLeft: '4px', opacity: 0.4}}>
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
      );
    }
    return sortOrder === 'asc' ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline', marginLeft: '4px'}}>
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{display: 'inline', marginLeft: '4px'}}>
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
      </svg>
    );
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading customer accounts...</p>
      </div>
    );
  }

  return (
    <div className="customer-accounts">
      <div className="reports-header">
        <div className="header-title">
          <h4>Customer Accounts</h4>
          <p className="section-subtitle">Manage and view all customer accounts in your branch</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={fetchAccounts}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh
        </button>
      </div>

      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
            </div>
            <div className="summary-info">
              <h4>Total Accounts</h4>
              <div className="summary-value">{summary.total_accounts}</div>
              <div className="summary-detail">
                <span className="active">{summary.active_accounts} Active</span> · 
                <span className="inactive"> {summary.closed_accounts} Closed</span>
              </div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div className="summary-info">
              <h4>Total Balance</h4>
              <div className="summary-value">{formatCurrency(summary.total_balance)}</div>
              <div className="summary-detail">
                Avg: {formatCurrency(summary.average_balance)}
              </div>
            </div>
          </div>
          
          <div className="summary-card">
            <div className="summary-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="summary-info">
              <h4>Unique Customers</h4>
              <div className="summary-value">{new Set(accounts.map(acc => acc.customer_id)).size}</div>
              <div className="summary-detail">
                {accounts.length} Total Accounts
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="filters-section">
        <div className="search-box">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search by Account ID or exact NIC/Birth Certificate (e.g., 123456789V or 12 digits)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
        
        <div className="filter-controls">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="balance">Sort by Balance</option>
            <option value="open_date">Sort by Open Date</option>
            <option value="first_name">Sort by Name</option>
            <option value="account_id">Sort by Account ID</option>
          </select>
        </div>
      </div>

      <div className="accounts-list">
        <div className="list-header">
          <h4>Account Details</h4>
          <span className="results-count">
            {filteredAccounts.length} of {accounts.length} accounts
          </span>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="no-data">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="3" y1="9" x2="21" y2="9"></line>
              <line x1="9" y1="21" x2="9" y2="9"></line>
            </svg>
            <h5>No Accounts Found</h5>
            <p>No accounts match your search criteria.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="accounts-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('account_id')}>
                    Account ID {getSortIcon('account_id')}
                  </th>
                  <th onClick={() => handleSort('first_name')}>
                    Customer {getSortIcon('first_name')}
                  </th>
                  <th>Customer Details</th>
                  <th onClick={() => handleSort('balance')}>
                    Balance {getSortIcon('balance')}
                  </th>
                  <th>Account Type</th>
                  <th onClick={() => handleSort('open_date')}>
                    Open Date {getSortIcon('open_date')}
                  </th>
                  <th>Status</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(account => (
                  <tr key={account.account_id} className="account-row">
                    <td>
                      <div className="account-id">{account.account_id}</div>
                      <div className="branch-id">Branch: {account.branch_id}</div>
                    </td>
                    
                    <td>
                      <div className="customer-name">
                        <strong>{account.first_name} {account.last_name}</strong>
                      </div>
                      <div className="customer-nic">NIC: {account.nic}</div>
                    </td>
                    
                    <td>
                      <div className="customer-details">
                        <div className="detail-item">
                          <span className="detail-label">Age:</span>
                          <span>{ageOn(account.date_of_birth)} years</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Gender:</span>
                          <span>{account.gender}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Customer ID:</span>
                          <span>{account.customer_id}</span>
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div className="balance-amount">
                        {formatCurrency(account.balance)}
                      </div>
                      {account.account_status === 'Active' && account.min_balance > 0 && account.balance < account.min_balance && (
                        <div className="min-balance-warning">
                          Below min: {formatCurrency(account.min_balance)}
                        </div>
                      )}
                    </td>
                    
                    <td>
                      <div className="account-type">
                        <span className={getPlanBadgeClass(account.plan_type)}>
                          {account.plan_type}
                        </span>
                        <div className="interest-rate">
                          {account.interest}% interest
                        </div>
                      </div>
                    </td>
                    
                    <td>
                      <div className="open-date">
                        {formatDate(account.open_date)}
                      </div>
                      <div className="account-age">
                        {Math.floor((new Date().getTime() - new Date(account.open_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
                      </div>
                    </td>
                    
                    <td>
                      <span className={getStatusBadgeClass(account.account_status)}>
                        {account.account_status}
                      </span>
                    </td>
                    
                    <td>
                      <div className="contact-info">
                        <div className="contact-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          {account.contact_no_1}
                        </div>
                        <div className="contact-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                          <span className="email" title={account.email}>
                            {account.email.length > 20 ? account.email.substring(0, 20) + '...' : account.email}
                          </span>
                        </div>
                        <div className="contact-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                          </svg>
                          <span className="address" title={account.address}>
                            {account.address.length > 25 ? account.address.substring(0, 25) + '...' : account.address}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerAccounts;