import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { listTours, deleteTour } from '../../../utils/businessToursStorage';

export default function BusinessTourList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const tours = useMemo(() => listTours(), []);

  // Check if user has business role
  const isBusinessUser = user && (user.role === 'COMPANY' || user.role === 'company');
  
  if (!isBusinessUser) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Truy cập bị từ chối</h1>
          <p className="text-gray-600">Bạn cần có quyền business để truy cập trang này.</p>
        </div>
      </div>
    );
  }

  function handleCreate() {
    navigate('/business/tours/new');
  }

  function handleEdit(id) {
    navigate(`/business/tours/${id}/edit`);
  }

  function handleView(id) {
    navigate(`/business/tours/${id}`);
  }

  function handleDelete(id) {
    const ok = window.confirm('Xóa tour này?');
    if (!ok) return;
    const result = deleteTour(id);
    if (result) {
      navigate(0);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Business - Quản lý Tour</h1>
        <button onClick={handleCreate} className="px-4 py-2 bg-primary text-white rounded">+ Tạo tour</button>
      </div>
      {tours.length === 0 ? (
        <div className="text-gray-600">Chưa có tour nào. Hãy tạo tour mới.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tours.map(t => (
            <div key={t.id} className="bg-white rounded shadow p-4 flex flex-col">
              {t.thumbnailUrl ? (
                <img src={t.thumbnailUrl} alt={t.title} className="w-full h-40 object-cover rounded mb-3" />
              ) : (
                <div className="w-full h-40 bg-gray-100 rounded mb-3 flex items-center justify-center text-gray-400">No Image</div>
              )}
              <div className="flex-1">
                <h2 className="text-lg font-medium">{t.title || 'Chưa đặt tên'}</h2>
                <div className="text-sm text-gray-500 mt-1">Giá: {Number(t.price).toLocaleString()} VND • {t.durationDays} ngày</div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">{t.shortDescription}</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleView(t.id)} className="px-3 py-2 bg-gray-100 rounded">Xem</button>
                <button onClick={() => handleEdit(t.id)} className="px-3 py-2 bg-primary text-white rounded">Sửa</button>
                <button onClick={() => handleDelete(t.id)} className="px-3 py-2 bg-red-600 text-white rounded">Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


