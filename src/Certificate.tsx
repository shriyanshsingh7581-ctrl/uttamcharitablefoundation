import React, { useRef } from 'react';
import CertificatePage from './pages/CertificatePage';

export const Certificate = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return <CertificatePage />;
};

export default CertificatePage;
