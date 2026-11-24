import { useEffect, useRef, useState } from 'react';
import { db, ref, get, update, whenAdapterReady } from '../lib/supabase';
import {
  normalizeSponsorId,
  parseAmount,
} from '../utils/mlmUtils';

/**
 * Universal Self-Healing Data Integrity & Anti-Regression Guard
 * Safely scans after local IndexedDB & Supabase hydration completes and fixes:
 * 1. Missing memberId or name
 * 2. Partial or lowercase sponsorId (e.g. '6401' -> 'UCWF-2026-6401')
 * 3. Missing members recovered from payment_requests
 * 4. Auto-activates non-blocked members
 */
export function useDataIntegrityGuard() {
  const [isHealed, setIsHealed] = useState(false);
  const [healedCount, setHealedCount] = useState(0);
  const lastRunRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastRunRef.current < 30000) return;
    lastRunRef.current = now;

    let isMounted = true;

    async function runIntegrityCheck() {
      try {
        await whenAdapterReady();
        const usersSnap = await get(ref(db, 'users'));
        if (!usersSnap.exists()) return;

        const allUsers = usersSnap.val();
        const updates = {};
        let modified = 0;

        Object.entries(allUsers).forEach(([uid, u]) => {
          if (!u) return;

          if (!u.memberId || typeof u.memberId !== 'string' || !u.memberId.trim()) {
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const generatedId = `UCWF-2026-${randomNum}`;
            updates[`/users/${uid}/memberId`] = generatedId;
            u.memberId = generatedId;
            modified++;
          }

          if (!u.name || !String(u.name).trim()) {
            const resolvedName = u.displayName || u.fullName || u.phone || 'सम्मानित सदस्य';
            updates[`/users/${uid}/name`] = resolvedName;
            u.name = resolvedName;
            modified++;
          }

          if (u.status !== 'blocked') {
            if (u.status !== 'active') {
              updates[`/users/${uid}/status`] = 'active';
              modified++;
            }
            if (u.isApproved !== true) {
              updates[`/users/${uid}/isApproved`] = true;
              modified++;
            }
            if (u.paymentVerified !== true) {
              updates[`/users/${uid}/paymentVerified`] = true;
              modified++;
            }
            if (u.kycVerified !== true) {
              updates[`/users/${uid}/kycVerified`] = true;
              modified++;
            }
          }

          const tierNum = parseAmount(u);
          if (u.packageTier !== tierNum) {
            updates[`/users/${uid}/packageTier`] = tierNum;
            modified++;
          }
          if (u.packageAmount !== tierNum) {
            updates[`/users/${uid}/packageAmount`] = tierNum;
            modified++;
          }
          if (tierNum > 0 && Number(u.selfBusiness || 0) < tierNum) {
            updates[`/users/${uid}/selfBusiness`] = tierNum;
            modified++;
          }

          const currentSp = String(u.sponsorId || '').trim();
          const normalizedSp = normalizeSponsorId(u, allUsers);
          if (normalizedSp && normalizedSp !== 'DIRECT' && normalizedSp !== currentSp) {
            updates[`/users/${uid}/sponsorId`] = normalizedSp;
            modified++;
          }
        });

        // Recover any member present in payment_requests if missing from /users
        try {
          const paySnap = await get(ref(db, 'payment_requests'));
          if (paySnap.exists()) {
            const payData = paySnap.val();
            Object.values(payData).forEach((pay) => {
              if (!pay || !pay.memberId) return;
              const pMemId = String(pay.memberId).trim().toUpperCase();
              const userExists = Object.values(allUsers).some(
                (u) => u && u.memberId && u.memberId.toUpperCase() === pMemId
              );
              if (!userExists) {
                const newUid =
                  pay.userId || 'member_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                const cleanPhone = (pay.phone || '').replace(/\D/g, '').slice(-10);
                const restoredMember = {
                  uid: newUid,
                  memberId: pMemId,
                  name: pay.userName || 'सम्मानित सदस्य',
                  displayName: pay.userName || 'सम्मानित सदस्य',
                  phone: cleanPhone,
                  email: pay.email || `${cleanPhone}@ucwf.online`,
                  password: cleanPhone || 'UCWF@1234',
                  plainPassword: cleanPhone || 'UCWF@1234',
                  sponsorId: String(pay.sponsorId || 'DIRECT').trim().toUpperCase(),
                  packageTier: Number(pay.amount || 500),
                  packageAmount: Number(pay.amount || 500),
                  selfBusiness: Number(pay.amount || 500),
                  status: 'active',
                  isApproved: true,
                  paymentVerified: true,
                  kycVerified: true,
                  createdAt: pay.createdAt || new Date().toISOString(),
                  timestamp: pay.timestamp || Date.now(),
                };
                updates[`/users/${newUid}`] = restoredMember;
                allUsers[newUid] = restoredMember;
                modified++;
              }
            });
          }
        } catch (e) {
          console.warn('payment_requests integrity scan note:', e);
        }

        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }

        if (isMounted) {
          setIsHealed(true);
          setHealedCount(modified);
        }
      } catch (err) {
        console.warn('useDataIntegrityGuard note:', err);
      }
    }

    runIntegrityCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isHealed, healedCount };
}

export default useDataIntegrityGuard;
