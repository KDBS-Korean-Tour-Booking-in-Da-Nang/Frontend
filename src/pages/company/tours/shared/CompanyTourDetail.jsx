import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTourById } from '../../../../utils/companyToursStorage';

export default function CompanyTourDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const tour = useMemo(() => getTourById(id), [id]);

  if (!tour) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="mb-4">
          <button onClick={() => navigate('/company/tours')} className="px-3 py-2 bg-gray-100 rounded">Quay lại</button>
        </div>
        <div className="text-red-600">Không tìm thấy tour.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{tour.title}</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/company/tours')} className="px-3 py-2 bg-gray-100 rounded">Danh sách</button>
          <button onClick={() => navigate(`/company/tours/${tour.id}/edit`)} className="px-3 py-2 bg-primary text-white rounded">Sửa</button>
        </div>
      </div>

      {tour.thumbnailUrl ? (
        <img 
          src={tour.thumbnailUrl} 
          alt={tour.title} 
          className="w-full h-64 object-cover rounded mb-4"
          onError={(e) => {
            e.target.src = '/default-Tour.jpg';
          }}
        />
      ) : null}

      <div className="text-gray-600 mb-2">Giá: {Number(tour.price).toLocaleString()} VND • {tour.durationDays} ngày</div>
      <div className="text-gray-700 mb-6">{tour.shortDescription}</div>

      <h2 className="text-xl font-semibold mb-2">Lịch trình</h2>
      <div className="prose max-w-none">
        {Array.isArray(tour.itineraryDays) && tour.itineraryDays.length > 0 ? (
          tour.itineraryDays.map((html, i) => (
            <section key={i} className="mb-6">
              <h3 className="font-semibold bg-primary text-white px-3 py-2 rounded">Ngày {i + 1}</h3>
              <div className="mt-2" dangerouslySetInnerHTML={{ __html: html }} />
            </section>
          ))
        ) : (
          <div dangerouslySetInnerHTML={{ __html: tour.itineraryHtml }} />
        )}
      </div>
    </div>
  );
}


