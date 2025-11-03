import axios from "axios";

// 🌦️ Lấy dự báo thời tiết từ OpenWeather (2.5 forecast 3-hourly) và tổng hợp theo ngày
export async function fetch7DayByLatLon(lat, lon) {
  const key = import.meta.env.VITE_OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=vi&appid=${key}`;
  const { data } = await axios.get(url);
  const items = Array.isArray(data?.list) ? data.list : [];

  // Group entries by local date (YYYY-MM-DD)
  const byDate = new Map();
  for (const it of items) {
    const tsMs = (it?.dt || 0) * 1000;
    const d = new Date(tsMs);
    const keyDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDate.has(keyDate)) byDate.set(keyDate, []);
    byDate.get(keyDate).push(it);
  }

  // Build daily summary compatible with CityWeatherCard structure
  const daily = [];
  for (const [dateKey, arr] of byDate) {
    if (!arr.length) continue;
    const temps = arr
      .map((a) => a?.main?.temp)
      .filter((v) => typeof v === "number");
    const tempMins = arr
      .map((a) => a?.main?.temp_min)
      .filter((v) => typeof v === "number");
    const tempMaxs = arr
      .map((a) => a?.main?.temp_max)
      .filter((v) => typeof v === "number");
    const avg = temps.length
      ? temps.reduce((s, v) => s + v, 0) / temps.length
      : undefined;
    const min = tempMins.length ? Math.min(...tempMins) : avg;
    const max = tempMaxs.length ? Math.max(...tempMaxs) : avg;

    // Pick most frequent description
    const descCount = new Map();
    for (const a of arr) {
      const desc = a?.weather?.[0]?.description;
      if (!desc) continue;
      descCount.set(desc, (descCount.get(desc) || 0) + 1);
    }
    let bestDesc = "";
    let bestCnt = -1;
    for (const [desc, cnt] of descCount) {
      if (cnt > bestCnt) {
        bestCnt = cnt;
        bestDesc = desc;
      }
    }

    // Use noon entry dt if possible, else first
    let useDt = arr[0]?.dt;
    const noon = arr.find((a) => {
      const h = new Date(a?.dt * 1000).getHours();
      return h === 12;
    });
    if (noon?.dt) useDt = noon.dt;

    daily.push({
      dt: useDt,
      temp: { day: avg, min, max },
      weather: [{ description: bestDesc }],
    });
  }

  // OpenWeather forecast provides up to ~5-6 days; giới hạn 6 ngày
  return daily.slice(0, 6);
}
