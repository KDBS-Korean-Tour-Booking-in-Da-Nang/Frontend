import { XMarkIcon } from '@heroicons/react/24/outline';
import { CurrencyDollarIcon, CalendarIcon, UserIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const TransactionDetailModal = ({ isOpen, onClose, transaction }) => {
  if (!isOpen || !transaction) return null;

  // Debug: Log transaction data
  console.log('Transaction in modal:', transaction);
  console.log('OrderInfo value:', transaction.orderInfo);

  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'completed': { color: 'bg-green-50 text-green-700 border-green-200', label: 'Đã hoàn thành', icon: '✅' },
      'pending': { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Đang chờ', icon: '⏳' },
      'failed': { color: 'bg-red-50 text-red-700 border-red-200', label: 'Thất bại', icon: '❌' }
    };
    
    const map = statusMap[status] || { color: 'bg-gray-50 text-gray-700 border-gray-200', label: status, icon: '📋' };
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-[24px] border text-sm font-medium ${map.color}`}>
        <span>{map.icon}</span>
        {map.label}
      </span>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[20px] bg-blue-100 flex items-center justify-center">
              <CurrencyDollarIcon className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Chi tiết giao dịch</h2>
              <p className="text-sm text-gray-500 mt-0.5">{transaction.transactionId || transaction.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[20px] hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {/* Transaction Status */}
          <div className="flex justify-center">
            {getStatusBadge(transaction.status)}
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Thông tin khách hàng</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tên khách hàng:</span>
                <span className="text-sm font-medium text-gray-900">{transaction.customerName || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm font-medium text-gray-900">{transaction.customerEmail || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="bg-blue-50 rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <CurrencyDollarIcon className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Thông tin giao dịch</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Order Id:</span>
                <span className="text-sm font-medium text-gray-900 text-right break-all">{transaction.orderId || transaction.bookingId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">Order Info:</span>
                <span className="text-sm font-medium text-gray-900 text-right break-all max-w-md">
                  {transaction.orderInfo && transaction.orderInfo !== 'N/A' && transaction.orderInfo !== null 
                    ? transaction.orderInfo 
                    : 'Không có thông tin'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Số tiền:</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(transaction.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Phương thức thanh toán:</span>
                <span className="text-sm font-medium text-gray-900">{transaction.paymentMethod || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Transaction Date */}
          <div className="bg-purple-50 rounded-[24px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <CalendarIcon className="w-5 h-5 text-purple-600" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Thời gian</h3>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Ngày giao dịch:</span>
              <span className="text-sm font-medium text-gray-900">{formatDate(transaction.transactionDate)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-[20px] border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;
