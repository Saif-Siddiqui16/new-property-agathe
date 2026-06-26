import React, { useState, useEffect } from "react";
import { NavLink, useLocation, Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings as SettingsIcon,
  PieChart,
  CreditCard,
  Calculator,
  ChevronDown,
  ChevronRight,
  X,
  Wrench,
  ShieldAlert,
  MessageSquare,
  ClipboardList,
  Landmark,
  Mail,
  User,
  Car,
  Hammer,
  Clock,
  Home
} from "lucide-react";
import clsx from "clsx";

/* =========================
   MENU CONFIG (FIXED)
 ========================= */

const NAV_ITEMS = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    tKey: "sidebar.dashboard",
    path: "/dashboard",
    children: [
      { label: "Overview", tKey: "sidebar.overview", path: "/dashboard" },
      { label: "Vacancy Dashboard", tKey: "sidebar.vacancy", path: "/vacancy" },
      { label: "Revenue Dashboard", tKey: "sidebar.revenue", path: "/revenue" }
    ]
  },
  {
    icon: Building2,
    label: "Properties",
    tKey: "sidebar.properties",
    path: "/properties/buildings",
    children: [
      { label: "Buildings", tKey: "sidebar.buildings", path: "/properties/buildings" },
      { label: "Units", tKey: "sidebar.units", path: "/units" },
      { label: "Unit Readiness", path: "/unit-readiness" }
    ]
  },
  {
    icon: Users,
    label: "Tenants",
    tKey: "sidebar.tenants",
    path: "/tenants",
    children: [
      { label: "Tenant List", tKey: "sidebar.tenant_list", path: "/tenants" },
      { label: "Vehicle Management", tKey: "sidebar.vehicles", path: "/tenants/vehicles" },
      // { label: "Owners", path: "/owners" },
      { label: "Insurance Alerts", tKey: "sidebar.insurance", path: "/insurance-alerts" }
    ]
  },
  {
    icon: Car,
    label: "Shuttle Management",
    tKey: "sidebar.shuttle",
    path: "/shuttle"
  },
    // {
    //   icon: Landmark,
    //   label: "Owners",
    //   tKey: "sidebar.owners",
    //   path: "/owners"
    // },
  {
    icon: FileText,
    label: "Leases",
    tKey: "sidebar.leases",
    path: "/leases"
  },
  {
    icon: FileText,
    label: "Rent Roll",
    tKey: "sidebar.rent_roll",
    path: "/rent-roll"
  },
  {
    icon: FileText,
    label: "Documents",
    tKey: "sidebar.documents",
    path: "/documents"
  },
  {
    icon: CreditCard,
    label: "Payments",
    tKey: "sidebar.payments",
    path: "/payments/invoices",
    children: [
      { label: "Rent Invoices", tKey: "sidebar.invoices", path: "/payments/invoices" },
      { label: "Payments Received", tKey: "sidebar.received", path: "/payments/received" },
      { label: "Outstanding Dues", tKey: "sidebar.outstanding", path: "/payments/outstanding" },
      { label: "Refunds & Adjustments", tKey: "sidebar.refunds", path: "/payments/refunds" }
    ]
  },
  {
    icon: Calculator,
    label: "Accounting",
    tKey: "sidebar.accounting",
    path: "/accounting",
    children: [
      { label: "General Ledger", tKey: "sidebar.ledger", path: "/accounting" },
      { label: "QuickBooks Sync", tKey: "sidebar.quickbooks", path: "/settings/quickbooks" },
      { label: "Chart of Accounts", tKey: "sidebar.chart_of_accounts", path: "/accounting/chart-of-accounts" },
      { label: "Tax Settings", tKey: "sidebar.tax_settings", path: "/accounting/tax-settings" }
    ]
  },
  {
    icon: PieChart,
    label: "Reports",
    tKey: "sidebar.reports",
    path: "/reports"
  },
  {
    icon: MessageSquare,
    label: "SMS Hub",
    tKey: "sidebar.sms_hub",
    path: "/admin/sms/inbox",
    children: [
      { label: "Inbox", tKey: "sidebar.inbox", path: "/admin/sms/inbox" },
      { label: "Campaign Manager", tKey: "sidebar.campaigns", path: "/admin/sms/campaigns" },
      { label: "Templates", tKey: "sidebar.templates", path: "/admin/sms/templates" }
    ]
  },
  {
    icon: Mail,
    label: "Email Hub",
    tKey: "sidebar.email_hub",
    path: "/admin/email/composer",
    children: [
      { label: "Send Email", tKey: "sidebar.send_email", path: "/admin/email/composer" },
      { label: "Email Templates", tKey: "sidebar.email_templates", path: "/admin/email/templates" },
      { label: "Sent Emails", tKey: "sidebar.email_history", path: "/admin/email/history" }
    ]
  },
  {
    icon: ClipboardList,
    label: "Maintenance",
    tKey: "sidebar.maintenance",
    path: "/maintenance"
  },
  {
    icon: Wrench,
    label: "Tickets",
    tKey: "sidebar.tickets",
    path: "/tickets"
  },
  {
    icon: Users,
    label: "Team Access Control",
    tKey: "sidebar.team",
    path: "/team-management"
  },
  {
    icon: ClipboardList,
    label: "Inspections",
    tKey: "sidebar.inspections",
    path: "/admin/workflow/inspections",
    children: [
      { label: "Inspection List", tKey: "sidebar.inspection_list", path: "/admin/workflow/inspections" },
      { label: "Inspection Templates", tKey: "sidebar.templates", path: "/admin/workflow/templates" }
    ]
  },
  {
    icon: Hammer,
    label: "Unit Preparation",
    tKey: "sidebar.unit_prep",
    path: "/admin/workflow/unit-prep"
  },
  {
    icon: Clock,
    label: "Move-Out",
    tKey: "sidebar.move_out",
    path: "/admin/workflow/move-out"
  },
  {
    icon: Home,
    label: "Move-In",
    tKey: "sidebar.move_in",
    path: "/admin/workflow/move-in"
  },
  {
    icon: SettingsIcon,
    label: "Settings",
    tKey: "sidebar.settings",
    path: "/settings"
  },
  {
    icon: User,
    label: "Profile",
    tKey: "sidebar.profile",
    path: "/profile"
  }
];

