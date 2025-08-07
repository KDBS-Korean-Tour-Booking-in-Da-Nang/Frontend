import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CreditCardIcon, ArrowUpIcon, ArrowDownIcon, ClockIcon } from '@heroicons/react/24/outline';

const Payment = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposit');

  const tabs = [
    { id: 'deposit', name: 'Nạp tiền', icon: ArrowDownIcon },
    { id: 'withdraw', name: 'Rút tiền', icon: ArrowUpIcon },
    { id: 'history', name: 'Lịch sử', icon: ClockIcon }
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Vui lòng đăng nhập để sử dụng dịch vụ thanh toán
          </h2>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Quản lý thanh toán
              </h2>
              <p className="text-gray-600">
                Nạp tiền, rút tiền và xem lịch sử giao dịch
              </p>
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
                          ? 'border-blue-500 text-blue-600'
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
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Prevent 'e' character and negative numbers
    if (value.includes('e') || value.includes('-')) return;
    
    const numValue = parseFloat(value);
    if (numValue < 10000) {
      setError('Số tiền tối thiểu là 10,000 VNĐ');
    } else {
      setError('');
    }
    
    setAmount(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (parseFloat(amount) < 10000) {
      setError('Số tiền tối thiểu là 10,000 VNĐ');
      return;
    }

    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Nạp tiền thành công!');
      setAmount('');
    } catch (err) {
      setError('Nạp tiền thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Nạp tiền vào tài khoản</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Số tiền (VNĐ)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={handleAmountChange}
            min="10000"
            step="1000"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập số tiền (tối thiểu 10,000 VNĐ)"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Thông tin thanh toán</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Ngân hàng: Vietcombank</p>
            <p>• Số tài khoản: 1234567890</p>
            <p>• Chủ tài khoản: CÔNG TY DU LỊCH ĐÀ NẴNG KOREA</p>
            <p>• Nội dung: NAP_[SỐ ĐIỆN THOẠI]</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || parseFloat(amount) < 10000}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : 'Nạp tiền'}
        </button>
      </form>
    </div>
  );
};

// Withdraw Tab Component
const WithdrawTab = () => {
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
      alert('Yêu cầu rút tiền đã được gửi!');
      setFormData({ amount: '', bankAccount: '', accountHolder: '' });
    } catch (err) {
      setError('Rút tiền thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Rút tiền từ tài khoản</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-700">
            Số tiền (VNĐ)
          </label>
          <input
            type="number"
            id="withdrawAmount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min="50000"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập số tiền (tối thiểu 50,000 VNĐ)"
          />
        </div>

        <div>
          <label htmlFor="bankAccount" className="block text-sm font-medium text-gray-700">
            Số tài khoản ngân hàng
          </label>
          <input
            type="text"
            id="bankAccount"
            name="bankAccount"
            value={formData.bankAccount}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập số tài khoản"
          />
        </div>

        <div>
          <label htmlFor="accountHolder" className="block text-sm font-medium text-gray-700">
            Tên chủ tài khoản
          </label>
          <input
            type="text"
            id="accountHolder"
            name="accountHolder"
            value={formData.accountHolder}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nhập tên chủ tài khoản"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : 'Rút tiền'}
        </button>
      </form>
    </div>
  );
};

// History Tab Component
const HistoryTab = () => {
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
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return 'Thành công';
      case 'pending': return 'Đang xử lý';
      case 'failed': return 'Thất bại';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Lịch sử giao dịch</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loại
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Số tiền
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngân hàng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockHistory.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {transaction.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                </td>
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