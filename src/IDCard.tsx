import React, { useRef } from 'react';
import IDCardPage from './pages/IDCardPage';

export const IDCard = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return <IDCardPage />;
};

export default IDCardPage;
