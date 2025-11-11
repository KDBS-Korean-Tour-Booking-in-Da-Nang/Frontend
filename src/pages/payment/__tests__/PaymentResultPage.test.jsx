import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PaymentResultPage from '../PaymentResultPage';

const toastSpies = {
  showError: vi.fn(),
  showInfo: vi.fn(),
  showSuccess: vi.fn(),
};

vi.mock('../../../contexts/ToastContext.jsx', () => ({
  useToast: () => toastSpies,
}));

describe('PaymentResultPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    toastSpies.showError.mockClear();
    toastSpies.showInfo.mockClear();
    toastSpies.showSuccess.mockClear();
  });

  it('renders success state with valid query parameters', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/transaction-result?orderId=ORDER_X&paymentMethod=TOSS&status=SUCCESS&amount=500000',
        ]}
      >
        <Routes>
          <Route path="/transaction-result" element={<PaymentResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Thanh toán thành công')).toBeInTheDocument();
    expect(screen.getByText('ORDER_X')).toBeInTheDocument();
    expect(toastSpies.showSuccess).toHaveBeenCalled();
  });

  it('shows helpful error when query parameters are missing', async () => {
    render(
      <MemoryRouter initialEntries={['/transaction-result']}>
        <Routes>
          <Route path="/transaction-result" element={<PaymentResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Không tìm thấy đầy đủ thông tin giao dịch/i)
    ).toBeInTheDocument();
    expect(toastSpies.showError).toHaveBeenCalled();
  });
});

