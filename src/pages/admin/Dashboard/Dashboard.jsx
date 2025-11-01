import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  CheckCircleIcon, 
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  // Mock data for earnings overview chart
  const earningsData = {
    labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'],
    datasets: [
      {
        label: 'Earnings',
        data: [12000, 19000, 30000, 25000, 35000, 40000],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const earningsOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    },
  };

  // Mock data for revenue sources chart
  const revenueData = {
    labels: ['Direct', 'Social', 'Referral'],
    datasets: [
      {
        data: [30, 50, 20],
        backgroundColor: ['#3b82f6', '#10b981', '#06b6d4'],
        borderWidth: 0,
      },
    ],
  };

  const revenueOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
    },
    cutout: '60%',
  };

  const stats = [
    {
      name: 'Earnings (Monthly)',
      value: '$40,000',
      change: '+12%',
      changeType: 'positive',
      icon: CalendarIcon,
      color: 'blue',
    },
    {
      name: 'Earnings (Annual)',
      value: '$215,000',
      change: '+8%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      color: 'green',
    },
    {
      name: 'Tasks',
      value: '50%',
      change: '-2%',
      changeType: 'negative',
      icon: CheckCircleIcon,
      color: 'teal',
    },
    {
      name: 'Pending Requests',
      value: '18',
      change: '+3%',
      changeType: 'positive',
      icon: ChatBubbleLeftRightIcon,
      color: 'orange',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'border-l-blue-500',
            green: 'border-l-green-500',
            teal: 'border-l-teal-500',
            orange: 'border-l-orange-500',
          };
          
          return (
            <div key={stat.name} className={`bg-white rounded-lg shadow border-l-4 ${colorClasses[stat.color]}`}>
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.changeType === 'positive' ? (
                            <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                          ) : (
                            <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                          )}
                          <span className="sr-only">
                            {stat.changeType === 'positive' ? 'Increased' : 'Decreased'} by
                          </span>
                          {stat.change}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Earnings Overview</h3>
          <div className="h-64">
            <Line data={earningsData} options={earningsOptions} />
          </div>
        </div>

        {/* Revenue Sources */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Sources</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="w-48 h-48">
              <Doughnut data={revenueData} options={revenueOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Projects</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-900">Server Migration</span>
                <span className="text-sm text-gray-500">20%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Illustrations */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Illustrations</h3>
          <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <ChartBarIcon className="h-8 w-8 text-gray-500" />
              </div>
              <p className="text-sm text-gray-500">Chart illustration</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
