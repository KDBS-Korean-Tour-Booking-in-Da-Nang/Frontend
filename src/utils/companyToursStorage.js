// Utilities for storing Company Tours in localStorage (frontend-only mock CRUD)

const STORAGE_KEY = 'company_tours_v1';

function readAllTours() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllTours(tours) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tours));
  } catch {
    // Failed to write tours to localStorage, silently fail
  }
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function listTours() {
  return readAllTours().sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
}

export function getTourById(id) {
  return readAllTours().find(t => t.id === id) || null;
}

export function createTour(partial) {
  const now = Date.now();
  const newTour = {
    id: generateId(),
    title: '',
    price: 0,
    durationDays: 1,
    thumbnailUrl: '',
    shortDescription: '',
    itineraryHtml: '',
    itineraryDays: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
  if (!Array.isArray(newTour.itineraryDays) || newTour.itineraryDays.length === 0) {
    const days = Number(newTour.durationDays) || 1;
    newTour.itineraryDays = Array.from({ length: days }, () => '');
  }
  const tours = readAllTours();
  tours.push(newTour);
  writeAllTours(tours);
  return newTour;
}

// Cập nhật tour: merge updates vào tour hiện tại và điều chỉnh itineraryDays theo durationDays
export function updateTour(id, updates) {
  const tours = readAllTours();
  const idx = tours.findIndex(t => t.id === id);
  if (idx === -1) return null;
  const now = Date.now();
  const merged = { ...tours[idx], ...updates };
  const targetDays = Number(merged.durationDays) || 1;
  // Đảm bảo itineraryDays là mảng
  if (!Array.isArray(merged.itineraryDays)) merged.itineraryDays = [];
  // Điều chỉnh số lượng ngày trong itineraryDays theo durationDays
  if (merged.itineraryDays.length !== targetDays) {
    const next = Array.from({ length: targetDays }, (_, i) => merged.itineraryDays[i] || '');
    merged.itineraryDays = next;
  }
  tours[idx] = { ...merged, updatedAt: now };
  writeAllTours(tours);
  return tours[idx];
}

export function deleteTour(id) {
  const tours = readAllTours();
  const filtered = tours.filter(t => t.id !== id);
  writeAllTours(filtered);
  return tours.length !== filtered.length;
}


