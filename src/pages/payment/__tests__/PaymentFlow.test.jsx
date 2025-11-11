import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import BookingCheckPaymentPage from '../BookingCheckPaymentPage';
import PaymentResultPage from '../PaymentResultPage';
import { createTossBookingPayment } from '../../../services/paymentService';
import { getBookingById, getBookingTotal } from '../../../services/bookingAPI';

const toastSpies = {
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showInfo: vi.fn(),
  addToast: vi.fn(),
  removeToast: vi.fn(),
};

vi.mock('../../../services/bookingAPI', () => ({
  getBookingById: vi.fn(),
  getBookingTotal: vi.fn(),
}));

vi.mock('../../../services/paymentService', () => ({
  createTossBookingPayment: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { email: 'auth-user@example.com' },
    loading: false,
  }),
}));

vi.mock('../../../contexts/ToastContext.jsx', () => ({
  useToast: () => toastSpies,
}));

vi.mock('../../../components/payment/TossWidgetContainer.jsx', () => {
  const React = require('react');
  const { useEffect } = React;
  return {
    default: (props) => {
      useEffect(() => {
        props.onReady?.();
      }, [props]);
      return (
        <div data-testid="mock-toss-widget">
          <button type="button" onClick={() => props.onClose?.()}>
            Đóng widget
          </button>
        </div>
      );
    },
  };
});

describe('BookingCheckPaymentPage integration flow', () => {
  const bookingResponse = {
    bookingId: 42,
    tourName: 'Da Nang Explorer',
    departureDate: '2025-12-01',
    totalGuests: 3,
    bookingStatus: 'PENDING_PAYMENT',
    contactEmail: 'contact@example.com',
    userEmail: 'fallback@example.com',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    toastSpies.showError.mockClear();
    toastSpies.showSuccess.mockClear();
    toastSpies.showInfo.mockClear();

    getBookingById.mockResolvedValue(bookingResponse);
    getBookingTotal.mockResolvedValue({ totalAmount: 1234567 });
    createTossBookingPayment.mockResolvedValue({
      success: true,
      clientKey: 'test-client',
      customerKey: 'test-customer',
      amount: 1234567,
      orderId: 'ORDER_TEST_1',
      successUrl: 'http://localhost:8080/api/toss/success',
      failUrl: 'http://localhost:8080/api/toss/fail',
      message: 'Vui lòng hoàn tất thanh toán trong 5 phút.',
    });
  });

  const renderBookingPage = () =>
    render(
      <MemoryRouter initialEntries={['/booking/42/payment']}>
        <Routes>
          <Route path="/booking/:bookingId/payment" element={<BookingCheckPaymentPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('loads booking info and opens Toss widget on successful payment creation', async () => {
    renderBookingPage();

    await waitFor(() => {
      expect(getBookingById).toHaveBeenCalledWith('42');
    });

    expect(screen.getByText('Da Nang Explorer')).toBeInTheDocument();
    const payButton = screen.getByRole('button', { name: 'Thanh toán' });
    await userEvent.click(payButton);

    await waitFor(() => {
      expect(createTossBookingPayment).toHaveBeenCalledWith({
        bookingId: '42',
        userEmail: 'contact@example.com',
        voucherCode: '',
      });
    });

    expect(await screen.findByTestId('mock-toss-widget')).toBeInTheDocument();
    expect(toastSpies.showSuccess).toHaveBeenCalled();
    expect(toastSpies.showInfo).toHaveBeenCalled();
  });

  it('shows an error toast when payment creation fails', async () => {
    createTossBookingPayment.mockRejectedValueOnce(new Error('Network error'));

    renderBookingPage();

    await waitFor(() => {
      expect(getBookingById).toHaveBeenCalled();
    });

    const payButton = screen.getByRole('button', { name: 'Thanh toán' });
    await userEvent.click(payButton);

    await waitFor(() => {
      expect(toastSpies.showError).toHaveBeenCalledWith(
        'Network error'
      );
    });
  });

  it('simulates end-to-end flow from booking page to payment result page', async () => {
    const bookingRender = render(
      <MemoryRouter initialEntries={['/booking/42/payment']}>
        <Routes>
          <Route path="/booking/:bookingId/payment" element={<BookingCheckPaymentPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getBookingById).toHaveBeenCalledWith('42');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Thanh toán' }));

    await waitFor(() => {
      expect(createTossBookingPayment).toHaveBeenCalled();
    });

    expect(await screen.findByTestId('mock-toss-widget')).toBeInTheDocument();

    // Simulate backend redirect back to frontend with success params by rendering result page
    bookingRender.unmount();

    render(
      <MemoryRouter
        initialEntries={[
          '/transaction-result?orderId=ORDER_TEST_1&paymentMethod=TOSS&status=SUCCESS&amount=1234567',
        ]}
      >
        <Routes>
          <Route path="/transaction-result" element={<PaymentResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(screen.getByText('ORDER_TEST_1')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
  });
});

