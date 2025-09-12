import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { CreditCardIcon, ArrowUpIcon, ArrowDownIcon, ClockIcon } from '@heroicons/react/24/outline';
import './payment.css';

const Payment = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposit');

  const tabs = [
    { id: 'deposit', name: t('payment.tabs.deposit'), icon: ArrowDownIcon },
    { id: 'withdraw', name: t('payment.tabs.withdraw'), icon: ArrowUpIcon },
    { id: 'history', name: t('payment.tabs.history'), icon: ClockIcon }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'deposit':
        return <DepositTab />;
      case 'withdraw':
        return <WithdrawTab />;
      case 'history':
        return <HistoryTab />;
      default:
        return <DepositTab />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('payment.loginRequired')}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('payment.heading')}</h2>
              <p className="text-gray-600">{t('payment.subtitle')}</p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Deposit Tab Component
const DepositTab = () => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Prevent 'e' character and negative numbers
    if (value.includes('e') || value.includes('-')) return;
    
    const numValue = parseFloat(value);
    if (numValue < 10000) {
      setError(t('payment.deposit.minError'));
    } else {
      setError('');
    }
    
    setAmount(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(amount) < 10000) {
      setError(t('payment.deposit.minError'));
      return;
    }

    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(t('payment.deposit.success'));
      setAmount('');
    } catch (err) {
      setError(t('payment.deposit.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('payment.deposit.title')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">{t('payment.deposit.amountLabel')}</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={handleAmountChange}
            min="10000"
            step="1000"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
            placeholder={t('payment.deposit.placeholder')}
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('payment.deposit.paymentInfoTitle')}</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>{t('payment.deposit.bank')}</p>
            <p>{t('payment.deposit.account')}</p>
            <p>{t('payment.deposit.holder')}</p>
            <p>{t('payment.deposit.content')}</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || parseFloat(amount) < 10000}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? t('payment.deposit.submitting') : t('payment.deposit.submit')}
        </button>
      </form>
    </div>
  );
};

// Withdraw Tab Component
const WithdrawTab = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    amount: '',
    bankAccount: '',
    accountHolder: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(t('payment.withdraw.success'));
      setFormData({ amount: '', bankAccount: '', accountHolder: '' });
    } catch (err) {
      setError(t('payment.withdraw.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('payment.withdraw.title')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-700">{t('payment.withdraw.amountLabel')}</label>
          <input
            type="number"
            id="withdrawAmount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min="50000"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
            placeholder={t('payment.withdraw.placeholderAmount')}
          />
        </div>

        <div>
          <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">{t('payment.withdraw.accountNumber')}</label>
          <input
            type="text"
            id="bankAccount"
            name="bankAccount"
            value={formData.bankAccount}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Nhập số tài khoản"
          />
        </div>

        <div>
          <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700">{t('payment.withdraw.accountHolder')}</label>
          <input
            type="text"
            id="accountHolder"
            name="accountHolder"
            value={formData.accountHolder}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Nhập tên chủ tài khoản"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? t('payment.withdraw.submitting') : t('payment.withdraw.submit')}
        </button>
      </form>
    </div>
  );
};

// History Tab Component
const HistoryTab = () => {
  const { t } = useTranslation();
  const mockHistory = [
    {
      id: 1,
      type: 'deposit',
      amount: 1000000,
      status: 'completed',
      bank: 'Vietcombank',
      paymentId: 'PAY001',
      date: '2024-01-15'
    },
    {
      id: 2,
      type: 'withdraw',
      amount: 500000,
      status: 'pending',
      bank: 'BIDV',
      paymentId: 'PAY002',
      date: '2024-01-14'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-primary bg-secondary';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return t('payment.history.status.completed');
      case 'pending': return t('payment.history.status.pending');
      case 'failed': return t('payment.history.status.failed');
      default: return t('payment.history.status.unknown');
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{t('payment.history.title')}</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('payment.history.headers.type')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.history.headers.amount')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.history.headers.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.history.headers.bank')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.history.headers.paymentId')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('payment.history.headers.date')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockHistory.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.type === 'deposit' ? t('payment.history.type.deposit') : t('payment.history.type.withdraw')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.amount.toLocaleString('vi-VN')} VNĐ
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                    {getStatusText(transaction.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.bank}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {transaction.paymentId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(transaction.date).toLocaleDateString('vi-VN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payment; 