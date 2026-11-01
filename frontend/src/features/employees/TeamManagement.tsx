import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '@/utils/notify';
import { teamApi } from '@/api';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';

interface Agent {
  employee_id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  nic: string;
  gender: string;
  date_of_birth: string;
  branch_id: string;
  contact_id: string;
  created_at: string;
  contact_no_1?: string;
  email?: string;
  address?: string;
}

interface AgentPerformance {
  employee_id: string;
  total_transactions: number;
  total_volume: number;
  customers_registered: number;
  accounts_created: number;
  last_activity: string;
}

const TeamManagement: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<{ [key: string]: AgentPerformance }>({});
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await teamApi.agents();
      setAgents(response.data.agents);
      setAgentPerformance(response.data.performance);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedAgent(null);
  };

  const filteredAgents = agents.filter(agent => {
    const searchLower = searchTerm.toLowerCase().trim();
    if (!searchLower) return true;
    
    const employeeIdStr = String(agent.employee_id).toLowerCase();
    const firstName = agent.first_name.toLowerCase();
    const lastName = agent.last_name.toLowerCase();
    const fullName = `${agent.first_name} ${agent.last_name}`.toLowerCase();
    
    return (
      employeeIdStr.includes(searchLower) ||
      firstName.includes(searchLower) ||
      lastName.includes(searchLower) ||
      fullName.includes(searchLower)
    );
  });

  const getPerformanceBadge = (transactions: number) => {
    if (transactions >= 50) return 'performance-high';
    if (transactions >= 20) return 'performance-medium';
    return 'performance-low';
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading team data...</p>
      </div>
    );
  }

  return (
    <div className="team-management">
      <div className="section-header">
        <div>
          <p className="section-subtitle">Manage your agents and monitor their performance</p>
        </div>
        <button 
          className="btn btn-secondary"
          onClick={fetchAgents}
          title="Refresh team data"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
          Refresh
        </button>
      </div>

      <div><br/></div>

      <div className="search-section">
        
        <div className="search-row">
          
          <input
            type="text"
            className="search-input"
            placeholder="Auto search by Agent ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear
            </button>
          )}
        </div>
        <div className="agent-count">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {filteredAgents.length} of {agents.length} agents
        </div>
      </div>

      <div className="agents-content">
        <div className="agents-grid">
            {filteredAgents.length === 0 ? (
              <div className="no-data">
                <svg className="no-data-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h5>{searchTerm ? 'No Agents Match Your Search' : 'No Agents Found'}</h5>
                <p>{searchTerm ? `No agents found matching "${searchTerm}"` : 'There are no agents assigned to your branch.'}</p>
              </div>
            ) : (
              filteredAgents.map(agent => {
                const performance = agentPerformance[agent.employee_id];
                return (
                  <div key={agent.employee_id} className="agent-card">
                    <div className="agent-header">
                      <div className="agent-avatar">
                        {agent.first_name.charAt(0)}{agent.last_name.charAt(0)}
                      </div>
                      <div className="agent-info">
                        <h4>{agent.first_name} {agent.last_name}</h4>
                        <span className="agent-id">ID: {agent.employee_id}</span>
                      </div>
                      <span className={`performance-badge ${getPerformanceBadge(performance?.total_transactions || 0)}`}>
                        {performance?.total_transactions || 0} TX
                      </span>
                    </div>
                    
                    <div className="agent-quick-stats">
                      <div className="quick-stat">
                        <svg className="quick-stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                        </svg>
                        <div>
                          <span className="quick-stat-value">{performance?.accounts_created || 0}</span>
                          <span className="quick-stat-label">Accounts</span>
                        </div>
                      </div>
                      <div className="quick-stat">
                        <svg className="quick-stat-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <div>
                          <span className="quick-stat-value">{performance?.customers_registered || 0}</span>
                          <span className="quick-stat-label">Customers</span>
                        </div>
                      </div>
                    </div>

                    <div className="agent-actions">
                      <button 
                        className="btn btn-primary btn-sm btn-block"
                        onClick={() => handleAgentSelect(agent)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
        </div>

        {showDetailsModal && selectedAgent && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content large-modal agent-details-modal" onClick={(e) => e.stopPropagation()}>
              <AgentDetailsModal 
                agent={selectedAgent} 
                performance={agentPerformance[selectedAgent.employee_id]} 
                onClose={handleCloseModal}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface AgentDetailsModalProps {
  agent: Agent;
  performance?: AgentPerformance;
  onClose: () => void;
}

interface AgentTransaction {
  transaction_id: number;
  transaction_type: string;
  amount: number | string;
  time: string;
  description: string;
  account_id: number;
}

const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({ agent, performance, onClose }) => {
  const [agentTransactions, setAgentTransactions] = useState<AgentTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

  const fetchAgentTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await teamApi.agentTransactions(agent.employee_id);
      setAgentTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [agent.employee_id]);

  useEffect(() => {
    fetchAgentTransactions();
  }, [fetchAgentTransactions]);




  return (
    <>
      <div className="modal-header">
        <div className="details-title">
          <h4>{agent.first_name} {agent.last_name}</h4>
          <span className="details-subtitle">Employee ID: {agent.employee_id}</span>
        </div>
        <button className="close-btn" onClick={onClose} title="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="details-content agent-modal-content">
        <div className="details-grid">
          <div className="detail-section">
            <h5>Personal Information</h5>
            <div className="detail-row">
              <span className="detail-label">Employee ID:</span>
              <span className="detail-value">{agent.employee_id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{agent.first_name} {agent.last_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">NIC:</span>
              <span className="detail-value">{agent.nic}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Gender:</span>
              <span className="detail-value">{agent.gender}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date of Birth:</span>
              <span className="detail-value">{formatDate(agent.date_of_birth)}</span>
            </div>
          </div>

          <div className="detail-section">
            <h5>Contact Information</h5>
            <div className="detail-row">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">{agent.contact_no_1 || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{agent.email || 'N/A'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Address:</span>
              <span className="detail-value">{agent.address || 'N/A'}</span>
            </div>
          </div>

          {performance && (
            <div className="detail-section">
              <h5>Performance Summary</h5>
              <div className="detail-row">
                <span className="detail-label">Total Transactions:</span>
                <span className="detail-value">{performance.total_transactions}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Transaction Volume:</span>
                <span className="detail-value">{formatCurrency(performance.total_volume)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Customers Registered:</span>
                <span className="detail-value">{performance.customers_registered}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Accounts Created:</span>
                <span className="detail-value">{performance.accounts_created}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Activity:</span>
                <span className="detail-value">{formatDateTime(performance.last_activity)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="transactions-section">
          <div className="section-header">
            <h5>Recent Transactions</h5>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={fetchAgentTransactions}
              disabled={isLoadingTransactions}
            >
              {isLoadingTransactions ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {isLoadingTransactions ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : agentTransactions.length === 0 ? (
            <div className="no-data">
              <p>No transactions found for this agent.</p>
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
                    <th>Description</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {agentTransactions.map(transaction => (
                    <tr key={transaction.transaction_id}>
                      <td>{transaction.transaction_id}</td>
                      <td>
                        <span className={`transaction-type ${transaction.transaction_type.toLowerCase()}`}>
                          {transaction.transaction_type}
                        </span>
                      </td>
                      <td className={`amount ${transaction.transaction_type.toLowerCase()}`}>
                        {formatCurrency(Number(transaction.amount))}
                      </td>
                      <td>{transaction.account_id}</td>
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
    </>
  );
};

export default TeamManagement;