import React, { useMemo, useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import VoucherCreateModal from './VoucherCreateModal';

const PAGE_SIZE = 15; // 3 rows x 5 columns

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
  } catch {
    return `${value}`;
  }
};

// Generate mock vouchers for testing pagination
const generateMockVouchers = () => {
  const mockVouchers = [];
  const now = new Date();
  
  for (let i = 1; i <= 45; i++) {
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + i);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    
    const isPercent = i % 2 === 0;
    mockVouchers.push({
      id: i,
      companyId: 1,
      code: `VOUCHER${String(i).padStart(3, '0')}`,
      name: `Voucher ${i} - ${isPercent ? 'Giảm %' : 'Giảm tiền'}`,
      discountType: isPercent ? 'PERCENT' : 'AMOUNT',
      discountValue: isPercent ? (10 + (i % 50)) : (50000 + (i * 10000)),
      minOrderValue: i % 3 === 0 ? 100000 : null,
      totalQuantity: 50 + (i * 5),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: i % 4 === 0 ? 'INACTIVE' : i % 5 === 0 ? 'EXPIRED' : 'ACTIVE',
      tourIds: [1, 2, 3]
    });
  }
  
  return mockVouchers;
};

const VoucherManagement = () => {
  const [vouchers, setVouchers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tours, setTours] = useState([]);

  // Mock fetch tours and vouchers (FE only)
  useEffect(() => {
    // Mock tours list for dropdown selection
    const mockTours = Array.from({ length: 12 }).map((_, i) => ({ id: i + 1, name: `Tour #${i + 1}` }));
    setTours(mockTours);

    // Load from localStorage or initialize with mock data
    try {
      const raw = localStorage.getItem('fe_vouchers');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.length > 0) {
          setVouchers(saved);
          return;
        }
      }
      // If no saved data, initialize with mock vouchers
      const mockData = generateMockVouchers();
      setVouchers(mockData);
      localStorage.setItem('fe_vouchers', JSON.stringify(mockData));
    } catch {
      // If error, still initialize with mock data
      const mockData = generateMockVouchers();
      setVouchers(mockData);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('fe_vouchers', JSON.stringify(vouchers));
    } catch {}
  }, [vouchers]);

  const totalPages = Math.max(1, Math.ceil((vouchers?.length || 0) / PAGE_SIZE));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return vouchers.slice(start, start + PAGE_SIZE);
  }, [vouchers, currentPage]);

  const handleCreate = (newVoucher) => {
    setVouchers((prev) => [{ id: Date.now(), ...newVoucher }, ...prev]);
    setIsCreateOpen(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderDiscount = (v) => {
    if (v.discountType === 'PERCENT') {
      return `${v.discountValue}%`;
    }
    return formatCurrency(v.discountValue);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quản lý Voucher</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Tạo voucher
        </button>
      </div>

      {/* Grid 3 rows x 5 columns (15 per page) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {pageData.map((v) => (
          <div key={v.id} className="bg-white rounded-lg shadow p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">Mã</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{v.code}</span>
              </div>
              <h3 className="text-lg font-semibold mb-1">{v.name}</h3>
              <div className="text-sm text-gray-700 mb-1">Loại: {v.discountType === 'PERCENT' ? 'Giảm theo %' : 'Giảm theo tiền'}</div>
              <div className="text-sm text-gray-700 mb-1">Giá trị: {renderDiscount(v)}</div>
              <div className="text-sm text-gray-700 mb-1">Số lượng: {v.totalQuantity}</div>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <div>Bắt đầu: {v.startDate ? new Date(v.startDate).toLocaleString('vi-VN') : '-'}</div>
              <div>Hết hạn: {v.endDate ? new Date(v.endDate).toLocaleString('vi-VN') : '-'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span> của{' '}
                <span className="font-medium">{vouchers.length}</span> voucher
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Trước</span>
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                {new Array(totalPages).fill(null).map((_, idx) => {
                  const page = idx + 1;
                  if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-red-600 border-red-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Sau</span>
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <VoucherCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreate}
          tours={tours}
        />
      )}
    </div>
  );
};

export default VoucherManagement;


