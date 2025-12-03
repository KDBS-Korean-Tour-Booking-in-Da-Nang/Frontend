// 🌤️ Thẻ hiển thị thời tiết 7 ngày cho 1 thành phố (thiết kế mới)
export default function CityWeatherCard({ title = "Thời tiết", days = [] }) {
  if (!Array.isArray(days) || days.length === 0) {
    return (
      <div className="rounded-xl border p-4 bg-white shadow-sm text-sm text-gray-500 italic">
        Không có dữ liệu thời tiết.
      </div>
    );
  }

  const iconFromDesc = (desc = "") => {
    const s = (desc || "").toLowerCase();
    if (/(mưa|rain)/.test(s)) return "🌧️";
    if (/(giông|thunder|storm)/.test(s)) return "⛈️";
    if (/(tuyết|snow)/.test(s)) return "❄️";
    if (/(mây rải rác|few clouds)/.test(s)) return "⛅";
    if (/(mây|cloud)/.test(s)) return "☁️";
    if (/(sương|mist|fog)/.test(s)) return "🌫️";
    if (/(nắng|clear|trong)/.test(s)) return "☀️";
    return "🌤️";
  };

  const formatDay = (unix) => {
    const dt = new Date(unix * 1000);
    return dt.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  return (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-base">{title}</h4>
        <span className="text-xs text-gray-500">6 ngày tới</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {days.map((d, i) => {
          const desc = d?.weather?.[0]?.description || "";
          const t = Math.round(d?.temp?.day ?? 0);
          const tMin = Math.round(d?.temp?.min ?? t);
          const tMax = Math.round(d?.temp?.max ?? t);
          const range = Math.max(1, tMax - tMin);
          const pos = Math.min(100, Math.max(0, ((t - tMin) / range) * 100));

          return (
            <div
              key={i}
              className="rounded-xl border bg-gradient-to-b from-white to-slate-50 p-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">
                  {formatDay(d?.dt || 0)}
                </div>
                <div className="text-xl" aria-label="weather-icon">
                  {iconFromDesc(desc)}
                </div>
              </div>

              <div className="mt-2 text-slate-600 text-sm line-clamp-1 capitalize">
                {desc}
              </div>

              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-slate-800">{t}°C</div>
                  <div className="text-xs text-slate-500">
                    min {tMin}° / max {tMax}°
                  </div>
                </div>
                <div className="mt-2 h-2 w-full bg-slate-200 rounded-full relative overflow-hidden">
                  <div
                    className="absolute top-0 h-2 bg-amber-400 rounded-full"
                    style={{ left: 0, width: `${pos}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