/* =========================
   NAV ITEM
 ========================= */

const NavItem = ({ item, depth = 0, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const hasChildren = item.children?.length > 0;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (hasChildren) {
      const activeChild = item.children.some(child =>
        location.pathname.startsWith(child.path)
      );
      setIsOpen(activeChild);
    }
  }, [location.pathname]);

  const handleClick = (e) => {
    if (hasChildren) {
      e.preventDefault();
      setIsOpen(prev => !prev);
    } else {
      onClose?.();
    }
  };

  return (
    <>
      <NavLink
        to={item.path}
        end={item.path === '/tenants' || item.path === '/dashboard' || item.path === '/properties/buildings' || item.path === '/accounting'}
        onClick={handleClick}
        className={({ isActive }) =>
          clsx(
            "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group relative overflow-hidden",
            isActive && !hasChildren
              ? "bg-primary-600 text-white shadow-xl shadow-primary-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )
        }
        style={{ paddingLeft: `calc(16px + ${depth * 14}px)` }}
      >
        {item.icon && <item.icon size={20} />}
        <span className="flex-1">{t(item.tKey || item.label)}</span>
        {(item.label === 'SMS Hub' || item.label === 'Inbox') && (
          <UnreadSMSBadge />
        )}
        {hasChildren && (isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
      </NavLink>

      {hasChildren && isOpen && (
        <div className="ml-2">
          {item.children.map(child => (
            <NavItem
              key={child.path}
              item={child}
              depth={depth + 1}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </>
  );
};

/* =========================
   SIDEBAR
 ========================= */

export const Sidebar = ({ isOpen, onClose, permissionsReady = true }) => {
  /* SCROLL PRESERVATION */
  const navRef = React.useRef(null);

  // Permissions state at component level (fixes hooks-in-IIFE bug)
  const [forceUpdate, setForceUpdate] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setForceUpdate(prev => prev + 1);
    window.addEventListener('permissionsUpdated', handleUpdate);
    return () => window.removeEventListener('permissionsUpdated', handleUpdate);
  }, []);

  // Read from localStorage at component level so re-renders are stable
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const permissions = JSON.parse(localStorage.getItem('permissions') || '[]');

  useEffect(() => {
    // Restore scroll position on mount
    const savedScroll = sessionStorage.getItem('adminSidebarScroll');
    if (navRef.current && savedScroll) {
      navRef.current.scrollTop = Number(savedScroll);
    }

    // Save scroll position on scroll
    const handleScroll = () => {
      if (navRef.current) {
        sessionStorage.setItem('adminSidebarScroll', navRef.current.scrollTop);
      }
    };

    const navElement = navRef.current;
    if (navElement) {
      navElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (navElement) {
        navElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return (
    <>
      <div
        className={clsx(
          "fixed inset-0 bg-black/40 z-40 lg:hidden",
          isOpen ? "block" : "hidden"
        )}
        onClick={onClose}
      />

      <aside className={clsx(
        "fixed left-0 top-0 h-screen w-[280px] bg-white border-r border-slate-100 shadow-2xl shadow-slate-200/50 z-50 transition-transform duration-300 ease-in-out flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0"
      )}>
        <div className="p-8 pb-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-black text-xl italic shadow-lg shadow-primary-200">M</div>
            <div>
             <h1 className="text-xl font-black tracking-tighter text-slate-800 uppercase italic leading-none">
                Mas<span className="text-primary-600">teko</span>
              </h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Admin Portal</p>
            </div> */}
            <img src="/assets/logo.png" alt="Masteko Logo" className="h-10 w-auto object-container" />
          </div>
          <button className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav ref={navRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          <div className="px-4 mb-2 mt-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Main Menu</p>
          </div>

          {/* Show skeleton while permissions are being confirmed after a property switch */}
          {!permissionsReady ? (
            <div className="space-y-1 px-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="h-11 rounded-2xl bg-slate-100 animate-pulse"
                  style={{ animationDelay: `${i * 60}ms`, opacity: 0.6 + i * 0.05 }}
                />
              ))}
            </div>
          ) : (() => {
            // user, permissions, forceUpdate now come from component level (no hooks here)
            const _ = forceUpdate; // reference to trigger re-render when permissions change

            const labelToModule = {
              'Dashboard': 'Dashboard',
              'Overview': 'Overview',
              'Vacancy Dashboard': 'Vacancy Dashboard',
              'Revenue Dashboard': 'Revenue Dashboard',
              'Properties': 'Properties',
              'Buildings': 'Buildings',
              'Units': 'Units',
              'Unit Readiness': 'Unit Readiness', // Now using its own independent permission
              'Tenants': 'Tenants',
              'Tenant List': 'Tenant List',
              'Vehicle Management': 'Vehicles',
              'Insurance Alerts': 'Insurance',
              'Shuttle Management': 'Shuttle',
              'Owners': 'Owners',
              'Leases': 'Leases',
              'Rent Roll': 'Rent Roll',
              'Documents': 'Documents',
              'Payments': 'Payments',
              'Rent Invoices': 'Invoices',
              'Payments Received': 'Payments Received',
              'Outstanding Dues': 'Outstanding Dues',
              'Refunds & Adjustments': 'Refunds',
              'Accounting': 'Accounting',
              'General Ledger': 'General Ledger',
              'QuickBooks Sync': 'QuickBooks Sync',
              'Chart of Accounts': 'Chart of Accounts',
              'Tax Settings': 'Tax Settings',
              'Reports': 'Reports',
              'SMS Hub': 'Communication',
              'Inbox': 'Inbox',
              'Campaign Manager': 'Campaign Manager',
              'Templates': 'Templates',
              'Email Hub': 'Email Hub',
              'Send Email': 'Send Email',
              'Email Templates': 'Email Templates',
              'Sent Emails': 'Sent Emails',
              'Maintenance': 'Maintenance',
              'Tickets': 'Tickets',
              'Inspections': 'Inspections',
              'Inspection List': 'Inspection List',
              'Inspection Templates': 'Inspection Templates',
              'Unit Preparation': 'Unit Preparation',
              'Move-Out': 'Move-Out',
              'Move-In': 'Move-In',
              'Team Access Control': 'Settings',
              'Settings': 'Settings'
            };

            const canUserView = (navItem) => {
              const selectedProperty = localStorage.getItem('selectedProperty') || 'masteko';
              if (selectedProperty === 'stagathe' && navItem.label === 'Shuttle Management') {
                return false;
              }
              if (selectedProperty === 'stagathe' && navItem.label === 'Team Access Control') {
                return false;
              }

              if (user.role === 'ADMIN') return true;
              if (navItem.label === 'Profile') return true;

              // Hide admin-only accounting and configuration panels from coworkers entirely
              const adminOnlyLabels = ['QuickBooks Sync', 'Chart of Accounts', 'Tax Settings', 'Team Access Control', 'Settings'];
              if (adminOnlyLabels.includes(navItem.label)) return false;

              const moduleName = labelToModule[navItem.label];

              // If it has children, the parent is visible if at least one child is visible
              if (navItem.children?.length > 0) {
                return navItem.children.some(child => canUserView(child));
              }

              // If no mapping exists for a leaf node, show it by default
              if (!moduleName) return true;

              const perm = permissions.find(p => p.moduleName === moduleName);
              return perm ? perm.canView : false;
            };

            const getVisibleItems = (items) => {
              return items.reduce((acc, item) => {
                if (!canUserView(item)) return acc;
                
                const newItem = { ...item };
                if (newItem.children?.length > 0) {
                  newItem.children = getVisibleItems(newItem.children);
                }
                acc.push(newItem);
                return acc;
              }, []);
            };

            return getVisibleItems(NAV_ITEMS).map(item => (
              <NavItem key={item.label} item={item} onClose={onClose} />
            ));
          })()}

        </nav>


        <div className="p-6 border-t border-slate-50 shrink-0">
          <Link to="/profile" className="block no-underline">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 group cursor-pointer hover:border-primary-100 hover:bg-primary-50/30 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm">
                  {JSON.parse(localStorage.getItem('user') || '{}').profilePictureUrl ? (
                    <img src={JSON.parse(localStorage.getItem('user') || '{}').profilePictureUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    JSON.parse(localStorage.getItem('user') || '{}').firstName?.[0] || 'A'
                  )}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-black text-slate-800 truncate">{JSON.parse(localStorage.getItem('user') || '{}').firstName ? `${JSON.parse(localStorage.getItem('user') || '{}').firstName} ${JSON.parse(localStorage.getItem('user') || '{}').lastName || ''}` : 'Admin User'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{JSON.parse(localStorage.getItem('user') || '{}').title || (JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN' ? 'Super Admin' : 'Staff')}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
};

const UnreadSMSBadge = () => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await api.get('/api/communication/unread-stats');
                setCount(res.data.count || 0);
            } catch (e) { }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    if (count === 0) return null;

    return (
        <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[1.25rem] h-5 shadow-sm ml-auto mr-2">
            {count > 99 ? '99+' : count}
        </span>
    );
};

