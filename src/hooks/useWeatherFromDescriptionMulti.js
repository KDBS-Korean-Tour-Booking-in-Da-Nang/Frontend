import { useEffect, useState } from "react";
import { extractCities, cityKeyToQuery } from "../lib/geo/extractPlace";
import { forwardGeocode } from "../lib/geo/forwardGeocode";
import { fetch7DayByLatLon } from "../services/weatherService";
import i18n from "../i18n";

// 🧩 Hook chính: nhận mô tả tour → tự tìm city → lấy thời tiết cho từng city
export default function useWeatherFromDescriptionMulti(description) {
  const [state, setState] = useState({ data: [], loading: false, error: "" });

  useEffect(() => {
    if (!description) return;
    let cancelled = false;

    (async () => {
      // Chỉ bật loading khi chưa có dữ liệu (lần đầu)
      setState((prev) =>
        (prev?.data?.length ?? 0) > 0
          ? { ...prev, error: "" }
          : { data: [], loading: true, error: "" }
      );
      try {
        const langMap = { vi: "vi", en: "en", ko: "kr" };
        const owLang = langMap[i18n.language] || "en";
        const { all } = extractCities(description);
        const cities = all.length ? all : ["da-nang"];
        const results = [];

        for (const cityKey of cities.slice(0, 3)) { // Giới hạn tối đa 3 thành phố
          const query = cityKeyToQuery(cityKey);
          const coords = await forwardGeocode(query);
          if (!coords) continue;
          const days = await fetch7DayByLatLon(coords.lat, coords.lon, owLang);
          results.push({ cityKey, query, days });
        }

        if (!cancelled) setState({ data: results, loading: false, error: "" });
      } catch (err) {
        if (!cancelled)
          setState((prev) => ({
            data: prev?.data || [],
            loading: false,
            error: "Không lấy được dữ liệu thời tiết.",
          }));
      }
    })();

    return () => { cancelled = true; };
  }, [description, i18n.language]);

  return state;
}