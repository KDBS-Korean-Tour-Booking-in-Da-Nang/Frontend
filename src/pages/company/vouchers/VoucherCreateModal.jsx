import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';

const defaultState = {
  companyId: null,
  code: '',
  name: '',
  discountType: '', // 'AMOUNT' | 'PERCENT'
  discountValue: '',
  minOrderValue: '',
  totalQuantity: '',
  startDate: '',
  endDate: '',
  status: 'ACTIVE',
  tourIds: []
};

const VoucherCreateModal = ({ isOpen, onClose, onCreate, tours }) => {
  const [form, setForm] = useState(defaultState);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(defaultState);
    setErrors({});
  }, [isOpen]);

  const validate = () => {
    const e = {};
    if (!form.code) e.code = 'Vui lòng nhập mã voucher';
    if (!form.name) e.name = 'Vui lòng nhập tên voucher';
    if (!form.discountType) e.discountType = 'Vui lòng chọn loại giảm giá';
    if (form.discountType && !form.discountValue) e.discountValue = 'Vui lòng nhập giá trị giảm';
    if (form.discountType === 'PERCENT') {
      const v = Number(form.discountValue);
      if (isNaN(v) || v < 1 || v > 100) e.discountValue = 'Phần trăm từ 1 đến 100';
    }
    if (!form.totalQuantity) e.totalQuantity = 'Vui lòng nhập số lượng';
    if (!form.startDate) e.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!form.endDate) e.endDate = 'Vui lòng chọn ngày kết thúc';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      ...form,
      discountValue: form.discountType === 'PERCENT' ? Number(form.discountValue) : Number(form.discountValue),
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
      totalQuantity: Number(form.totalQuantity),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null
    };
    onCreate(payload);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTour = (id) => {
    setForm((prev) => {
      const set = new Set(prev.tourIds);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...prev, tourIds: Array.from(set) };
    });
  };

  const [tourDropdownOpen, setTourDropdownOpen] = useState(false);
  const firstItemRef = useRef(null);
  const [panelMaxH, setPanelMaxH] = useState(0);
  const dropdownRef = useRef(null);

  useLayoutEffect(() => {
    if (tourDropdownOpen && firstItemRef.current) {
      const itemHeight = firstItemRef.current.offsetHeight || 40;
      setPanelMaxH(itemHeight * 7 + 8); // 7 items + a small padding
    }
  }, [tourDropdownOpen, tours]);

  useEffect(() => {
    if (!tourDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setTourDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tourDropdownOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-[92vw] max-w-6xl rounded-lg shadow-lg h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-6 pb-4 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-6 right-8 text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <h3 className="text-lg font-semibold">Tạo voucher</h3>
        </div>

        {/* Body: scrollable form */}
        <form ref={formRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã voucher</label>
              <input className="w-full border rounded px-3 h-11" value={form.code} onChange={(e) => handleChange('code', e.target.value)} />
              {errors.code && <p className="text-red-600 text-xs mt-1">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên voucher</label>
              <input className="w-full border rounded px-3 h-11" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại giảm giá</label>
              <div className="flex items-center gap-6 h-11">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="discountType" checked={form.discountType === 'AMOUNT'} onChange={() => handleChange('discountType', 'AMOUNT')} />
                  <span>Giảm theo tiền</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="discountType" checked={form.discountType === 'PERCENT'} onChange={() => handleChange('discountType', 'PERCENT')} />
                  <span>Giảm theo %</span>
                </label>
              </div>
              {errors.discountType && <p className="text-red-600 text-xs mt-1">{errors.discountType}</p>}
            </div>
            {form.discountType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá trị giảm</label>
                <input
                  className="w-full border rounded px-3 h-11"
                  type="number"
                  min={form.discountType === 'PERCENT' ? 1 : 0}
                  max={form.discountType === 'PERCENT' ? 100 : undefined}
                  placeholder={form.discountType === 'PERCENT' ? 'Nhập % (1 - 100)' : 'Nhập số tiền VND'}
                  value={form.discountValue}
                  onChange={(e) => handleChange('discountValue', e.target.value)}
                />
                {errors.discountValue && <p className="text-red-600 text-xs mt-1">{errors.discountValue}</p>}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
              <input className="w-full border rounded px-3 h-11" type="number" min={1} value={form.totalQuantity} onChange={(e) => handleChange('totalQuantity', e.target.value)} />
              {errors.totalQuantity && <p className="text-red-600 text-xs mt-1">{errors.totalQuantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn tối thiểu (VND)</label>
              <input className="w-full border rounded px-3 h-11" type="number" min={0} value={form.minOrderValue} onChange={(e) => handleChange('minOrderValue', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select className="w-full border rounded px-3 h-11" value={form.status} onChange={(e) => handleChange('status', e.target.value)}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
              <input className="w-full border rounded px-3 h-11" type="datetime-local" value={form.startDate} onChange={(e) => handleChange('startDate', e.target.value)} />
              {errors.startDate && <p className="text-red-600 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
              <input className="w-full border rounded px-3 h-11" type="datetime-local" value={form.endDate} onChange={(e) => handleChange('endDate', e.target.value)} />
              {errors.endDate && <p className="text-red-600 text-xs mt-1">{errors.endDate}</p>}
            </div>
          </div>

          {/* Multi-select tours as dropdown */}
          <div className="mt-6 relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Áp dụng cho tour</label>
            <button
              type="button"
              onClick={() => setTourDropdownOpen((o) => !o)}
              className="w-full border rounded px-3 h-11 text-left flex items-center justify-between"
            >
              <span className="truncate">
                {form.tourIds.length === 0 ? 'Chọn tour áp dụng' : `${form.tourIds.length} tour đã chọn`}
              </span>
              <svg className={`w-4 h-4 transition-transform ${tourDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
            </button>
            {tourDropdownOpen && (
              <div
                className="absolute left-0 right-0 z-20 mt-2 bg-white border rounded shadow-lg overflow-y-auto overscroll-contain"
                style={{ maxHeight: `${panelMaxH}px` }}
              >
                {tours?.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">Không có tour</div>
                ) : (
                  tours?.map((t, i) => (
                    <label key={t.id} ref={i === 0 ? firstItemRef : null} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.tourIds.includes(t.id)}
                        onChange={() => toggleTour(t.id)}
                      />
                      <span className="text-sm">{t.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer: sticky at bottom */}
        <div className="sticky bottom-0 bg-white px-8 py-4 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md">Hủy</button>
          <button type="button" onClick={() => formRef.current?.requestSubmit()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Tạo</button>
        </div>
      </div>
    </div>
  );
};

export default VoucherCreateModal;


