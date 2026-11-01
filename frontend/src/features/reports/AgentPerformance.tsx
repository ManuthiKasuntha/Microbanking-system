import React, { useState, useEffect,useCallback} from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsApi } from '@/api';
import { formatCurrency, formatDateTime } from '@/utils/format';

const TransactionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const BankIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <path d="M3 21h18"></path>
    <path d="M3 10h18"></path>
    <path d="M5 6l7-3 7 3"></path>
    <path d="M4 10v11"></path>
    <path d="M20 10v11"></path>
    <path d="M8 14v3"></path>
    <path d="M12 14v3"></path>
    <path d="M16 14v3"></path>
  </svg>
);

const CurrencyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const ChartPieIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
    <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
  </svg>
);

const TrendingUpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

const ActivityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const InboxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="48" height="48">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

interface PerformanceData {
  today_transactions: number;
  total_customers: number;
  monthly_accounts: number;
  transaction_volume: number;
  recent_activity: Array<{
    type: string;
    description: string;
    time: string;
  }>;
}

interface TransactionTypeData {
  plan_type: string;
  transaction_count: string;
}

interface TransactionTrendData {
  date: string;
  transaction_count: string;
}

const AgentPerformance: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    today_transactions: 0,
    total_customers: 0,
    monthly_accounts: 0,
    transaction_volume: 0,
    recent_activity: []
  });
  const [transactionTypes, setTransactionTypes] = useState<TransactionTypeData[]>([]);
  const [transactionTrend, setTransactionTrend] = useState<TransactionTrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPerformanceData = useCallback(async () => {
    try {
      const response = await analyticsApi.performance();
      
      const data = response.data.data || response.data;
      
      setPerformanceData({
        today_transactions: data.today_transactions || 0,
        total_customers: data.total_customers || 0,
        monthly_accounts: data.monthly_accounts || 0,
        transaction_volume: data.transaction_volume || 0,
        recent_activity: data.recent_activity || []
      });
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      
      const typesResponse = await analyticsApi.transactionTypes();
      
      const trendResponse = await analyticsApi.transactionTrend();
      
      setTransactionTypes(typesResponse.data.data || []);
      setTransactionTrend(trendResponse.data.data || []);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    }
  }, []);

  useEffect(() => {
    fetchPerformanceData();
    fetchAnalytics();
  }, [fetchPerformanceData, fetchAnalytics]);



  const COLORS = ['#1a365d', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

  const pieChartData = transactionTypes.map(item => ({
    name: item.plan_type,
    value: parseInt(item.transaction_count)
  }));

  const lineChartData = transactionTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    transactions: parseInt(item.transaction_count)
  }));

  if (isLoading) {
    return (
      <div className="performance-loading">
        <div className="loading-spinner"></div>
        <p>Loading performance data...</p>
      </div>
    );
  }

  return (
    <div className="agent-performance">
      <div className="kpi-section">
        <div className='section-title-container'>
            <h3 className="section-title">Key Performance</h3>
            <span className="section-subtitle">Essential performance metrices</span>
          </div>
        <div className="section-title-bar">
          <h3 className="section-title">Performance Metrics</h3>
        </div>

        <div className="performance-grid">
          <div className="performance-card card-transactions">
            <div className="card-header">
              <div className="performance-icon">
                <TransactionIcon />
              </div>
              <div className="card-badge badge-today">Today</div>
            </div>
            <div className="card-body">
              <div className="performance-value">{performanceData.today_transactions}</div>
              <h4 className="card-title">Transactions Processed</h4>
              <p className="card-description">Total transactions completed today</p>
            </div>
          </div>
          
          <div className="performance-card card-customers">
            <div className="card-header">
              <div className="performance-icon">
                <UsersIcon />
              </div>
              <div className="card-badge badge-total">All Time</div>
            </div>
            <div className="card-body">
              <div className="performance-value">{performanceData.total_customers}</div>
              <h4 className="card-title">Total Customers</h4>
              <p className="card-description">Customers registered by you</p>
            </div>
          </div>
          
          <div className="performance-card card-accounts">
            <div className="card-header">
              <div className="performance-icon">
                <BankIcon />
              </div>
              <div className="card-badge badge-monthly">This Month</div>
            </div>
            <div className="card-body">
              <div className="performance-value">{performanceData.monthly_accounts}</div>
              <h4 className="card-title">Accounts Created</h4>
              <p className="card-description">New accounts opened this month</p>
            </div>
          </div>

          <div className="performance-card card-volume">
            <div className="card-header">
              <div className="performance-icon">
                <CurrencyIcon />
              </div>
              <div className="card-badge badge-total">Total</div>
            </div>
            <div className="card-body">
              <div className="performance-value-currency">{formatCurrency(performanceData.transaction_volume)}</div>
              <h4 className="card-title">Transaction Volume</h4>
              <p className="card-description">Total amount processed</p>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <div className="section-title-bar">
          <div className='section-title-container'>
            <h3 className="section-title">Transaction Analytics</h3>
            <span className="section-subtitle">Visual insights into your performance</span>
          </div>
        </div>
        <div className="analytics-grid">
          <div className="analytics-card">
            <div className="chart-header">
              <div className="chart-icon">
                <ChartPieIcon />
              </div>
              <div>
                <h4 className="analytics-title">Transactions by Account Type</h4>
                <p className="chart-subtitle">Distribution across all account categories</p>
              </div>
            </div>
            <div className="chart-container">
              {pieChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: { name?: string; percent?: number }) => `${entry.name}: ${((entry.percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={85}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-no-data">
                  <p>No transaction data available</p>
                </div>
              )}
            </div>
          </div>

          <div className="analytics-card">
            <div className="chart-header">
              <div className="chart-icon">
                <TrendingUpIcon />
              </div>
              <div>
                <h4 className="analytics-title">30-Day Transaction Trend</h4>
                <p className="chart-subtitle">Daily transaction count over the last month</p>
              </div>
            </div>
            <div className="chart-container">
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval="preserveStartEnd"
                      stroke="#cbd5e1"
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="line"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="transactions" 
                      stroke="#1a365d" 
                      strokeWidth={3}
                      activeDot={{ r: 6, fill: '#1a365d' }}
                      dot={{ r: 3, fill: '#1a365d' }}
                      name="Daily Transactions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-no-data">
                  <p>No trend data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="activity-section">
        <div className="section-title-bar">
          <div className='section-title-container'>
            <h3 className="section-title">Recent Activity</h3>
            <span className="section-subtitle">Your latest transactions and actions</span>
          </div>
          <span className="activity-count">
            {performanceData?.recent_activity?.length || 0} recent items
          </span>
        </div>
        {!performanceData?.recent_activity || performanceData.recent_activity.length === 0 ? (
          <div className="no-activity">
            <div className="no-activity-icon">
              <InboxIcon />
            </div>
            <h4>No Recent Activity</h4>
            <p>Your recent transactions and actions will appear here</p>
          </div>
        ) : (
          <div className="activity-grid">
            {performanceData.recent_activity.map((activity, index) => (
              <div key={index} className="activity-card">
                <div className="activity-icon-wrapper">
                  <div className="activity-icon">
                    {activity.type === 'transaction' ? <ActivityIcon /> : 
                     activity.type === 'customer' ? <UserIcon /> : <BankIcon />}
                  </div>
                </div>
                <div className="activity-content">
                  <p className="activity-description">{activity.description}</p>
                  <div className="activity-meta">
                    <span className="activity-time">
                      <span className="time-icon">
                        <ClockIcon />
                      </span>
                      {formatDateTime(activity.time)}
                    </span>
                    <span className="activity-type-badge">{activity.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentPerformance;
