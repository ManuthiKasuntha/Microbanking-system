import React, { useState, useEffect } from 'react';
import { toast } from '@/utils/notify';
import { getErrorMessage, interestApi } from '@/api';

interface FDInterestSummary {
  monthly_interest: number;
  active_fds: {
    count: number;
    total_value: number;
  };
  recent_periods: Array<{
    period_start: string;
    period_end: string;
    processed_at: string;
  }>;
  next_scheduled_run: string;
}

const FDInterestManagement: React.FC = () => {
  const [summary, setSummary] = useState<FDInterestSummary | null>(null);

  const loadSummary = async () => {
    try {
      const response = await interestApi.fdSummary();
      setSummary(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load interest summary'));
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div className="fd-interest-management">
      <h4>Fixed Deposit Interest Management</h4>
      
      <div className="auto-system-info">
        <div className="info-card success">
          <h5>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Automatic System Status
          </h5>
          <p><strong>Schedule:</strong> Daily at 3:00 AM (per-account 30-day cycles)</p>
          <p><strong>Action:</strong> Fully automatic per-account calculation AND crediting</p>
          <p><strong>Status:</strong> <span className="status-active">ACTIVE</span></p>
        </div>

        {summary && (
          <div className="summary-grid">
            <div className="summary-item">
              <span>Active Fixed Deposits:</span>
              <strong>{summary.active_fds.count}</strong>
            </div>
            <div className="summary-item">
              <span>Total FD Value:</span>
              <strong>LKR {summary.active_fds.total_value.toLocaleString()}</strong>
            </div>
            <div className="summary-item">
              <span>Interest This Month:</span>
              <strong>LKR {summary.monthly_interest.toLocaleString()}</strong>
            </div>
            <div className="summary-item">
              <span>Next Auto-run:</span>
              <strong>{summary.next_scheduled_run}</strong>
            </div>
          </div>
        )}

        <div className="recent-periods">
          <p>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Recently Processed Periods
          </p>
          {summary && summary.recent_periods && summary.recent_periods.length > 0 ? (
            <div className="periods-list">
              {summary.recent_periods.map((period, index) => (
                <div key={index} className="period-item">
                  <span>{new Date(period.period_start).toLocaleDateString()} to {new Date(period.period_end).toLocaleDateString()}</span>
                  <small>{new Date(period.processed_at).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          ) : (
            <p>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>

              No periods processed yet.
            </p>
          )}
        </div>
      </div>

    </div>
  );
};

export default FDInterestManagement;