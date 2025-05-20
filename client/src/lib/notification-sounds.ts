/**
 * Utility for playing notification sounds based on priority
 */

// Audio file references for different priority levels
const SOUND_FILES = {
  urgent: '/sounds/notification-urgent.mp3',
  high: '/sounds/notification-high.mp3',
  normal: '/sounds/notification-normal.mp3'
};

// Singleton audio objects to prevent multiple sounds playing at once
let urgentAudio: HTMLAudioElement | null = null;
let highAudio: HTMLAudioElement | null = null;
let normalAudio: HTMLAudioElement | null = null;

// User preference for notification sounds (loaded from localStorage)
let soundsEnabled = localStorage.getItem('notification_sounds_enabled') !== 'false';

/**
 * Initialize audio objects
 */
export function initNotificationSounds() {
  if (typeof window === 'undefined') return;
  
  // Only create audio elements if they don't exist
  if (!urgentAudio) {
    urgentAudio = new Audio(SOUND_FILES.urgent);
    urgentAudio.preload = 'auto';
    urgentAudio.volume = 0.7;
  }
  
  if (!highAudio) {
    highAudio = new Audio(SOUND_FILES.high);
    highAudio.preload = 'auto';
    highAudio.volume = 0.5;
  }
  
  if (!normalAudio) {
    normalAudio = new Audio(SOUND_FILES.normal);
    normalAudio.preload = 'auto';
    normalAudio.volume = 0.3;
  }
}

/**
 * Play a notification sound based on priority
 * @param priority The priority level of the notification
 */
export function playNotificationSound(priority: string) {
  if (!soundsEnabled) return;
  
  // Ensure audio objects are initialized
  initNotificationSounds();
  
  // Play appropriate sound based on priority
  switch (priority) {
    case 'urgent':
      urgentAudio?.play().catch(err => console.error('Failed to play sound:', err));
      break;
    case 'high':
      highAudio?.play().catch(err => console.error('Failed to play sound:', err));
      break;
    case 'normal':
      normalAudio?.play().catch(err => console.error('Failed to play sound:', err));
      break;
    default:
      // No sound for low priority
      break;
  }
}

/**
 * Enable or disable notification sounds
 * @param enabled Whether sounds should be enabled
 */
export function setNotificationSoundsEnabled(enabled: boolean) {
  soundsEnabled = enabled;
  localStorage.setItem('notification_sounds_enabled', enabled ? 'true' : 'false');
}

/**
 * Check if notification sounds are enabled
 * @returns Whether notification sounds are enabled
 */
export function areNotificationSoundsEnabled(): boolean {
  return soundsEnabled;
}