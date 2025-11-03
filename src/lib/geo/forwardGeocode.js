// 🗺️ Geocode city name → toạ độ lat/lon (dùng OpenStreetMap, không cần key)
export async function forwardGeocode(q) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      q
    )}&limit=1&countrycodes=vn`;
    const r = await fetch(url, { headers: { "User-Agent": "KDBS-Tour/1.0" } });
    if (!r.ok) throw new Error("Geocode error");
    const j = await r.json();
    const f = j?.[0];
    if (f) return { lat: +f.lat, lon: +f.lon };
    return null;
  } catch {
    return null;
  }
}
