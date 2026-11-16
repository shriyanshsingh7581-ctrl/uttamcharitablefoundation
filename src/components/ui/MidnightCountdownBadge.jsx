import React, { useState, useEffect } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import { getTimeUntilMidnightIST, runDailyClosing } from '../../utils/closingEngine';
import { useLanguage } from '../../contexts/LanguageContext';

export default function MidnightCountdownBadge({ className = '', onMidnightTrigger = null }) {
  const { isHindi } = useLanguage();
  const [countdown, setCountdown] = useState(getTimeUntilMidnightIST());

  useEffect(() => {
    const timer = setInterval(() => {
      const nextTime = getTimeUntilMidnightIST();
      setCountdown(nextTime);

      // If exactly 00:00:00 (diffMs <= 1000), trigger automated midnight closing
      if (nextTime.diffMs <= 1000) {
        runDailyClosing().then(() => {
          if (onMidnightTrigger) onMidnightTrigger();
        }).catch(err => console.warn('Auto midnight run:', err));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onMidnightTrigger]);

  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-teal-950/60 border border-emerald-500/40 text-emerald-200 text-xs shadow-lg backdrop-blur-md ${className}`}>
      <div className="relative flex items-center justify-center">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
        <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
      </div>
      <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span className="font-medium">
        {isHindi ? 'अगली दैनिक क्लोजिंग मध्यरात्रि 12:00 बजे' : 'Next Daily Closing at 12:00 AM'}
      </span>
      <span className="text-slate-400 font-bold">|</span>
      <span className="font-mono font-extrabold text-emerald-300 tracking-wider">
        {isHindi ? `शेष समय: ${countdown.formatted}` : `Time Left: ${countdown.formatted}`}
      </span>
    </div>
  );
}
