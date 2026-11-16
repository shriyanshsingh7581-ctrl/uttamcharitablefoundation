import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Wallet,
  IndianRupee,
  CreditCard,
  LayoutDashboard,
  User,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import SafeIcon from '../ui/SafeIcon';

export const MobileNav = () => {
  const { user, member } = useAuth();
  const { isHindi } = useLanguage();
  const location = useLocation();
  const isAuth = !!(user || member);

  // Exact 5 Tabs from user specification: (Home, Wallet, Payout, I-Card, Dashboard / Menu)
  const navTabs = [
    {
      id: 'home',
      label: isHindi ? 'मुख्य' : 'Home',
      to: '/',
      icon: Home,
      isActive: (pathname) => pathname === '/',
    },
    {
      id: 'wallet',
      label: isHindi ? 'वॉलेट' : 'Wallet',
      to: isAuth ? '/wallet' : '/login',
      icon: Wallet,
      isActive: (pathname) => pathname === '/wallet',
    },
    {
      id: 'payout',
      label: isHindi ? 'पेआउट' : 'Payout',
      to: isAuth ? '/dashboard?tab=payout' : '/login',
      icon: IndianRupee,
      isActive: (pathname, search) => pathname === '/dashboard' && search.includes('tab=payout'),
    },
    {
      id: 'idcard',
      label: isHindi ? 'आई-कार्ड' : 'I-Card',
      to: isAuth ? '/id-card' : '/login',
      icon: CreditCard,
      isActive: (pathname) => pathname === '/id-card' || pathname === '/certificates',
    },
    {
      id: 'dashboard',
      label: isAuth
        ? (isHindi ? 'डैशबोर्ड' : 'Dashboard')
        : (isHindi ? 'लॉगिन' : 'Login'),
      to: isAuth ? '/dashboard' : '/login',
      icon: isAuth ? LayoutDashboard : User,
      isActive: (pathname, search) =>
        (pathname === '/dashboard' && !search.includes('tab=payout')) ||
        pathname === '/login' ||
        pathname === '/admin',
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom App Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] flex justify-around items-center px-1 select-none"
    >
      <div className="w-full max-w-lg mx-auto grid grid-cols-5 h-full items-center">
        {navTabs.map((tab) => {
          const active = tab.isActive(location.pathname, location.search);

          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className="relative flex flex-col items-center justify-center h-full py-1 text-center group cursor-pointer focus:outline-none"
            >
              <div className="flex flex-col items-center justify-center w-full">
                {/* Active Tab Top Highlight Bar */}
                {active && (
                  <motion.div
                    layoutId="mobileActiveTopBar"
                    className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-emerald-600 to-amber-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Tab Icon */}
                <div
                  className={`relative flex items-center justify-center p-1 rounded-xl transition-all duration-200 ${
                    active
                      ? 'text-emerald-700 scale-110 drop-shadow-xs'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  <SafeIcon
                    icon={tab.icon}
                    fallback={Home}
                    className={`w-5 h-5 transition-transform duration-200 ${
                      active ? 'stroke-[2.4px]' : 'stroke-[1.8px]'
                    }`}
                  />
                </div>

                {/* Tab Label */}
                <span
                  className={`text-[10px] tracking-tight leading-none mt-1 font-semibold transition-colors duration-200 truncate max-w-[68px] ${
                    active ? 'text-emerald-800 font-bold' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </span>

                {/* Active Dot Indicator */}
                {active && (
                  <motion.span
                    layoutId="mobileActiveDot"
                    className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-xs mt-0.5"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNav;
