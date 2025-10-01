import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS, createAuthFormHeaders } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const hasBookedTour = (bookingSummary, tourId) => {
  if (!Array.isArray(bookingSummary)) return false;
  return bookingSummary.some((b) => String(b.tourId) === String(tourId) || String(b.tour?.tourId) === String(tourId));
};

export const useTourRated = (tourId) => {
  const { user, getToken } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bookingSummary, setBookingSummary] = useState([]);
  const [ratedByMe, setRatedByMe] = useState(false);

  const canRate = useMemo(() => {
    if (!user) return false;
    if (!tourId) return false;
    const booked = hasBookedTour(bookingSummary, tourId);
    const possibleMyIds = [user.userId, user.id, user.user_id].filter(Boolean);
    const alreadyRated = ratings.some((r) => possibleMyIds.some((mid) => String(r.userId) === String(mid)));
    const finalRated = ratedByMe || alreadyRated;
    return booked && !finalRated;
  }, [user, tourId, bookingSummary, ratings, ratedByMe]);

  const fetchRatingsByTour = useCallback(async () => {
    if (!tourId) return;
    try {
      setLoading(true);
      setError(null);
      const token = getToken && getToken();
      let res = await fetch(API_ENDPOINTS.TOUR_RATED_BY_TOUR(tourId), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status === 401 && !token) {
        // Retry with token if available later
        const retryToken = getToken && getToken();
        if (retryToken) {
          res = await fetch(API_ENDPOINTS.TOUR_RATED_BY_TOUR(tourId), {
            headers: { Authorization: `Bearer ${retryToken}` },
          });
        }
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRatings(list);
      // Update ratedByMe based on fetched list
      const possibleMyIds = [user?.userId, user?.id, user?.user_id].filter(Boolean);
      const hasMine = list.some((r) => possibleMyIds.some((mid) => String(r.userId) === String(mid)));
      setRatedByMe(hasMine);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tourId, getToken]);

  const refresh = useCallback(async () => {
    await fetchRatingsByTour();
  }, [fetchRatingsByTour]);

  const submitRating = useCallback(
    async ({ star, comment }) => {
      const token = getToken();
      if (!token) throw new Error('Unauthenticated');
      const form = new FormData();
      form.append('tourId', String(tourId));
      form.append('userEmail', user?.email || '');
      form.append('star', String(star));
      if (comment) form.append('comment', comment);

      const res = await fetch(API_ENDPOINTS.TOUR_RATED, {
        method: 'POST',
        headers: createAuthFormHeaders(token),
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const created = await res.json();
      setRatings((prev) => [created, ...prev]);
      setRatedByMe(true);
      return created;
    },
    [tourId, user, getToken]
  );

  const updateRating = useCallback(
    async (id, { star, comment }) => {
      const token = getToken();
      if (!token) throw new Error('Unauthenticated');
      const form = new FormData();
      if (star != null) form.append('star', String(star));
      if (comment != null) form.append('comment', comment);

      const res = await fetch(API_ENDPOINTS.TOUR_RATED_BY_ID(id), {
        method: 'PUT',
        headers: createAuthFormHeaders(token),
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // If already rated, reflect state to hide form
        if ((err.message || '').toLowerCase().includes('rated') || (err.message || '').toLowerCase().includes('existed')) {
          setRatedByMe(true);
          await fetchRatingsByTour();
        }
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const updated = await res.json();
      setRatings((prev) => prev.map((r) => (String(r.tourRatedId) === String(id) ? updated : r)));
      return updated;
    },
    [getToken]
  );

  const deleteRating = useCallback(
    async (id) => {
      const token = getToken();
      if (!token) throw new Error('Unauthenticated');
      const res = await fetch(API_ENDPOINTS.TOUR_RATED_BY_ID(id), {
        method: 'DELETE',
        headers: createAuthFormHeaders(token),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRatings((prev) => prev.filter((r) => String(r.tourRatedId) !== String(id)));
    },
    [getToken]
  );

  useEffect(() => {
    fetchRatingsByTour();
  }, [fetchRatingsByTour]);

  useEffect(() => {
    // Fetch booking summary for eligibility check
    const fetchBookingSummary = async () => {
      if (!user?.email) return setBookingSummary([]);
      try {
        const token = getToken();
        if (!token) return;
        const res = await fetch(
          `${API_ENDPOINTS.BOOKING_SUMMARY_BY_EMAIL(user.email)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setBookingSummary(Array.isArray(data) ? data : []);
      } catch {
        setBookingSummary([]);
      }
    };
    fetchBookingSummary();
  }, [user, getToken]);

  const myRating = useMemo(() => {
    if (!user) return null;
    const possibleMyIds = [user.userId, user.id, user.user_id].filter(Boolean);
    return ratings.find((r) => possibleMyIds.some((mid) => String(r.userId) === String(mid))) || null;
  }, [ratings, user]);

  return {
    ratings,
    loading,
    error,
    refresh,
    submitRating,
    updateRating,
    deleteRating,
    canRate,
    ratedByMe,
    myRating,
  };
};


