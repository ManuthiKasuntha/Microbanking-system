import React, { useState, useEffect } from 'react';
import { toast } from '@/utils/notify';
import { accountsApi, getErrorMessage, referenceApi, transactionsApi } from '@/api';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { usePersistentState } from '@/hooks/usePersistentState';

interface TransactionFormData {
  account_id: number;
  transaction_type: 'Deposit' | 'Withdrawal';
  amount: string;
  description: string;
}

interface Transaction {
  transaction_id: number;
  transaction_type: string;
  amount: number;
  time: string;
  description: string;
  account_id: number;
  employee_id: number;
}

interface Account {
  account_id: number;
  balance: number;
  account_status: string;
  customer_names: string;
  saving_plan_id?: number;
  plan_type?: string;
  min_balance?: number;
}

interface FormErrors {
  [key: string]: string;
}

interface SavingPlan {
  saving_plan_id: number;
  plan_type: string;
  interest: number;
  min_balance: number;
}

const TransactionProcessing: React.FC = () => {
  const [activeTab, setActiveTab] = usePersistentState<'process' | 'history'>(
    'transactionProcessing.activeTab',
    'process',
    (saved) => saved === 'history'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]);
  const [formData, setFormData] = useState<TransactionFormData>({
    account_id: 0,
    transaction_type: 'Deposit',
    amount: '',
    description: ''
  });

  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  useEffect(() => {
    fetchRecentTransactions();
    fetchAccounts();
    fetchSavingPlans();
  }, []);

  const fetchRecentTransactions = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await transactionsApi.listRecent();
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await accountsApi.listAll();
      setAccounts(response.data.accounts);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchSavingPlans = async () => {
    try {
      const response = await referenceApi.savingPlans();
      setSavingPlans(response.data.saving_plans || response.data || []);
    } catch (error) {
      console.error('Failed to fetch saving plans:', error);
    }
  };

  const numericSearch = accountSearch.replace(/\D/g, '');
  const filteredAccounts = numericSearch.length === 0
    ? []
    : accounts
        .filter(account => account.account_status?.toLowerCase() === 'active')
        .filter(account => account.account_id.toString().includes(numericSearch));

  const handleAccountSelect = (account: Account) => {
    setFormData(prev => ({
      ...prev,
      account_id: account.account_id
    }));
    setAccountSearch(`${account.account_id} - ${account.customer_names} - ${account.plan_type}`);
    setShowAccountDropdown(false);
  };

  const handleAccountSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAccountSearch(value);
    const numericTerm = value.replace(/\D/g, '');
    setShowAccountDropdown(numericTerm.length > 0);
    
    if (!value.trim()) {
      setFormData(prev => ({
        ...prev,
        account_id: 0
      }));
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowAccountDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const parseAmount = (amountStr: string): number => {
    const amount = parseFloat(amountStr);
    return isNaN(amount) ? 0 : amount;
  };

  const getAccountMinBalance = (account: Account): number => {
    if (account.min_balance) {
      return account.min_balance;
    }
    
    const savingPlan = savingPlans.find(plan => plan.saving_plan_id === account.saving_plan_id);
    return savingPlan ? savingPlan.min_balance : 0;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.account_id) {
      newErrors.account_id = 'Account ID is required';
    }
    
    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else {
      const amount = parseAmount(formData.amount);
      if (amount <= 0) {
        newErrors.amount = 'Amount must be a positive number';
      } else if (formData.transaction_type === 'Withdrawal') {
        const selectedAccount = accounts.find(acc => acc.account_id === formData.account_id);
        if (selectedAccount) {
          const minBalance = getAccountMinBalance(selectedAccount);
          const newBalance = selectedAccount.balance - amount;
          
          if (newBalance < minBalance-0.00) {
            const maxWithdrawal = selectedAccount.balance - minBalance;
            newErrors.amount = `Withdrawal would violate minimum balance requirement. Maximum withdrawal: LKR ${maxWithdrawal.toLocaleString()}`;
          }
        }
      }
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProcessTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const response = await transactionsApi.process({
        ...formData,
        amount: parseAmount(formData.amount)
      });
      
      setSuccessMessage(`Transaction processed successfully! Transaction ID: ${response.data.transaction_id}`);
      setFormData({
        account_id: 0,
        transaction_type: 'Deposit',
        amount: '',
        description: ''
      });
      setAccountSearch('');
      setErrors({});
      
      fetchRecentTransactions();
      fetchAccounts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to process transaction'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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



  const getTransactionTypeClass = (type: string): string => {
    switch (type) {
      case 'Deposit': return 'transaction-type deposit';
      case 'Withdrawal': return 'transaction-type withdrawal';
      case 'Interest': return 'transaction-type interest';
      default: return 'transaction-type';
    }
  };

  const getSelectedAccount = () => {
    return accounts.find(acc => acc.account_id === formData.account_id);
  };

  const calculateNewBalance = (): number => {
    // API may return balance as a string
    const rawBalance = getSelectedAccount()?.balance ?? 0;
    const currentBalance = typeof rawBalance === 'number' ? rawBalance : parseFloat(String(rawBalance));
    const amount = parseAmount(formData.amount);

    if (formData.transaction_type === 'Deposit') {
      return currentBalance + amount;
    }
    return currentBalance - amount;
  };

  const getMaxWithdrawal = (): number => {
    const selectedAccount = getSelectedAccount();
    if (!selectedAccount) return 0;
    
    const minBalance = getAccountMinBalance(selectedAccount);
    return Math.max(0, selectedAccount.balance - minBalance);
  };

  return (
    <div className="transaction-processing">
      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✓</span>
          {successMessage}
          <button 
            className="close-btn"
            onClick={() => setSuccessMessage('')}
          >
            ×
          </button>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'process' ? 'active' : ''}`}
          onClick={() => setActiveTab('process')}
        >
          Process Transaction
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Transaction History
        </button>
      </div>

      {activeTab === 'process' && (
        <div className="tab-content">
          <div className="transaction-form-container">
            <form className="transaction-form" onSubmit={handleProcessTransaction}>
              <div className="form-row">
                <div className="form-group">
                  <label>Search Account *</label>
                  <div className="searchable-dropdown">
                    <input
                      type="text"
                      value={accountSearch}
                      onChange={handleAccountSearchChange}
                      onFocus={() => setShowAccountDropdown(true)}
                      placeholder="Search by Account ID..."
                      className={errors.account_id ? 'error' : ''}
                      required
                    />
                    {showAccountDropdown && filteredAccounts.length > 0 && (
                      <div className="dropdown-menu">
                        {filteredAccounts.map(account => (
                          <div
                            key={account.account_id}
                            className="dropdown-item"
                            onClick={() => handleAccountSelect(account)}
                          >
                            <div className="account-option">
                              <div className="account-id">{account.account_id}</div>
                              <div className="account-details">
                                <span className="customer-names">{account.customer_names}</span>
                                <span className="plan-type">{account.plan_type}</span>
                                <span className="balance">{formatCurrency(account.balance)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {showAccountDropdown && filteredAccounts.length === 0 && accountSearch && (
                      <div className="dropdown-menu">
                        <div className="dropdown-item no-results">
                          No accounts found matching "{accountSearch}"
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.account_id && <span className="error-text">{errors.account_id}</span>}
                </div>

                <div className="form-group">
                  <label>Transaction Type *</label>
                  <select 
                    name="transaction_type" 
                    value={formData.transaction_type} 
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Deposit">Deposit</option>
                    <option value="Withdrawal">Withdrawal</option>
                  </select>
                </div>
              </div>

              {getSelectedAccount() && (
                <div className="account-info">
                  <div className="balance-display">
                    <span className="balance-label">Current Balance: </span>
                    <span className="balance-amount">
                      {formatCurrency(getSelectedAccount()!.balance)}
                    </span>
                    <span className={`account-status ${getSelectedAccount()?.account_status.toLowerCase()}`}>
                      {getSelectedAccount()?.account_status}
                    </span>
                  </div>
                  <div className="account-details">
                    <div className="detail-row">
                      <span>Plan Type: </span>
                      <strong>{getSelectedAccount()?.plan_type || 'Unknown'}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Minimum Balance:</span>
                      <strong>{formatCurrency(getAccountMinBalance(getSelectedAccount()!))}</strong>
                    </div>
                    {formData.transaction_type === 'Withdrawal' && (
                      <div className="detail-row warning">
                        <span>Maximum Withdrawal:</span>
                        <strong>{formatCurrency(getMaxWithdrawal())}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Amount (LKR) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter amount"
                  step="0.01"
                  min="0.01"
                  className={errors.amount ? 'error' : ''}
                />
                {errors.amount && <span className="error-text">{errors.amount}</span>}
                {formData.transaction_type === 'Withdrawal' && formData.account_id && (
                  <small className="form-help">
                    Maximum withdrawal: {formatCurrency(getMaxWithdrawal())}
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter transaction description"
                  rows={3}
                  className={errors.description ? 'error' : ''}
                />
                {errors.description && <span className="error-text">{errors.description}</span>}
              </div>

              {formData.amount && formData.account_id && parseAmount(formData.amount) > 0 && (
                <div className="transaction-summary">
                  <h5>Transaction Summary</h5>
                  <div className="summary-details">
                    <div className="summary-row">
                      <span>Account:</span>
                      <span>{formData.account_id}</span>
                    </div>
                    <div className="summary-row">
                      <span>Type:</span>
                      <span className={getTransactionTypeClass(formData.transaction_type)}>
                        {formData.transaction_type}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Amount:</span>
                      <span className="amount">{formatCurrency(parseAmount(formData.amount))}</span>
                    </div>
                    <div className="summary-row">
                      <span>New Balance:</span>
                      <span className="new-balance">
                        {formatCurrency(calculateNewBalance())}
                      </span>
                    </div>
                    {formData.transaction_type === 'Withdrawal' && (
                      <div className="summary-row">
                        <span>Remaining Above Minimum:</span>
                        <span className={
                          calculateNewBalance() >= getAccountMinBalance(getSelectedAccount()!) 
                            ? 'text-success' 
                            : 'text-danger'
                        }>
                          {formatCurrency(calculateNewBalance() - getAccountMinBalance(getSelectedAccount()!))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-next"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    `Process ${formData.transaction_type}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="tab-content">
          <div className="history-header">
            <h4>Recent Transactions</h4>
            <button 
              className="btn btn-secondary"
              onClick={fetchRecentTransactions}
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
            <div><br/></div>
          </div>

          {transactions.length === 0 ? (
            <div className="no-data">
              <div className="no-data-icon">📋</div>
              <h5>No Transactions Found</h5>
              <p>No transactions have been processed yet.</p>
            </div>
          ) : (
            <div className="table-container">
              <div className="table-wrapper">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Account</th>
                      <th>Description</th>
                      <th>Date & Time</th>
                      <th>Processed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.transaction_id}>
                        <td>
                          <span className="transaction-id">{transaction.transaction_id}</span>
                        </td>
                        <td>
                          <span className={getTransactionTypeClass(transaction.transaction_type)}>
                            {transaction.transaction_type}
                          </span>
                        </td>
                        <td>
                          <span className={`amount ${transaction.transaction_type.toLowerCase()}`}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td>
                          <span className="account-id">{transaction.account_id}</span>
                        </td>
                        <td>
                          <span className="description" title={transaction.description}>
                            {transaction.description}
                          </span>
                        </td>
                        <td>
                          <span className="datetime">{formatDateTime(transaction.time)}</span>
                        </td>
                        <td>
                          <span className="employee-id">{transaction.employee_id}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransactionProcessing;
