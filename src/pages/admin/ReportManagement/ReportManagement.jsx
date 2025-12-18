import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Pagination from '../Pagination';
import { Tooltip } from '../../../components';
import { 
  DocumentTextIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const ReportManagement = () => {
  const { t } = useTranslation();
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  const reports = [
    {
      id: 1,
      title: 'User Registration Report',
      description: 'Monthly report on new user registrations and user growth trends',
      type: 'user',
      period: 'January 2024',
      status: 'completed',
      generatedAt: '2024-01-31',
      fileSize: '2.3 MB',
      downloads: 15
    },
    {
      id: 2,
      title: 'Revenue Analysis Report',
      description: 'Comprehensive analysis of platform revenue and financial performance',
      type: 'revenue',
      period: 'Q4 2023',
      status: 'completed',
      generatedAt: '2024-01-15',
      fileSize: '5.7 MB',
      downloads: 8
    },
    {
      id: 3,
      title: 'Company Approval Report',
      description: 'Report on company registration approvals and pending applications',
      type: 'company',
      period: 'December 2023',
      status: 'completed',
      generatedAt: '2024-01-10',
      fileSize: '1.8 MB',
      downloads: 12
    },
    {
      id: 4,
      title: 'Staff Performance Report',
      description: 'Monthly performance metrics for staff members and their activities',
      type: 'staff',
      period: 'January 2024',
      status: 'generating',
      generatedAt: null,
      fileSize: null,
      downloads: 0
    },
    {
      id: 5,
      title: 'Forum Activity Report',
      description: 'Analysis of forum posts, user engagement, and content moderation',
      type: 'forum',
      period: 'January 2024',
      status: 'pending',
      generatedAt: null,
      fileSize: null,
      downloads: 0
    }
  ];

  const reportTypes = [
    { id: 'user', name: 'User Reports', icon: UserGroupIcon, color: 'blue' },
    { id: 'revenue', name: 'Revenue Reports', icon: CurrencyDollarIcon, color: 'green' },
    { id: 'company', name: 'Company Reports', icon: BuildingOfficeIcon, color: 'purple' },
    { id: 'staff', name: 'Staff Reports', icon: UserGroupIcon, color: 'orange' },
    { id: 'forum', name: 'Forum Reports', icon: DocumentTextIcon, color: 'teal' }
  ];

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  // Mock download functionality: hiển thị alert thông báo download started
  const handleDownloadReport = (reportId) => {
    alert('Report download started!');
  };

  // Mock report generation: hiển thị alert thông báo generation started
  const handleGenerateReport = (reportId) => {
    alert('Report generation started! You will be notified when it\'s ready.');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'generating':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    const reportType = reportTypes.find(rt => rt.id === type);
    if (reportType) {
      const Icon = reportType.icon;
      return <Icon className="h-5 w-5" />;
    }
    return <DocumentTextIcon className="h-5 w-5" />;
  };

  const getTypeColor = (type) => {
    const reportType = reportTypes.find(rt => rt.id === type);
    return reportType ? reportType.color : 'gray';
  };

  // Pagination
  const paginatedReports = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return reports.slice(startIndex, endIndex);
  }, [reports, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(reports.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Management</h1>
          <p className="mt-1 text-sm text-gray-500">Generate and manage system reports</p>
        </div>
        <button className="bg-[#4c9dff] hover:bg-[#3f85d6] text-white px-4 py-2 rounded-md text-sm font-medium flex items-center shadow-[0_12px_30px_rgba(76,157,255,0.35)] transition-all duration-200">
          <ChartBarIcon className="h-4 w-4 mr-2" />
          Generate New Report
        </button>
      </div>

      {/* Report type filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Report Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div key={type.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <div className={`flex-shrink-0 w-8 h-8 bg-${type.color}-100 rounded-lg flex items-center justify-center`}>
                  <Icon className={`h-5 w-5 text-${type.color}-600`} />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{type.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-8 w-8 text-[#4c9dff]" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Total Reports</p>
              <p className="text-2xl font-semibold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.filter(report => report.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Generating</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.filter(report => report.status === 'generating').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ArrowDownTrayIcon className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">Total Downloads</p>
              <p className="text-2xl font-semibold text-gray-900">
                {reports.reduce((sum, report) => sum + report.downloads, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reports table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Reports</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReports.map((report) => (
                  <tr key={report.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-lg bg-${getTypeColor(report.type)}-100 flex items-center justify-center`}>
                            {getTypeIcon(report.type)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{report.title}</div>
                          <div className="text-sm text-gray-500">{report.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getTypeColor(report.type)}-100 text-${getTypeColor(report.type)}-800`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {report.downloads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Tooltip text={t('admin.reportManagement.actions.viewDetails')} position="top">
                        <button
                          onClick={() => handleViewReport(report)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      {report.status === 'completed' ? (
                        <Tooltip text={t('admin.reportManagement.actions.download')} position="top">
                          <button
                            onClick={() => handleDownloadReport(report.id)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      ) : (
                        <Tooltip text={t('admin.reportManagement.actions.generate')} position="top">
                          <button
                            onClick={() => handleGenerateReport(report.id)}
                            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition"
                          >
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pagination */}
        {reports.length >= 10 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={reports.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Report Details Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex items-center mb-4">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-lg bg-${getTypeColor(selectedReport.type)}-100 flex items-center justify-center`}>
                        {getTypeIcon(selectedReport.type)}
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          {selectedReport.title}
                        </h3>
                        <p className="text-sm text-gray-500">{selectedReport.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Period</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedReport.period}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Status</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                            {selectedReport.status}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Type</label>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getTypeColor(selectedReport.type)}-100 text-${getTypeColor(selectedReport.type)}-800`}>
                            {selectedReport.type}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Downloads</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedReport.downloads}</p>
                        </div>
                      </div>
                      
                      {selectedReport.generatedAt && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Generated At</label>
                          <p className="mt-1 text-sm text-gray-900">
                            {new Date(selectedReport.generatedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      {selectedReport.fileSize && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">File Size</label>
                          <p className="mt-1 text-sm text-gray-900">{selectedReport.fileSize}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {selectedReport.status === 'completed' ? (
                  <button
                    onClick={() => handleDownloadReport(selectedReport.id)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Download Report
                  </button>
                ) : (
                  <button
                    onClick={() => handleGenerateReport(selectedReport.id)}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-[0_12px_30px_rgba(76,157,255,0.35)] px-4 py-2 bg-[#4c9dff] text-base font-medium text-white hover:bg-[#3f85d6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] transition-all duration-200 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    Generate Report
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4c9dff] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
