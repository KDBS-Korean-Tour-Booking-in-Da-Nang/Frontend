import { noAccent } from "./normalize";
import { CITIES, POIS } from "./gazetteer";

// 🧭 Trích xuất danh sách city xuất hiện trong chuỗi mô tả
export function extractCities(text = "") {
  const s = noAccent(text);
  const hits = new Set();

  // Match theo POI
  for (const p of POIS) {
    if (p.labels.some(l => s.includes(noAccent(l)))) hits.add(p.city);
  }

  // Match theo city name
  for (const [key, labels] of Object.entries(CITIES)) {
    if (labels.some(l => s.includes(noAccent(l)))) hits.add(key);
  }

  const all = [...hits];
  return { primary: all[0], all };
}

// 🗺️ Chuyển cityKey → query dùng để geocode (lat/lon)
export function cityKeyToQuery(cityKey) {
  switch (cityKey) {
    case "da-nang": return "Da Nang, Vietnam";
    case "hoi-an": return "Hoi An, Vietnam";
    case "hue": return "Hue, Vietnam";
    case "quang-nam": return "Quang Nam, Vietnam";
    case "quang-binh": return "Dong Hoi, Quang Binh, Vietnam";
    case "quang-ngai": return "Quang Ngai, Vietnam";
    case "ly-son": return "Ly Son Island, Vietnam";
    default: return "Da Nang, Vietnam"; // fallback
  }
}