import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import { createTour, getTourById, updateTour } from '../../../utils/businessToursStorage';

export default function BusinessTourForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const existing = useMemo(() => (editing ? getTourById(id) : null), [editing, id]);

  const [title, setTitle] = useState(existing?.title || '');
  const [price, setPrice] = useState(existing?.price || 0);
  const [durationDays, setDurationDays] = useState(existing?.durationDays || 1);
  const [durationInput, setDurationInput] = useState(String(existing?.durationDays || 1));
  const [thumbnailUrl, setThumbnailUrl] = useState(existing?.thumbnailUrl || '');
  const [shortDescription, setShortDescription] = useState(existing?.shortDescription || '');
  const [itineraryDays, setItineraryDays] = useState(() => {
    const days = Number(existing?.durationDays || 1);
    const arr = Array.from({ length: days }, (_, i) => existing?.itineraryDays?.[i] || '');
    return arr;
  });
  const [activeDay, setActiveDay] = useState(0);
  const [status, setStatus] = useState(existing?.status || 'draft');

  useEffect(() => {
    if (editing && !existing) {
      // If not found, go back to list
      navigate('/business/tours');
    }
  }, [editing, existing, navigate]);

  function syncDaysToDuration(nextDaysCount) {
    const parsed = Number(nextDaysCount);
    const count = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
    setDurationDays(count);
    setItineraryDays(prev => {
      const next = Array.from({ length: count }, (_, i) => prev?.[i] || '');
      return next;
    });
    if (activeDay >= count) setActiveDay(0);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Always combine per-day HTML into a single itineraryHtml block
    const finalItineraryHtml = itineraryDays
      .map((html, i) => `\n<section><h3>Ngày ${i + 1}</h3>${html || ''}</section>`) 
      .join('');
    const payload = {
      title,
      price: Number(price) || 0,
      durationDays: Number(durationDays) || 1,
      thumbnailUrl,
      shortDescription,
      itineraryHtml: finalItineraryHtml,
      itineraryDays,
      status,
    };

    if (editing) {
      updateTour(id, payload);
    } else {
      const created = createTour(payload);
      return navigate(`/business/tours/${created.id}`);
    }
    navigate(`/business/tours/${id}`);
  }

  const tinyInit = {
    height: 420,
    menubar: false,
    plugins: [
      'advlist',
      'autolink',
      'lists',
      'link',
      'image',
      'charmap',
      'preview',
      'anchor',
      'searchreplace',
      'visualblocks',
      'code',
      'fullscreen',
      'insertdatetime',
      'media',
      'table',
      'help',
      'wordcount',
    ],
    toolbar:
      'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media | removeformat | code | help',
    branding: false,
    content_style: 'body { font-family:Inter,system-ui,Arial,sans-serif; font-size:14px }',
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{editing ? 'Sửa Tour' : 'Tạo Tour'}</h1>
        <button onClick={() => navigate('/business/tours')} className="px-3 py-2 bg-gray-100 rounded">Quay lại</button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tên tour</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ví dụ: Hà Nội - Hạ Long 3N2Đ" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Giá (VND)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Số ngày</label>
            <input
              type="text"
              inputMode="numeric"
              value={durationInput}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9]/g, '');
                setDurationInput(v);
                const n = Number(v);
                if (Number.isFinite(n) && n >= 1) {
                  syncDaysToDuration(n);
                }
              }}
              onBlur={() => {
                const n = Number(durationInput);
                if (!Number.isFinite(n) || n < 1) {
                  setDurationInput(String(durationDays));
                } else {
                  setDurationInput(String(Math.floor(n)));
                  syncDaysToDuration(n);
                }
              }}
              className="w-full border rounded px-3 py-2"
              placeholder="Ví dụ: 4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border rounded px-3 py-2">
              <option value="draft">Nháp</option>
              <option value="published">Công khai</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Ảnh đại diện (URL)</label>
          <input value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="https://..." />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mô tả ngắn</label>
          <textarea value={shortDescription} onChange={e => setShortDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Lịch trình từng ngày</label>
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {itineraryDays.map((_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setActiveDay(i)}
                className={`px-3 py-2 rounded border ${activeDay === i ? 'bg-orange-500 text-white border-orange-500' : 'bg-white'}`}
              >
                Ngày {i + 1}
              </button>
            ))}
          </div>
          <div>
            <Editor
              apiKey={import.meta.env.VITE_TINYMCE_API_KEY || 'no-api-key'}
              value={itineraryDays[activeDay]}
              init={{ ...tinyInit, plugins: [...tinyInit.plugins, 'table'], toolbar: `${tinyInit.toolbar} | table` }}
              onEditorChange={(content) => {
                setItineraryDays(prev => {
                  const next = [...prev];
                  next[activeDay] = content;
                  return next;
                });
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/business/tours')} className="px-4 py-2 bg-gray-100 rounded">Hủy</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{editing ? 'Lưu thay đổi' : 'Tạo tour'}</button>
        </div>
      </form>
    </div>
  );
}


