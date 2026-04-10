import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../store/notificationStore';

const useNotificationSound = () => {
  const { soundEnabled } = useNotificationStore();
  const audioRef = useRef(null);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playSound = () => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      // Reset audio to beginning if it was already playing
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.warn('Failed to play notification sound:', error);
      });
    } catch (error) {
      console.warn('Error playing notification sound:', error);
    }
  };

  const playBookingSound = () => {
    if (!soundEnabled || !audioRef.current) return;

    try {
      // Play booking-specific sound
      const bookingAudio = new Audio('/sounds/booking.mp3');
      bookingAudio.volume = 0.5;
      bookingAudio.currentTime = 0;
      bookingAudio.play().catch((error) => {
        console.warn('Failed to play booking sound:', error);
      });
    } catch (error) {
      console.warn('Error playing booking sound:', error);
    }
  };

  return { playSound, playBookingSound };
};

export default useNotificationSound;
