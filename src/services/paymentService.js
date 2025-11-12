const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

/**
 * Create a Toss payment order for a booking.
 * @param {{ bookingId: number|string, userEmail: string, voucherCode?: string }} payload
 * @returns {Promise<Object>}
 */
export const createTossBookingPayment = async (payload) => {
  const requestBody = {
    bookingId: Number(payload?.bookingId),
    userEmail: payload?.userEmail?.trim(),
    voucherCode: payload?.voucherCode ? payload.voucherCode.trim() : undefined,
  };

  if (!Number.isFinite(requestBody.bookingId)) {
    throw new Error('Booking ID is required');
  }

  if (!requestBody.userEmail) {
    throw new Error('User email is required');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/booking/payment`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch (_) {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export default {
  createTossBookingPayment,
};

