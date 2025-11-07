import { useEffect, useState } from "react";
import { extractCities, cityKeyToQuery } from "../lib/geo/extractPlace";
import { forwardGeocode } from "../lib/geo/forwardGeocode";
import { fetch7DayByLatLon } from "../services/weatherService";
import i18n from "../i18n";

/**
 * Lấy thời tiết theo hai trường backend:
 * - tourName: ưu tiên dò POI/city ở đây trước (ví dụ "Chùa Linh Ứng" => Đà Nẵng)
 * - tourSchedule: nếu tourName không khớp thì lấy city đầu tiên trong lịch trình (ví dụ "Huế - Đà Nẵng - Hội An" => Huế)
 *
 * @param {object} params
 * @param {string} params.tourName
 * @param {string} params.tourSchedule
 * @param {boolean} [params.multi=false]  // true: lấy nhiều city; false: chỉ city đầu tiên theo ưu tiên trên
 * @param {number}  [params.limit=3]      // giới hạn số city khi multi
 */
export default function useWeatherFromTour({ tourName = "", tourSchedule = "", multi = false, limit = 3 }) {
  const [state, setState] = useState({ data: [], loading: false, error: "" });

  useEffect(() => {
    const nameText = `${tourName || ""}`.trim();
    const scheduleText = `${tourSchedule || ""}`.trim();
    if (!nameText && !scheduleText) return;

    let cancelled = false;

    (async () => {
      // Chỉ hiển thị loading khi chưa có dữ liệu (lần đầu)
      setState((prev) =>
        (prev?.data?.length ?? 0) > 0
          ? { ...prev, error: "" }
          : { data: [], loading: true, error: "" }
      );
      try {
        // 1) Ưu tiên tour_name
        const { all: fromName } = extractCities(nameText);
        // 2) Nếu tên không có, dùng tour_schedule
        const { all: fromSchedule } = extractCities(scheduleText);

        // 3) Xây danh sách city theo ưu tiên
        let cityKeys = [];
        if (fromName.length) {
          cityKeys = multi ? fromName : [fromName[0]];
        } else if (fromSchedule.length) {
          cityKeys = multi ? fromSchedule : [fromSchedule[0]];
        } else {
          cityKeys = ["da-nang"]; // fallback
        }

        // 4) Giới hạn số lượng khi multi
        if (multi && limit > 0) cityKeys = cityKeys.slice(0, limit);

        // 5) Geocode + lấy forecast (đa ngôn ngữ theo i18n)
        const langMap = { vi: "vi", en: "en", ko: "kr" };
        const owLang = langMap[i18n.language] || "en";
        const results = [];
        for (const key of cityKeys) {
          const query = cityKeyToQuery(key);
          const coords = await forwardGeocode(query);
          if (!coords) continue;
          const days = await fetch7DayByLatLon(coords.lat, coords.lon, owLang);
          results.push({ cityKey: key, query, days });
        }

        if (!cancelled) setState({ data: results, loading: false, error: "" });
      } catch (e) {
        if (!cancelled)
          setState((prev) => ({
            data: prev?.data || [],
            loading: false,
            error: "Không lấy được dữ liệu thời tiết.",
          }));
      }
    })();

    return () => { cancelled = true; };
  }, [tourName, tourSchedule, multi, limit, i18n.language]);

  return state; // { data:[{cityKey, query, days}], loading, error }
}


