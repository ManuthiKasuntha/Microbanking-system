import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from '@/utils/notify';
import { teamApi } from '@/api';
import { formatCurrency, formatDateTime } from '@/utils/format';

interface BranchTransaction {
  transaction_id: number;
  transaction_type: string;
  amount: number;
  time: string;
  description: string;
  account_id: number;
  employee_id: number;
  employee_name: string;
}

interface TransactionSummary {
  total_deposits: number;
  total_withdrawals: number;
  net_flow: number;
  transaction_count: number;
}

const TransactionReports: React.FC = () => {
  const [transactions, setTransactions] = useState<BranchTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const fetchTransactionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await teamApi.branchTransactions(dateRange);
      setTransactions(response.data.transactions);
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load transaction data');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchTransactionData();
  }, [fetchTransactionData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = new Date(today.setDate(today.getDate() - 1));
        end = start;
        break;
      case 'last7days':
        start = new Date(today.setDate(today.getDate() - 7));
        end = new Date();
        break;
      case 'last30days':
        start = new Date(today.setDate(today.getDate() - 30));
        end = new Date();
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisQuarter': {
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date();
        break;
      }
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date();
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
    setShowDatePicker(false);
  };



  return (
    <div className="transaction-reports">
      <div className="reports-header">
        <div className="header-title">
          <p className="section-subtitle">View branch transactions and financial summary</p>
        </div>
        <div className="report-controls">
          <div className="date-range-container" ref={datePickerRef}>
            <button 
              className="date-range-toggle"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span className="date-display">
                {new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {showDatePicker && (
              <div className="date-picker-dropdown">
                <div className="date-presets">
                  <h5>Quick Select</h5>
                  <button onClick={() => applyDatePreset('today')}>Today</button>
                  <button onClick={() => applyDatePreset('yesterday')}>Yesterday</button>
                  <button onClick={() => applyDatePreset('last7days')}>Last 7 Days</button>
                  <button onClick={() => applyDatePreset('last30days')}>Last 30 Days</button>
                  <button onClick={() => applyDatePreset('thisMonth')}>This Month</button>
                  <button onClick={() => applyDatePreset('lastMonth')}>Last Month</button>
                  <button onClick={() => applyDatePreset('thisQuarter')}>This Quarter</button>
                  <button onClick={() => applyDatePreset('thisYear')}>This Year</button>
                </div>
                <div className="date-custom">
                  <h5>Custom Range</h5>
                  <div className="date-inputs">
                    <div className="input-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>
                    <div className="input-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button 
                    className="apply-custom-date"
                    onClick={() => setShowDatePicker(false)}
                  >
                    Apply Custom Range
                  </button>
                </div>
              </div>
            )}
          </div>
          <button 
            className="btn btn-primary"
            onClick={fetchTransactionData}
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div className="summary-info">
              <h4>Total Transactions</h4>
              <div className="summary-value">{summary.transaction_count}</div>
            </div>
          </div>
          <div className="summary-card deposit">
            <div className="summary-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </div>
            <div className="summary-info">
              <h4>Total Deposits</h4>
              <div className="summary-value">{formatCurrency(summary.total_deposits)}</div>
            </div>
          </div>
          <div className="summary-card withdrawal">
            <div className="summary-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </div>
            <div className="summary-info">
              <h4>Total Withdrawals</h4>
              <div className="summary-value">{formatCurrency(summary.total_withdrawals)}</div>
            </div>
          </div>
          <div className={`summary-card ${summary.net_flow >= 0 ? 'deposit' : 'withdrawal'}`}>
            <div className="summary-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <div className="summary-info">
              <h4>Net Flow</h4>
              <div className="summary-value">
                {formatCurrency(summary.net_flow)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="transactions-list">
        <div className="list-header">
          <h4>Recent Branch Transactions</h4>
          {!isLoading && transactions.length > 0 && (
            <span className="transaction-count">{transactions.length} transactions</span>
          )}
        </div>
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="no-data">
            <p>No transactions found for the selected period.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Account</th>
                  <th>Agent</th>
                  <th>Description</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(transaction => (
                  <tr key={transaction.transaction_id}>
                    <td>{transaction.transaction_id}</td>
                    <td>
                      <span className={`transaction-type ${transaction.transaction_type.toLowerCase()}`}>
                        {transaction.transaction_type}
                      </span>
                    </td>
                    <td className={`amount ${transaction.transaction_type.toLowerCase()}`}>
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>{transaction.account_id}</td>
                    <td>
                      <span className="agent-name">{transaction.employee_name}</span>
                      <br />
                      <span className="agent-id">{transaction.employee_id}</span>
                    </td>
                    <td className="description">{transaction.description}</td>
                    <td>{formatDateTime(transaction.time)}</td>
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

export default TransactionReports;