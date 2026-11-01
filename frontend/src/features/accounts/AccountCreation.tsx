import React, { useState, useEffect } from 'react';
import { toast, confirmAction } from '@/utils/notify';
import { accountsApi, customersApi, getErrorMessage, referenceApi } from '@/api';
import { ageOn } from '@/utils/validation';

interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  nic: string;
  date_of_birth: string;
}

interface AccountFormData {
  customer_id: number;
  saving_plan_id: number;
  initial_deposit: number;
  branch_id: number;
  joint_holders?: number[];
}

interface SavingPlan {
  saving_plan_id: number;
  plan_type: string;
  interest: number;
  min_balance: number;
}

interface Branch {
  branch_id: number;
  name: string;
}

interface FormErrors {
  [key: string]: string;
}

interface ExistingAccount {
  account_id: number;
  balance: number;
  account_status: string;
  open_date: string;
  branch_id: number;
  saving_plan_id: number;
  fd_id: number | null;
  plan_type: string;
  interest: number;
  min_balance: number;
  customer_names: string;
  customer_count: number;
  branch_name: string;
  customer_nics?: string;
}

interface PlanChangeState {
  selectedAccountId: number | null;
  newSavingPlanId: number | null;
  reason: string;
  isSubmitting: boolean;
  newNic?: string;
}

