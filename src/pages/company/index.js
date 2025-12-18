// Export Company Layout và Pages: CompanyLayout, Dashboard, CompanyInfo, TourManagement, TourWizard, BookingManagement, VoucherManagement
export { default as CompanyLayout } from './CompanyLayout';
export { default as BusinessDashboard } from './CompanyLayout';

// Company Pages
export { default as Dashboard } from './dashboard/Dashboard';
export { default as DashboardHome } from './dashboard/Dashboard';
export { default as CompanyInfo } from './companyInfo/companyInfo';

// Tour Management
export { default as TourManagement } from './tours/tour-management/TourManagement';
export { default as TourWizard } from './tours/wizard/TourWizard';
export { default as BusinessTourDetail } from './tours/shared/CompanyTourDetail';

// Booking Management
export { default as BookingManagement } from './bookings/BookingManagement';
export { default as CompanyBookingDetailWizard } from './bookings/CompanyBookingDetailWizard/CompanyBookingDetailWizard';

// Voucher Management
export { default as VoucherManagement } from './vouchers/VoucherManagement';
