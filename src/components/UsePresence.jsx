import { useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { db } from '../lib/firebase';

const UsePresence = () => {
  const user = useSelector((state) => state.user.user);

  const markUserOnline = async () => {
    if (user?.uid) {
      await updateDoc(doc(db, 'users', user.uid), {
        online: true,
        lastSeen: serverTimestamp(),
      });
    }
  };

  const markUserOffline = async () => {
    if (user?.uid) {
      await updateDoc(doc(db, 'users', user.uid), {
        online: false,
        lastSeen: serverTimestamp(),
      });
    }
  };

  useEffect(() => {
    if (!user?.uid) return;

    // On tab focus/blur
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markUserOnline();
      } else {
        markUserOffline();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', markUserOffline); // just in case

    // Mark online on load
    markUserOnline();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', markUserOffline);
      markUserOffline(); // also cleanup
    };
  }, [user?.uid]);
};

export default UsePresence;