const AccountCreation: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savingPlans, setSavingPlans] = useState<SavingPlan[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SavingPlan | null>(null);
  const [jointHolders, setJointHolders] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResult, setCustomerSearchResult] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [createdAccountId, setCreatedAccountId] = useState<number | null>(null);
  
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [existingAccounts, setExistingAccounts] = useState<ExistingAccount[]>([]);
  const [searchAccountId, setSearchAccountId] = useState('');
  const [accountSearchResults, setAccountSearchResults] = useState<ExistingAccount[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [planChange, setPlanChange] = useState<PlanChangeState>({
    selectedAccountId: null,
    newSavingPlanId: null,
    reason: '',
    isSubmitting: false,
    newNic: ''
  });
  
  const [formData, setFormData] = useState<AccountFormData>({
    customer_id: 0,
    saving_plan_id: 0,
    initial_deposit: 0,
    branch_id: 0
  });

  const steps = [
    { number: 1, label: 'info 01' },
    { number: 2, label: 'info 02' },
    { number: 3, label: 'Done' }
  ];

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'manage') {
      loadExistingAccounts();
    }
  }, [activeTab]);
  
  useEffect(() => {
    setAccountSearchResults(existingAccounts);
  }, [existingAccounts]);
  
  const lookupCustomerByNic = async () => {
    const nic = customerSearchTerm.trim().toUpperCase();
    if (!nic) return;
    if (!/^([0-9]{12}|[0-9]{9}V)$/.test(nic)) {
      toast.error('Enter a valid NIC/Birth Certificate number: 12 digits or 9 digits followed by V');
      return;
    }
    try {
      const res = await customersApi.getByNic(nic);
      const c: Customer = res.data.customer;
      setCustomerSearchResult(c);
    } catch (err) {
      setCustomerSearchResult(null);
      const msg = getErrorMessage(err, 'Customer not found');
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (searchTerm.trim()) {
      const results = customers.filter(customer => 
        customer.customer_id !== formData.customer_id &&
        !jointHolders.find(jh => jh.customer_id === customer.customer_id) &&
        (
          customer.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.nic.includes(searchTerm)
        )
      );
      setSearchResults(results.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, customers, formData.customer_id, jointHolders]);

  const fetchData = async () => {
    try {
      const [customersRes, plansRes, branchesRes] = await Promise.all([
        customersApi.list(),
        referenceApi.savingPlans(),
        referenceApi.branches()
      ]);

      setCustomers(customersRes.data.customers || []);
      setSavingPlans(plansRes.data.saving_plans || plansRes.data || []);
      setBranches(branchesRes.data.branches || branchesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load required data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadExistingAccounts = async () => {
    try {
      const response = await accountsApi.listAll();
      setExistingAccounts(response.data.accounts);
    } catch (error) {
      console.error('Failed to load existing accounts:', error);
      toast.error('Failed to load existing accounts');
    }
  };

  const searchAccount = async () => {
    setHasSearched(true);
    const term = searchAccountId.trim().toUpperCase();

    if (!term) {
      setAccountSearchResults([]);
      return;
    }

    const isTwelveDigitNic = /^[0-9]{12}$/.test(term);
    const isOldNic = /^[0-9]{9}V$/.test(term);

    if (!isTwelveDigitNic && !isOldNic && /^[0-9]+$/.test(term)) {
      // Numeric but not a 12-digit NIC: treat as account ID
      const results = existingAccounts.filter(acc => acc.account_id.toString() === term);
      setAccountSearchResults(results);
      return;
    }

    if (!isTwelveDigitNic && !isOldNic) {
      toast.error('Enter a valid NIC/Birth Certificate number: 12 digits or 9 digits followed by V');
      return;
    }

    try {
      setIsSearching(true);
      const res = await accountsApi.listByHolderNic(term);
      setAccountSearchResults(res.data.accounts || []);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to search accounts');
      toast.error(msg);
      setAccountSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const deactivateAccount = async (accountId: number, balance: number, customerNames: string) => {
  if (!await confirmAction(
    `Are you sure you want to deactivate Account ${accountId}?\n\n` +
    `• Customer: ${customerNames}\n` +
    `• Current Balance: LKR ${balance.toLocaleString()}\n\n` +
    `This will automatically:\n` +
    `• Withdraw the full balance of LKR ${balance.toLocaleString()}\n` +
    `• Close the savings account permanently\n` +
    `• Create transaction records for audit\n\n` +
    `This action cannot be undone.`,
    { title: 'Close savings account', confirmLabel: 'Close account', danger: true }
  )) {
    return;
  }

  try {
    const response = await accountsApi.close({ 
        account_id: accountId,
        reason: 'Account closure - full balance withdrawal'
      }
    );
    
    toast.success(response.data.message);
    loadExistingAccounts();
    setAccountSearchResults(accountSearchResults.filter(acc => acc.account_id !== accountId));
  } catch (error) {
    toast.error(getErrorMessage(error, 'Failed to deactivate account'));
  }
  };

  const eligiblePlansForAccount = (account: ExistingAccount) => {
    const nonJoint = savingPlans.filter(p => p.plan_type !== 'Joint');

    // Age eligibility is enforced by the backend
    return nonJoint.filter(p => p.saving_plan_id !== account.saving_plan_id);
  };

  const shouldShowNicForAccount = (account: ExistingAccount) => {
    if (planChange.selectedAccountId !== account.account_id || !planChange.newSavingPlanId) return false;
    const targetPlan = savingPlans.find(p => p.saving_plan_id === planChange.newSavingPlanId);
    return account.plan_type === 'Teen' && targetPlan?.plan_type === 'Adult';
  };

  const changePlan = async (account: ExistingAccount) => {
    if (!planChange.newSavingPlanId) {
      toast.error('Please select a new plan');
      return;
    }
    if (!planChange.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      setPlanChange(pc => ({ ...pc, isSubmitting: true }));
      await accountsApi.changePlan({
        account_id: account.account_id,
        new_saving_plan_id: planChange.newSavingPlanId,
        reason: planChange.reason.trim(),
        new_nic: planChange.newNic && planChange.selectedAccountId === account.account_id ? planChange.newNic.trim() : undefined
      });

      await loadExistingAccounts();
      setSuccessMessage('Plan changed successfully');
  setPlanChange({ selectedAccountId: null, newSavingPlanId: null, reason: '', isSubmitting: false, newNic: '' });
    } catch (error) {
      const msg = getErrorMessage(error, 'Failed to change plan');
      toast.error(msg);
      setPlanChange(pc => ({ ...pc, isSubmitting: false }));
    }
  };


  const getAgeRequirement = (planType: string): number => {
    switch (planType.toLowerCase()) {
      case 'senior':
        return 60;
      case 'joint':
        return 18;
      case 'children':
        return 0;
      case 'teen':
        return 12;
      default:
        return 18;
    }
  };

  const getSinglePlanTypeForAge = (age: number): 'Children' | 'Teen' | 'Adult' | 'Senior' => {
    if (age >= 60) return 'Senior';
    if (age >= 18) return 'Adult';
    if (age >= 12) return 'Teen';
    return 'Children';
  };

  const getEligiblePlans = (): SavingPlan[] => {
    if (!selectedCustomer || savingPlans.length === 0) return savingPlans;
    const age = ageOn(selectedCustomer.date_of_birth);
    const singleType = getSinglePlanTypeForAge(age);
    const singlePlan = savingPlans.find(p => p.plan_type === singleType);
    const jointPlan = age >= 18 ? savingPlans.find(p => p.plan_type === 'Joint') : undefined;
    return [singlePlan, jointPlan].filter(Boolean) as SavingPlan[];
  };

  const validateStep1 = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.customer_id) {
      newErrors.customer_id = 'Please select a customer';
    } else if (selectedCustomer && selectedPlan) {
      const customerAge = ageOn(selectedCustomer.date_of_birth);
      const requiredAge = getAgeRequirement(selectedPlan.plan_type);
      
      if (customerAge < requiredAge) {
        newErrors.customer_id = `${selectedPlan.plan_type} account requires account holder to be at least ${requiredAge} years old. Current age: ${customerAge}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.saving_plan_id) {
      newErrors.saving_plan_id = 'Please select a saving plan';
    }
    
    if (!formData.branch_id) {
      newErrors.branch_id = 'Please select a branch';
    }
    
    if (formData.initial_deposit < 0) {
      newErrors.initial_deposit = 'Initial deposit cannot be negative';
    } else if (selectedPlan && formData.initial_deposit < selectedPlan.min_balance-0.00) {
      newErrors.initial_deposit = `Minimum balance for ${selectedPlan.plan_type} plan is LKR ${selectedPlan.min_balance.toLocaleString()}`;
    }

    if (selectedPlan?.plan_type === 'Joint') {
      if (jointHolders.length === 0) {
        newErrors.joint_holders = 'Joint account requires at least one joint holder';
      }
      
      const underageJointHolder = jointHolders.find(holder => {
        const holderAge = ageOn(holder.date_of_birth);
        return holderAge < 18;
      });
      
      if (underageJointHolder) {
        newErrors.joint_holders = `Joint holder ${underageJointHolder.first_name} ${underageJointHolder.last_name} must be at least 18 years old. Current age: ${ageOn(underageJointHolder.date_of_birth)}`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    return validateStep1() && validateStep2();
  };

  const handleNextStep = async () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      await createAccount();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
      setErrors({});
    }
  };

  const createAccount = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      const submitData = {
        customer_id: Number(formData.customer_id) || 0,
        saving_plan_id: Number(formData.saving_plan_id) || 0,
        initial_deposit: Number(formData.initial_deposit) || 0,
        branch_id: Number(formData.branch_id) || 0,
        joint_holders: jointHolders.map(holder => holder.customer_id)
      };

      const response = await accountsApi.open(submitData);
      
      setCreatedAccountId(response.data.account_id);
      setSuccessMessage(`Account created successfully! Account Number: ${response.data.account_id}`);
      setCurrentStep(3);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create account'));
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const resetForm = () => {
    setFormData({
      customer_id: 0,
      saving_plan_id: 0,
      initial_deposit: 0,
      branch_id: 0
    });
    setSelectedCustomer(null);
    setSelectedPlan(null);
    setJointHolders([]);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearch(false);
    setCustomerSearchTerm('');
  setCustomerSearchResult(null);
    setShowCustomerSearch(false);
    setErrors({});
    setCurrentStep(1);
    setCreatedAccountId(null);
    setSuccessMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    if (name === 'saving_plan_id' || name === 'branch_id' || name === 'customer_id') {
      parsedValue = value === '' ? 0 : parseInt(value as string, 10);
    } else if (name === 'initial_deposit') {
      parsedValue = value === '' ? 0 : parseFloat(value as string);
    }

    setFormData({
      ...formData,
      [name]: parsedValue
    });

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    if (name === 'saving_plan_id') {
      const plan = savingPlans.find(p => p.saving_plan_id === (parsedValue as number));
      setSelectedPlan(plan || null);
      if (plan?.plan_type !== 'Joint') {
        setJointHolders([]);
        setShowSearch(false);
      }
    }
  };

  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customer.customer_id
    }));
    setSelectedCustomer(customer);
    setCustomerSearchTerm('');
  setCustomerSearchResult(null);
    setShowCustomerSearch(false);
    const age = ageOn(customer.date_of_birth);
    const targetType = getSinglePlanTypeForAge(age);
    const targetPlan = savingPlans.find(p => p.plan_type === targetType) || null;
    if (targetPlan) {
      setFormData(prev => ({ ...prev, saving_plan_id: targetPlan.saving_plan_id }));
      setSelectedPlan(targetPlan);
      setJointHolders([]);
      setShowSearch(false);
    }
    
    if (errors.customer_id) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.customer_id;
        return newErrors;
      });
    }
  };

  useEffect(() => {
    if (!selectedCustomer || savingPlans.length === 0) return;
    const age = ageOn(selectedCustomer.date_of_birth);
    const eligible = getEligiblePlans();
    const current = savingPlans.find(p => p.saving_plan_id === formData.saving_plan_id) || null;
    const stillEligible = current && eligible.some(p => p.saving_plan_id === current.saving_plan_id);
    if (!stillEligible) {
      const singleType = getSinglePlanTypeForAge(age);
      const singlePlan = savingPlans.find(p => p.plan_type === singleType) || null;
      if (singlePlan) {
        setFormData(prev => ({ ...prev, saving_plan_id: singlePlan.saving_plan_id }));
        setSelectedPlan(singlePlan);
        setJointHolders([]);
        setShowSearch(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer, savingPlans]);

  const removeSelectedCustomer = () => {
    setFormData(prev => ({
      ...prev,
      customer_id: 0
    }));
    setSelectedCustomer(null);
    setCustomerSearchTerm('');
  };

  const addJointHolder = (customer: Customer) => {
    if (!jointHolders.find(jh => jh.customer_id === customer.customer_id)) {
      setJointHolders(prev => [...prev, customer]);
      setSearchTerm('');
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  const removeJointHolder = (customerId: number) => {
    setJointHolders(prev => prev.filter(holder => holder.customer_id !== customerId));
  };

  const getPlanDescription = (plan: SavingPlan) => {
    const ageRequirement = getAgeRequirement(plan.plan_type);
    const ageText = ageRequirement > 0 ? `, Min Age: ${ageRequirement}+` : '';
    return `${plan.plan_type} Plan - ${plan.interest}% interest, Min: LKR ${plan.min_balance.toLocaleString()}${ageText}`;
  };

  const getAgeBadge = (age: number, planType: string) => {
    const requiredAge = getAgeRequirement(planType);
    if (age < requiredAge) {
      return <span className="age-badge age-invalid">Age: {age} (Min: {requiredAge}+)</span>;
    }
    return <span className="age-badge age-valid">Age: {age}</span>;
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'Active': 'success',
      'Closed': 'danger'
    };
    
    const color = statusColors[status as keyof typeof statusColors] || 'secondary';
    return <span className={`badge badge-${color}`}>{status}</span>;
  };

  if (isLoadingData) {
    return (
      <div className="customer-registration">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading account creation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-creation">
      <div className="section-header">
        <div>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create New Account
        </button>
        <button 
          className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Existing Accounts
        </button>
      </div>

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

      {activeTab === 'create' ? (
        <div className="wizard-container">
          <div className="wizard-header">
            <div className="wizard-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h1>Create Savings Account</h1>
            <p>Open a new savings account for customers</p>
          </div>

          <div className="stepper">
            <div className="stepper-line-container">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="step-item">
                    <div className={`step-circle ${
                      currentStep > step.number || currentStep === 3 ? 'step-completed' :
                      currentStep === step.number ? 'step-active' : 'step-inactive'
                    }`}>
                      {currentStep > step.number|| currentStep === 3 ? <CheckIcon /> : step.number}
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

          <div className="wizard-form-container">
            <form onSubmit={handleSubmit}>
              {currentStep === 1 && (
              <div className="form-step">
                <h2 className="step-title">Customer Selection</h2>
              <div className="form-group">
                <label>Select Customer *</label>
                
                {selectedCustomer ? (
                  <div className="selected-customer-card">
                    <div className="customer-info">
                      <strong>{selectedCustomer.first_name} {selectedCustomer.last_name}</strong>
                      <span>ID: {selectedCustomer.customer_id} | NIC: {selectedCustomer.nic}</span>
                      {selectedPlan && (
                        <div className="age-validation">
                          {getAgeBadge(ageOn(selectedCustomer.date_of_birth), selectedPlan.plan_type)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={removeSelectedCustomer}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="customer-search-section">
                    {!showCustomerSearch ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-block"
                        onClick={() => setShowCustomerSearch(true)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        Search Customer
                      </button>
                    ) : (
                      <div className="search-customer">
                        <div className="search-box">
                          <input
                            type="text"
                            placeholder="Enter NIC/Birth Certificate (exact): 123456789V or 12 digits"
                            value={customerSearchTerm}
                            onChange={(e) => setCustomerSearchTerm(e.target.value)}
                            className="search-input"
                            autoFocus
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={lookupCustomerByNic}
                            disabled={!customerSearchTerm.trim()}
                          >
                            Find
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowCustomerSearch(false);
                              setCustomerSearchTerm('');
                              setCustomerSearchResult(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        
                        {customerSearchResult && (
                          <div className="search-results">
                            <div 
                              key={customerSearchResult.customer_id}
                              className="search-result-item"
                              onClick={() => selectCustomer(customerSearchResult)}
                            >
                              <div className="customer-info">
                                <strong>{customerSearchResult.first_name} {customerSearchResult.last_name}</strong>
                                <span>ID: {customerSearchResult.customer_id} | NIC: {customerSearchResult.nic} | Age: {ageOn(customerSearchResult.date_of_birth)}</span>
                              </div>
                              <button type="button" className="btn btn-primary btn-sm">Select</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {errors.customer_id && <span className="error-text">{errors.customer_id}</span>}
              </div>

              <div className="form-actions stepper-actions">
                <button 
                  type="button" 
                  className="btn-back"
                  disabled={currentStep === 1}
                
                >
                  Back
                </button>
                <button 
                  type="button" 
                  className="btn-back"
                  onClick={resetForm}
                  disabled={currentStep === 1}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-next"
                  onClick={handleNextStep}
                >
                  Next
                </button>
              </div>
              </div>
              )}

              {currentStep === 2 && (
              <div className="form-step">
                <h2 className="step-title">Account Details</h2>
              
              <div className="form-grid">
                <div className="form-group">
                  <label>Saving Plan *</label>
                  <select
                    name="saving_plan_id"
                    value={formData.saving_plan_id}
                    onChange={handleInputChange}
                    required
                    className={errors.saving_plan_id ? 'error' : ''}
                  >
                    <option value="">Choose a saving plan...</option>
                    {(getEligiblePlans()).map(plan => (
                      <option key={plan.saving_plan_id} value={plan.saving_plan_id}>
                        {getPlanDescription(plan)}
                      </option>
                    ))}
                  </select>
                  
                  {errors.saving_plan_id && <span className="error-text">{errors.saving_plan_id}</span>}
                </div>

                <div className="form-group">
                  <label>Branch *</label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleInputChange}
                    required
                    className={errors.branch_id ? 'error' : ''}
                  >
                    <option value="">Choose a branch...</option>
                    {branches.map(branch => (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {branch.name} ({branch.branch_id})
                      </option>
                    ))}
                  </select>
                  {errors.branch_id && <span className="error-text">{errors.branch_id}</span>}
                </div>
              </div>

              {selectedPlan?.plan_type === 'Joint' && (
                <div className="joint-holders-section">
                  <p>Joint Account Holders</p>
                  <p className="form-help">
                    Add other customers who will be joint holders of this account. All joint holders must be at least 18 years old.
                  </p>
                  
                  {errors.joint_holders && (
                    <span className="error-text">{errors.joint_holders}</span>
                  )}

                  {jointHolders.length > 0 && (
                    <div className="joint-holders-list">
                      <h6>Added Joint Holders ({jointHolders.length})</h6>
                      {jointHolders.map(holder => (
                        <div key={holder.customer_id} className="joint-holder-card">
                          <div className="holder-info">
                            <strong>{holder.first_name} {holder.last_name}</strong>
                            <span>ID: {holder.customer_id} | NIC: {holder.nic}</span>
                            {getAgeBadge(ageOn(holder.date_of_birth), 'Joint')}
                          </div>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeJointHolder(holder.customer_id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="add-joint-holder">
                    {!showSearch ? (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowSearch(true)}
                      >
                        + Add Joint Holder
                      </button>
                    ) : (
                      <div className="search-joint-holder">
                        <div className="search-box">
                          <input
                            type="text"
                            placeholder="Search by customer name or NIC/birth certificate number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                          />
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowSearch(false);
                              setSearchTerm('');
                              setSearchResults([]);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        
                        {searchResults.length > 0 && (
                          <div className="search-results">
                            {searchResults.map(customer => (
                              <div key={customer.customer_id} className="search-result-item">
                                <div className="customer-info">
                                  <strong>{customer.first_name} {customer.last_name}</strong>
                                  <span>ID: {customer.customer_id} | NIC: {customer.nic}</span>
                                  {getAgeBadge(ageOn(customer.date_of_birth), 'Joint')}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => addJointHolder(customer)}
                                  disabled={ageOn(customer.date_of_birth) < 18}
                                >
                                  {ageOn(customer.date_of_birth) < 18 ? 'Under 18' : 'Add'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {searchTerm && searchResults.length === 0 && (
                          <div className="no-results">
                            No customers found matching your search.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Initial Deposit (LKR) *</label>
                <input
                  type="number"
                  name="initial_deposit"
                  value={formData.initial_deposit === 0 ? '' : formData.initial_deposit}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="Enter initial deposit amount"
                  className={errors.initial_deposit ? 'error' : ''}
                />
                {errors.initial_deposit && <span className="error-text">{errors.initial_deposit}</span>}
                {selectedPlan && (
                  <small className="form-help">
                    Minimum deposit for {selectedPlan.plan_type} plan: LKR {selectedPlan.min_balance.toLocaleString()}
                  </small>
                )}
              </div>

              {selectedPlan && formData.initial_deposit >= selectedPlan.min_balance && (
                <div className="account-summary">
                  <h5>Account Summary</h5>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Plan Type:</span>
                      <strong>{selectedPlan.plan_type}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Interest Rate:</span>
                      <strong>{selectedPlan.interest}%</strong>
                    </div>
                    <div className="summary-item">
                      <span>Initial Deposit:</span>
                      <strong>LKR {formData.initial_deposit.toLocaleString()}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Minimum Balance:</span>
                      <strong>LKR {selectedPlan.min_balance.toLocaleString()}</strong>
                    </div>
                    <div className="summary-item">
                      <span>Age Requirement:</span>
                      <strong>{getAgeRequirement(selectedPlan.plan_type)}+ years</strong>
                    </div>
                    {selectedPlan.plan_type === 'Joint' && (
                      <div className="summary-item">
                        <span>Joint Holders:</span>
                        <strong>{jointHolders.length + 1} total</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-actions stepper-actions">
                <button 
                  type="button" 
                  className="btn-back"
                  onClick={handlePrevStep}
                  disabled={isLoading}
                >
                  Back
                </button>
                <button 
                  type="button" 
                  className="btn-danger"
                  onClick={resetForm}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn-next"
                  onClick={handleNextStep}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
              </div>
              )}

              {currentStep === 3 && (
              <div className="form-step">
                <div className="success-container">
                  <div className="success-icon-large">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <h2 className="step-title" style={{textAlign: 'center', color: 'var(--success-color)'}}>Account Created Successfully!</h2>
                  <p className="section-subtitle" style={{textAlign: 'center'}}>The new savings account has been opened</p>
                </div>

              <div className="confirmation-summary">
                {createdAccountId && (
                  <div className="confirmation-section" style={{background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', padding: 'var(--spacing-lg)', borderRadius: 'var(--border-radius-lg)', marginBottom: 'var(--spacing-lg)'}}>
                    <div className="detail-row" style={{justifyContent: 'center', fontSize: '1.2rem'}}>
                      <span className="detail-label" style={{fontSize: '1.1rem'}}>Account Number:</span>
                      <span className="detail-value"><strong style={{color: 'var(--primary-color)', fontSize: '1.3rem'}}>{createdAccountId}</strong></span>
                    </div>
                  </div>
                )}

                <div className="confirmation-section">
                  <h5>Account Holder Information</h5>
                  {selectedCustomer && (
                    <div className="confirmation-details">
                      <div className="detail-row">
                        <span className="detail-label">Customer Name:</span>
                        <span className="detail-value"><strong>{selectedCustomer.first_name} {selectedCustomer.last_name}</strong></span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Customer ID:</span>
                        <span className="detail-value">{selectedCustomer.customer_id}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">NIC:</span>
                        <span className="detail-value">{selectedCustomer.nic}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Age:</span>
                        <span className="detail-value">{ageOn(selectedCustomer.date_of_birth)} years</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedPlan?.plan_type === 'Joint' && jointHolders.length > 0 && (
                  <div className="confirmation-section">
                    <h5>Joint Account Holders ({jointHolders.length})</h5>
                    <div className="confirmation-details">
                      {jointHolders.map((holder, index) => (
                        <div key={holder.customer_id} className="detail-row">
                          <span className="detail-label">Holder {index + 1}:</span>
                          <span className="detail-value">{holder.first_name} {holder.last_name} (NIC: {holder.nic})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPlan && (
                  <div className="confirmation-section">
                    <h5>Account Details</h5>
                    <div className="confirmation-details">
                      <div className="detail-row">
                        <span className="detail-label">Plan Type:</span>
                        <span className="detail-value"><strong>{selectedPlan.plan_type}</strong></span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Interest Rate:</span>
                        <span className="detail-value">{selectedPlan.interest}% per annum</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Minimum Balance:</span>
                        <span className="detail-value">LKR {selectedPlan.min_balance.toLocaleString()}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Initial Deposit:</span>
                        <span className="detail-value"><strong className="text-success">LKR {formData.initial_deposit.toLocaleString()}</strong></span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">Current Balance:</span>
                        <span className="detail-value"><strong className="text-success">LKR {formData.initial_deposit.toLocaleString()}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {formData.branch_id > 0 && (
                  <div className="confirmation-section">
                    <h5>Branch Information</h5>
                    <div className="confirmation-details">
                      <div className="detail-row">
                        <span className="detail-label">Branch:</span>
                        <span className="detail-value">
                          {branches.find(b => b.branch_id === formData.branch_id)?.name || `Branch ${formData.branch_id}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="confirmation-section">
                  <h5>Account Status</h5>
                  <div className="confirmation-details">
                    <div className="detail-row">
                      <span className="detail-label">Status:</span>
                      <span className="detail-value"><span className="badge badge-success">Active</span></span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Created Date:</span>
                      <span className="detail-value">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions stepper-actions" style={{justifyContent: 'center'}}>
                <button 
                  type="button" 
                  className="btn btn-primary btn-lg"
                  onClick={resetForm}
                  style={{minWidth: '200px'}}
                >
                  Create Another Account
                </button>
                </div>
              </div>
              )}

            </form>
          </div>
        </div>
      ) : (
        <div className="account-management">
          <div className="search-section">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search by Account ID or exact NIC/Birth Certificate (e.g., 123456789V or 12 digits)"
                value={searchAccountId}
                onChange={(e) => setSearchAccountId(e.target.value)}
                className="search-input"
              />
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={searchAccount}
                disabled={isSearching}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  setSearchAccountId('');
                  setAccountSearchResults([]);
                  setHasSearched(false);
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {hasSearched && (
            <div className="account-list">
              {accountSearchResults.length === 0 ? (
                <div className="no-data">
                  {searchAccountId
                    ? `No accounts found matching "${searchAccountId}"`
                    : 'Enter a term above and click Search.'}
                </div>
              ) : (
                <div className="account-grid">
                  {accountSearchResults.map(account => (
                    <div key={account.account_id} className="account-card">
                      <div className="account-header">
                        <h6>Account: {account.account_id}</h6>
                        {getStatusBadge(account.account_status)}
                      </div>
                      <div className="account-details">
                        <div className="account-detail-row">
                          <div className="detail-label">Customer(s):</div>
                          <div className="detail-value">
                            <div className="customer-info">
                              <strong>{account.customer_names}</strong>
                              {account.customer_count > 1 && (
                                <small className="joint-badge">Joint Account ({account.customer_count})</small>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="account-detail-row">
                          <div className="detail-label">Plan Type:</div>
                          <div className="detail-value">
                            <strong>{account.plan_type}</strong>
                          </div>
                        </div>

                        <div className="account-detail-row">
                          <div className="detail-label">Current Balance:</div>
                          <div className="detail-value">
                            <strong className={account.balance > 0 ? 'text-success' : 'text-muted'}>
                              LKR {account.balance.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div className="account-actions">
                        {account.account_status === 'Active' && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => deactivateAccount(
                              account.account_id,
                              account.balance,
                              account.customer_names
                            )}
                            disabled={account.fd_id !== null}
                          >
                            {account.fd_id ? 'Has Active FD' : 'Close Account'}
                          </button>
                        )}

                        {account.account_status === 'Closed' && (
                          <span className="text-muted">Account Closed</span>
                        )}
                      </div>

                      {account.account_status === 'Active' && account.plan_type !== 'Joint' && (
                        <div className="plan-change">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Change Plan</label>
                              <select
                                value={planChange.selectedAccountId === account.account_id ? (planChange.newSavingPlanId || '') : ''}
                                onChange={(e) => {
                                  const val = e.target.value ? Number(e.target.value) : null;
                                  const targetPlan = val ? savingPlans.find(p => p.saving_plan_id === val) : undefined;
                                  const willShowNic = account.plan_type === 'Teen' && targetPlan?.plan_type === 'Adult';
                                  setPlanChange({
                                    selectedAccountId: account.account_id,
                                    newSavingPlanId: val,
                                    reason: planChange.selectedAccountId === account.account_id ? planChange.reason : '',
                                    isSubmitting: false,
                                    newNic: planChange.selectedAccountId === account.account_id && willShowNic ? (planChange.newNic || '') : ''
                                  });
                                }}
                              >
                                <option value="">Select new plan...</option>
                                {eligiblePlansForAccount(account).map(p => (
                                  <option key={p.saving_plan_id} value={p.saving_plan_id}>
                                    {p.plan_type} — {p.interest}% (Min LKR {p.min_balance.toLocaleString()})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                              <label>Reason</label>
                              <input
                                type="text"
                                placeholder="e.g., Customer reached age threshold"
                                value={planChange.selectedAccountId === account.account_id ? planChange.reason : ''}
                                onChange={(e) => setPlanChange(pc => pc.selectedAccountId === account.account_id ? { ...pc, reason: e.target.value } : pc)}
                              />
                            </div>
                          </div>
                          {shouldShowNicForAccount(account) && (
                            <div className="form-row">
                              <div className="form-group" style={{ flex: 1 }}>
                                <label>New NIC (required when Teen → Adult)</label>
                                <input
                                  type="text"
                                  maxLength={15}
                                  placeholder="Enter new NIC"
                                  value={planChange.selectedAccountId === account.account_id ? (planChange.newNic || '') : ''}
                                  onChange={(e) => setPlanChange(pc => pc.selectedAccountId === account.account_id ? { ...pc, newNic: e.target.value } : pc)}
                                />
                                <small className="form-help">Provide the official NIC to replace the birth certificate number.</small>
                              </div>
                            </div>
                          )}
                          <div className="form-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => changePlan(account)}
                              disabled={planChange.isSubmitting || planChange.selectedAccountId !== account.account_id}
                            >
                              {planChange.isSubmitting && planChange.selectedAccountId === account.account_id ? 'Changing...' : 'Apply Plan Change'}
                            </button>
                          </div>
                        </div>
                      )}

                      {account.account_status === 'Active' && account.fd_id && (
                        <div className="account-warning">
                          <small className="text-warning">
                            ⚠️ Deactivate FD first before closing account
                          </small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountCreation;
