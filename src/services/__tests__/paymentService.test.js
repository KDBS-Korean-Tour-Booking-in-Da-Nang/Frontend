import { createTossBookingPayment } from '../paymentService';

describe('paymentService.createTossBookingPayment', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('throws when bookingId is missing', async () => {
    await expect(
      createTossBookingPayment({ userEmail: 'user@example.com' })
    ).rejects.toThrow('Booking ID is required');
  });

  it('throws when userEmail is missing', async () => {
    await expect(
      createTossBookingPayment({ bookingId: '42' })
    ).rejects.toThrow('User email is required');
  });

  it('calls backend with expected payload and returns response', async () => {
    const mockResponse = {
      success: true,
      orderId: 'ORDER_1',
      amount: 1000,
      clientKey: 'ck',
      customerKey: 'cust',
      successUrl: 'http://localhost:8080/api/toss/success',
      failUrl: 'http://localhost:8080/api/toss/fail',
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await createTossBookingPayment({
      bookingId: '42',
      userEmail: 'user@example.com',
      voucherCode: 'SALE10',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/booking\/payment$/);
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      bookingId: 42,
      userEmail: 'user@example.com',
      voucherCode: 'SALE10',
    });
    expect(result).toEqual(mockResponse);
  });

  it('throws descriptive error when backend responds with failure', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid voucher' }),
    });

    await expect(
      createTossBookingPayment({
        bookingId: 99,
        userEmail: 'user@example.com',
      })
    ).rejects.toThrow('Invalid voucher');
  });
});

