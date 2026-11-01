import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import ChangePasswordModal from './ChangePasswordModal';
import ErrorBoundary from './ui/ErrorBoundary';

// Each section is its own bundle chunk, downloaded only when a user opens it
const CustomerRegistration = lazy(() => import('./CustomerRegistration'));
const AccountCreation = lazy(() => import('./AccountCreation'));
const FixedDepositCreation = lazy(() => import('./FixedDepositCreation'));
const AccountDetailsView = lazy(() => import('./AccountDetailsView'));
const TransactionProcessing = lazy(() => import('./TransactionProcessing'));
const AgentPerformance = lazy(() => import('./AgentPerformance'));
const UserManagement = lazy(() => import('./UserManagement'));
const BranchManagement = lazy(() => import('./BranchManagement'));
const FDInterestManagement = lazy(() => import('./FDInterestManagement'));
const SavingsInterestManagement = lazy(() => import('./SavingsInterestManagement'));
const Reports = lazy(() => import('./Reports'));
const TeamManagement = lazy(() => import('./TeamManagement'));
const TransactionReports = lazy(() => import('./TransactionReports'));
const CustomerAccounts = lazy(() => import('./CustomerAccounts'));
import bankLogo from '../assets/imgs/B_Trust_logo_white.png';

interface DashboardProps {
  onLogout: () => void;
}

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('dashboard.sidebarCollapsed');
    return saved === 'true';
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const userData = localStorage.getItem('user');
  const user: User = userData ? JSON.parse(userData) : { 
    id: '', 
    username: '', 
    first_name: '', 
    last_name: '', 
    role: '' 
  };

  const [agentActiveSection, setAgentActiveSection] = useState<string>(() => {
    const saved = localStorage.getItem('agentDashboard.activeSection');
    return saved || 'performance';
  });

  const [adminActiveSection, setAdminActiveSection] = useState<string>(() => {
    const saved = localStorage.getItem('adminDashboard.activeSection');
    return saved || 'users';
  });

  const [managerActiveSection, setManagerActiveSection] = useState<string>(() => {
    const saved = localStorage.getItem('managerDashboard.activeSection');
    // 'overview' was removed; fall back to 'customers'
    if (!saved || saved === 'overview') return 'customers';
    return saved;
  });

  useEffect(() => {
    localStorage.setItem('agentDashboard.activeSection', agentActiveSection);
  }, [agentActiveSection]);

  useEffect(() => {
    localStorage.setItem('adminDashboard.activeSection', adminActiveSection);
  }, [adminActiveSection]);

  useEffect(() => {
    localStorage.setItem('managerDashboard.activeSection', managerActiveSection);
  }, [managerActiveSection]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/');
  }, [onLogout, navigate]);

  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        handleLogout();
      }
    };
    
    checkToken();
    const interval = setInterval(checkToken, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handleLogout]);

  useEffect(() => {
    localStorage.setItem('dashboard.sidebarCollapsed', sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const agentMenuItems = [
    {
      id: 'performance',
      label: 'My Performance',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>)
    },
    {
      id: 'register',
      label: 'Register Customer',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>)
    },
    {
      id: 'account',
      label: 'Savings Account',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path></svg>)
    },
    {
      id: 'fixed-deposit',
      label: 'Fixed Deposit',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>)
    },
    {
      id: 'view-accounts',
      label: 'View Account Details',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>)
    },
    {
      id: 'transactions',
      label: 'Process Transaction',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>)
    }
  ];

  const adminMenuItems = [
    {
      id: 'users',
      label: 'User Management',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg>)
    },
    {
      id: 'branches',
      label: 'Branch Management',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path></svg>)
    },
    {
      id: 'fd-interest',
      label: 'FD Interest',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>)
    },
    {
      id: 'savings-interest',
      label: 'Savings Interest',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 18V6"></path></svg>)
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>)
    }
  ];

  const managerMenuItems = [
    {
      id: 'customers',
      label: 'Customer Accounts',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"></path></svg>)
    },
    {
      id: 'team',
      label: 'Team Management',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg>)
    },
    {
      id: 'transactions',
      label: 'Transaction Summary',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>)
    },
  ];

  const getCurrentMenuItems = () => {
    if (user.role === 'Agent') return agentMenuItems;
    if (user.role === 'Admin') return adminMenuItems;
    if (user.role === 'Manager') return managerMenuItems;
    return [];
  };

  const getCurrentActiveSection = () => {
    if (user.role === 'Agent') return agentActiveSection;
    if (user.role === 'Admin') return adminActiveSection;
    if (user.role === 'Manager') return managerActiveSection;
    return '';
  };

  const setCurrentActiveSection = (section: string) => {
    if (user.role === 'Agent') setAgentActiveSection(section);
    if (user.role === 'Admin') setAdminActiveSection(section);
    if (user.role === 'Manager') setManagerActiveSection(section);
  };

  const getSectionTitle = () => {
    const menuItems = getCurrentMenuItems();
    const activeSection = getCurrentActiveSection();
    const item = menuItems.find(item => item.id === activeSection);
    return item ? item.label : 'Dashboard';
  };

  const renderContent = () => {
    if (user.role === 'Agent') {
      switch (agentActiveSection) {
        case 'performance': return <AgentPerformance />;
        case 'register': return <CustomerRegistration />;
        case 'account': return <AccountCreation />;
        case 'fixed-deposit': return <FixedDepositCreation />;
        case 'view-accounts': return <AccountDetailsView />;
        case 'transactions': return <TransactionProcessing />;
        default: return <AgentPerformance />;
      }
    }
    
    if (user.role === 'Admin') {
      switch (adminActiveSection) {
        case 'users': return <UserManagement />;
        case 'branches': return <BranchManagement />;
        case 'fd-interest': return <FDInterestManagement />;
        case 'savings-interest': return <SavingsInterestManagement />;
        case 'reports': return <Reports />;
        default: return <UserManagement />;
      }
    }
    
    if (user.role === 'Manager') {
      switch (managerActiveSection) {
        case 'team': return <TeamManagement />;
        case 'transactions': return <TransactionReports />;
        case 'customers': return <CustomerAccounts />;
        default: return null;
      }
    }
    
    return null;
  };

  const menuItems = getCurrentMenuItems();
  const activeSection = getCurrentActiveSection();

  return (
    <div className="dashboard-layout">
      <aside className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src={bankLogo} alt='Bank Trust Logo' className="sidebar-logo"/>
          {!sidebarCollapsed && <h2>B-Trust Bank</h2>}
        </div>

        <button className="sidebar-toggle" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {sidebarCollapsed ? (
              <path d="M9 18l6-6-6-6" />
            ) : (
              <path d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>

        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <ul>
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button 
                    className={activeSection === item.id ? 'active' : ''}
                    onClick={() => setCurrentActiveSection(item.id)}
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    <span className="menu-icon">{item.icon}</span>
                    {!sidebarCollapsed && <span className="menu-label">{item.label}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {!sidebarCollapsed && (
              <div className="user-details">
                <span className="user-name">{user.first_name} {user.last_name}</span>
                <span className="user-role">{user.role}</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-account-btn"
            onClick={() => setShowChangePassword(true)}
            title="Change password"
            aria-label="Change password"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            {!sidebarCollapsed && <span>Change Password</span>}
          </button>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        {['Admin', 'Manager', 'Agent'].includes(user.role) ? (
          <div className="dashboard-content-wrapper">
            <header className="content-header">
              <h1>{getSectionTitle()}</h1>
            </header>
            <div className="content-body">
              <ErrorBoundary key={activeSection}>
                <Suspense fallback={<div className="section-loading">Loading...</div>}>
                  {renderContent()}
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          <div className="no-dashboard-message">
            <p>No dashboard available for your role: {user.role}</p>
          </div>
        )}
        <Footer />
      </main>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};

export default Dashboard;