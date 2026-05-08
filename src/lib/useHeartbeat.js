import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { recordHeartbeat } from './api';
import { useAuth } from '../context/AuthContext';

export function useHeartbeat() {
  const { user } = useAuth();
  const lastBeatRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    const beat = () => {
      // Throttle: don't beat more than once per 60 seconds
      const now = Date.now();
      if (now - lastBeatRef.current < 60000) return;
      lastBeatRef.current = now;

      recordHeartbeat(user.id)
        .then(r => {
          if (r.counted) console.log(`🔥 Streak now ${r.current_streak} days`);
          if (r.newBadges?.length) console.log('🎉 New streak badges!', r.newBadges);
        })
        .catch(err => console.warn('Heartbeat failed:', err.message));
    };

    beat(); // fire on mount

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') beat();
    });

    return () => sub.remove();
  }, [user]);
}