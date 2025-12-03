import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/solid';
import { FlagIcon, BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/outline';

const AssignTaskModal = ({ isOpen, onClose, staff, onConfirm }) => {
  const { t } = useTranslation();
  const [selectedTask, setSelectedTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task options matching backend StaffTask enum
  const taskOptions = [
    { 
      value: 'FORUM_REPORT_AND_BOOKING_COMPLAINT', 
      label: t('admin.assignTaskModal.tasks.forumReport.label'), 
      description: t('admin.assignTaskModal.tasks.forumReport.description'),
      icon: FlagIcon,
      color: 'bg-purple-50 border-purple-200 text-purple-700'
    },
    { 
      value: 'COMPANY_REQUEST_AND_RESOLVE_TICKET', 
      label: t('admin.assignTaskModal.tasks.companyRequest.label'), 
      description: t('admin.assignTaskModal.tasks.companyRequest.description'),
      icon: BuildingOfficeIcon,
      color: 'bg-blue-50 border-blue-200 text-blue-700'
    },
    { 
      value: 'APPROVE_TOUR_BOOKING_AND_APPROVE_ARTICLE', 
      label: t('admin.assignTaskModal.tasks.approveTour.label'), 
      description: t('admin.assignTaskModal.tasks.approveTour.description'),
      icon: MapPinIcon,
      color: 'bg-green-50 border-green-200 text-green-700'
    }
  ];

  // Initialize selectedTask with current staff task
  useEffect(() => {
    if (staff && staff.staffTask) {
      setSelectedTask(staff.staffTask);
    } else {
      setSelectedTask(null);
    }
  }, [staff]);

  if (!isOpen || !staff) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedTask);
      onClose();
    } catch (error) {
      // Silently handle error assigning task
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-[20px] bg-blue-100 flex items-center justify-center">
              <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('admin.assignTaskModal.title')}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{staff.username || staff.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-[20px] hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          <p className="text-sm text-gray-600 mb-4">
            {t('admin.assignTaskModal.description')}
          </p>

          {/* Task Options */}
          <div className="space-y-3">
            {/* Option: No task */}
            <label
              className={`flex items-start gap-3 p-4 rounded-[24px] border-2 cursor-pointer transition-all ${
                selectedTask === null
                  ? 'border-gray-300 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="staffTask"
                value=""
                checked={selectedTask === null}
                onChange={() => setSelectedTask(null)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 block">
                  {t('admin.assignTaskModal.noTask')}
                </span>
                <span className="text-xs text-gray-500 mt-1 block">
                  {t('admin.assignTaskModal.noTaskDesc')}
                </span>
              </div>
            </label>

            {/* Task options */}
            {taskOptions.map((task) => {
              const Icon = task.icon;
              const isSelected = selectedTask === task.value;
              
              return (
                <label
                  key={task.value}
                  className={`flex items-start gap-3 p-4 rounded-[24px] border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="staffTask"
                    value={task.value}
                    checked={isSelected}
                    onChange={(e) => setSelectedTask(e.target.value)}
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`h-10 w-10 rounded-[16px] ${task.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 block">
                        {task.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {task.description}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-[20px] border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('admin.assignTaskModal.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-[20px] bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all shadow-[0_8px_20px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {isSubmitting ? t('admin.assignTaskModal.processing') : t('admin.assignTaskModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTaskModal;
