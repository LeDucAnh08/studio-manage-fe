import type { ComponentType } from 'react';
import { createElement } from 'react';
import {
  Banknote,
  Calendar,
  ClipboardList,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Package,
  Ruler,
  School,
  Settings,
  Shirt,
  Tags,
  Users,
  Wrench,
} from 'lucide-react';
import type { UserRole } from '../types';
import DashboardPage from '../pages/DashboardPage';
import CustomersPage from '../pages/CustomersPage';
import CustomerDetailPage from '../pages/CustomerDetailPage';
import SchedulesPage from '../pages/SchedulesPage';
import FinancePage from '../pages/FinancePage';
import CategoriesPage from '../pages/CategoriesPage';
import CostumesPage from '../pages/CostumesPage';
import CostumeTypesPage from '../pages/CostumeTypesPage';
import UsersPage from '../pages/UsersPage';
import CustomerSizePage from '../pages/CustomerSizePage';
import PackagesPage from '../pages/PackagesPage';
import FeedbackPage from '../pages/FeedbackPage';
import SeasonPage from '@/pages/SeasonPage';
import BookingsPage from '../pages/BookingsPage';
import BookingWorkflowListPage from '../pages/BookingWorkflowListPage';
import { clientPortalEnabled } from './features';

const BookingRequests = () => createElement(BookingsPage, { admin: true });

export type NavIcon = ComponentType<{ className?: string }>;

export interface NavItem {
  to: string;
  label: string;
  icon?: NavIcon;
  iconClassName?: string;
  allowedRoles?: UserRole[];
  component?: ComponentType;
  index?: boolean;
  hidden?: boolean;
  children?: NavItem[];
}

export const navItems: NavItem[] = [
  ...(clientPortalEnabled
    ? [
        {
          to: '/booking-requests',
          label: 'Yêu cầu đặt dịch vụ',
          icon: Calendar,
          allowedRoles: [0, 1] as UserRole[],
          component: BookingRequests,
        },
      ]
    : []),
  ...(clientPortalEnabled
    ? [{
        to: '/workflow-bookings',
        label: 'Quy trình dịch vụ',
        icon: ClipboardList,
        allowedRoles: [0, 1, 3, 5] as UserRole[],
        component: BookingWorkflowListPage,
      }]
    : []),
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    iconClassName: 'text-blue-400',
    allowedRoles: [0, 1, 2, 3, 4],
    component: DashboardPage,
    index: true,
  },
  {
    to: '/customers',
    label: 'Khách hàng',
    icon: School,
    iconClassName: 'text-cyan-300',
    allowedRoles: [0, 1, 2, 4],
    children: [
      {
        to: '',
        label: 'Danh sách lớp học',
        icon: ClipboardList,
        iconClassName: 'text-slate-300',
        allowedRoles: [0, 1, 2, 4],
        component: CustomersPage,
      },
      {
        to: '/size',
        label: 'Thông tin học sinh',
        icon: Ruler,
        iconClassName: 'text-emerald-300',
        allowedRoles: [0, 1, 2, 4],
        component: CustomerSizePage,
      },
      {
        to: '/:id',
        label: 'Chi tiết khách hàng',
        allowedRoles: [0, 1, 2, 4],
        component: CustomerDetailPage,
        hidden: true,
      },
    ],
  },
  {
    to: '/schedules',
    label: 'Lịch chụp',
    icon: Calendar,
    iconClassName: 'text-indigo-300',
    component: SchedulesPage,
  },
];

export const adminItems: NavItem[] = [
  {
    to: '/manage',
    label: 'Quản lý',
    icon: Wrench,
    iconClassName: 'text-amber-300',
    allowedRoles: [0, 1, 5],
    children: [
      {
        to: '/finance',
        label: 'Tài chính',
        icon: Banknote,
        iconClassName: 'text-green-300',
        allowedRoles: [0, 1, 5],
        component: FinancePage,
      },
      {
        to: '/users',
        label: 'Người dùng',
        icon: Users,
        iconClassName: 'text-blue-300',
        allowedRoles: [0, 1],
        component: UsersPage,
      },
      {
        to: '/feedback',
        label: 'Phản hồi',
        icon: MessageSquare,
        iconClassName: 'text-pink-300',
        allowedRoles: [0, 1],
        component: FeedbackPage,
      },
    ],
  },
  {
    to: '/settings',
    label: 'Cài đặt',
    icon: Settings,
    iconClassName: 'text-slate-300',
    allowedRoles: [0, 1],
    children: [
      {
        to: '/categories',
        label: 'Danh mục thu/chi',
        icon: Tags,
        iconClassName: 'text-violet-300',
        allowedRoles: [0, 1],
        component: CategoriesPage,
      },
      {
        to: '/costumes',
        label: 'Trang phục',
        icon: Shirt,
        iconClassName: 'text-fuchsia-300',
        allowedRoles: [0, 1],
        component: CostumesPage,
      },
      {
        to: '/costume-types',
        label: 'Loại trang phục',
        icon: Layers,
        iconClassName: 'text-violet-200',
        allowedRoles: [0, 1],
        component: CostumeTypesPage,
      },
      {
        to: '/packages',
        label: 'Gói chụp',
        icon: Package,
        iconClassName: 'text-orange-300',
        allowedRoles: [0, 1, 2, 4],
        component: PackagesPage,
      },
    ],
  },
  {
    to: '/special',
    label: 'Đặc biệt',
    icon: ClipboardList,
    iconClassName: 'text-slate-300',
    allowedRoles: [0],
    children: [
      {
        to: '/seasons',
        label: 'Mùa chụp',
        icon: Calendar,
        iconClassName: 'text-indigo-300',
        allowedRoles: [0],
        component: SeasonPage, // TODO: create season management page
      },
    ],
  },
];
