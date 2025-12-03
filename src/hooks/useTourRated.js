import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_ENDPOINTS, createAuthFormHeaders } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const isCompletedBooking = (booking) => {
  const status = String(booking?.status || '').toUpperCase();
  const txStatus = String(booking?.transactionStatus || '').toUpperCase();
  // Consider completed when transaction succeeded, or status marked as purchased/confirmed
  return txStatus === 'SUCCESS' || status === 'PURCHASED' || status === 'CONFIRMED';
};

// Helper: Kiểm tra JWT hết hạn (UNIX timestamp)
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp && payload.exp < Date.now() / 1000;
  } catch {
    return true;
  }
}

export const useTourRated = (tourId) => {
  const { user, getToken } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ratedByMe, setRatedByMe] = useState(false);

  const canRate = useMemo(() => {
    if (!user) return false;
    if (!tourId) return false;
    const possibleMyIds = [user.userId, user.id, user.user_id].filter(Boolean);
    const alreadyRated = ratings.some((r) => possibleMyIds.some((mid) => String(r.userId) === String(mid)));
    return !alreadyRated;
  }, [user, tourId, ratings, ratedByMe]);

  const fetchRatingsByTour = useCallback(async () => {
    if (!tourId) return;
    let shouldSendToken = false;
    let token = null;
    if (user && getToken) {
      token = getToken();
      shouldSendToken = token && !isTokenExpired(token);
    }
    try {
      setLoading(true);
      setError(null);
      let fetchOptions = {};
      if (shouldSendToken) {
        fetchOptions.headers = createAuthFormHeaders(token);
      }
      let res = await fetch(API_ENDPOINTS.TOUR_RATED_BY_TOUR(tourId), fetchOptions);
      if (!res.ok) {
        setRatings([]);
        setRatedByMe(false);
        return;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setRatings(list);
      const possibleMyIds = [user?.userId, user?.id, user?.user_id].filter(Boolean);
      const hasMine = list.some((r) => possibleMyIds.some((mid) => String(r.userId) === String(mid)));
      setRatedByMe(hasMine);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tourId, getToken, user]);

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


