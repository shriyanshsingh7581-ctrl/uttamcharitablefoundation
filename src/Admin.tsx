import React, { useRef } from 'react';
import AdminPanel from './pages/AdminPanel';

export const Admin = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return <AdminPanel />;
};

export default AdminPanel;
