import type { ComponentType } from 'react';
import {
  Banknote,
  Camera,
  Image,
  BarChart3,
  Calendar,
  ClipboardList,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Package,
  School,
  Settings,
  Shirt,
  Tags,
  Users,
  Wrench,
} from 'lucide-react';
import type { UserRole } from '../types';
import DashboardPage from '../pages/DashboardPage';
import PhotographerPortfolioPage from '../pages/PhotographerPortfolioPage';
import CustomersPage from '../pages/CustomersPage';
import CustomerDetailPage from '../pages/CustomerDetailPage';
import SchedulesPage from '../pages/SchedulesPage';
import FinancePage from '../pages/FinancePage';
import CategoriesPage from '../pages/CategoriesPage';
import CostumesPage from '../pages/CostumesPage';
import CostumeTypesPage from '../pages/CostumeTypesPage';
import UsersPage, { LegacyUsersRedirect } from '../pages/UsersPage';
import CustomerSizePage from '../pages/CustomerSizePage';
import PackagesPage from '../pages/PackagesPage';
import FeedbackPage from '../pages/FeedbackPage';
import BookingWorkflowListPage from '../pages/BookingWorkflowListPage';
import { clientPortalEnabled } from './features';
import ConceptOrdersPage from '../pages/ConceptOrdersPage';
import ConceptManagePage from '../pages/ConceptManagePage';
import RentalListPage from '../pages/RentalListPage';
import ReportsPage from '../pages/ReportsPage';
import SePayReceiptsPage from '../pages/SePayReceiptsPage';
import PhotographersManagePage from '../pages/PhotographersManagePage';

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
  {
    to: '/concept-orders',
    hidden: true,
    label: 'Chụp concept',
    icon: ClipboardList,
    allowedRoles: [0, 1, 3] as UserRole[],
    component: ConceptOrdersPage,
  },
  {
    to: '/settings/concepts',
    label: 'Quản lý concept',
    icon: Layers,
    allowedRoles: [0, 1] as UserRole[],
    component: ConceptManagePage,
  },
  ...(clientPortalEnabled
    ? [
        {
          to: '/rental-orders',
          label: 'Đơn thuê',
          icon: Shirt,
          allowedRoles: [0, 1] as UserRole[],
          component: RentalListPage,
        },
      ]
    : []),
  ...(clientPortalEnabled
    ? [
        {
          to: '/workflow-bookings',
          label: 'Đơn chụp ảnh',
          icon: ClipboardList,
          allowedRoles: [0, 1, 3] as UserRole[],
          component: BookingWorkflowListPage,
        },
      ]
    : []),
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    iconClassName: 'text-blue-400',
    allowedRoles: [0, 1, 3],
    component: DashboardPage,
    index: true,
  },
  {
    to: '/customers',
    label: 'Khách hàng',
    icon: School,
    iconClassName: 'text-cyan-300',
    allowedRoles: [0, 1],
    children: [
      {
        to: '',
        label: 'Danh sách lớp học',
        icon: ClipboardList,
        iconClassName: 'text-slate-300',
        allowedRoles: [0, 1],
        component: CustomersPage,
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
        to: '/size',
        label: 'Danh sách lớp học',
        hidden: true,
        allowedRoles: [0, 1],
        component: CustomerSizePage,
      },
      {
        to: '/:id',
        label: 'Chi tiết lớp học',
        allowedRoles: [0, 1],
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
  {
    to: '/staff/photographers',
    label: 'Quản lý thợ',
    icon: Camera,
    iconClassName: 'text-amber-300',
    allowedRoles: [0, 1],
    component: PhotographersManagePage,
  },
  {
    to: '/settings/costumes',
    label: 'Quản lý trang phục',
    icon: Shirt,
    iconClassName: 'text-fuchsia-300',
    allowedRoles: [0, 1],
    children: [
      {
        to: '',
        label: 'Kho trang phục',
        icon: Shirt,
        component: CostumesPage,
      },
      {
        to: '/types',
        label: 'Loại trang phục',
        icon: Layers,
        component: CostumeTypesPage,
      },
    ],
  },
  {
    to: '/my-portfolio',
    label: 'Portfolio của tôi',
    icon: Image,
    allowedRoles: [3] as UserRole[],
    component: PhotographerPortfolioPage,
  },
];

export const adminItems: NavItem[] = [
  {
    to: '/manage',
    label: 'Quản lý',
    icon: Wrench,
    iconClassName: 'text-amber-300',
    allowedRoles: [0, 1],
    children: [
      {
        to: '/finance',
        label: 'Tài chính',
        icon: Banknote,
        iconClassName: 'text-green-300',
        allowedRoles: [0, 1],
        component: FinancePage,
      },
      {
        to: '/payment-receipts',
        label: 'Đối soát tiền cọc',
        icon: Banknote,
        allowedRoles: [0, 1],
        component: SePayReceiptsPage,
      },
      {
        to: '/reports',
        label: 'Báo cáo dịch vụ và kho',
        icon: BarChart3,
        allowedRoles: [0, 1],
        component: ReportsPage,
      },
      {
        to: '/users',
        label: 'Người dùng',
        hidden: true,
        allowedRoles: [0, 1],
        component: LegacyUsersRedirect,
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
        to: '/packages',
        label: 'Gói chụp',
        icon: Package,
        iconClassName: 'text-orange-300',
        allowedRoles: [0, 1],
        component: PackagesPage,
      },
    ],
  },
];
