import React, { useRef } from 'react';
import App from './App.jsx';

export const AppTSX = () => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return <App />;
};

export default App;
