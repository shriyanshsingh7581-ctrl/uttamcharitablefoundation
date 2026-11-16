import React, { useRef } from 'react';
import Dashboard from './pages/Dashboard';

export const MemberDashboard = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return <Dashboard />;
};

export default Dashboard;
