export interface ChatAutoReplyConfig {
  enabled: boolean;
  message: string;
  targetMode: 'all' | 'selected';
  selectedUserIds: string[];
  cooldownMinutes: number;
  updatedAt?: any;
  updatedBy?: string;
}

export const QUICK_REPLY_PRESETS = [
  {
    id: 'short_wait',
    label: 'Short Wait',
    text: 'Thank you for contacting GoldBrick Support. Your message has been received and will be replied to shortly.',
  },
  {
    id: 'high_volume',
    label: 'High Volume',
    text: "Thank you for reaching out. Your message has been received, and we're currently experiencing a high volume of messages. A specialist will reply to you shortly.",
  },
  {
    id: 'priority_desk',
    label: 'Priority Desk',
    text: 'Your message has been received by our priority support desk. Please stay connected—an advisor is reviewing your account details now.',
  },
];

export const DEFAULT_CHAT_AUTO_REPLY: ChatAutoReplyConfig = {
  enabled: false,
  message: QUICK_REPLY_PRESETS[0].text,
  targetMode: 'all',
  selectedUserIds: [],
  cooldownMinutes: 5,
};

export function toDateSafe(value: any): Date | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (typeof value._seconds === 'number') {
      return new Date(value._seconds * 1000);
    }
    if (typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000);
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number' || typeof value === 'string') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  } catch {
    return null;
  }
  return null;
}

export function formatLastActive(
  lastActive: Date | null,
  explicitOnline?: boolean
): { isOnline: boolean; label: string; shortLabel: string } {
  const now = Date.now();

  if (lastActive) {
    const diffMs = Math.max(0, now - lastActive.getTime());
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if ((explicitOnline && diffSecs < 180) || diffSecs < 90) {
      return { isOnline: true, label: 'Online now', shortLabel: 'Online' };
    }
    if (diffMins < 60) {
      return {
        isOnline: false,
        label: `Last active ${diffMins}m ago`,
        shortLabel: `${diffMins}m ago`,
      };
    }

    const today = new Date();
    const isSameDay =
      lastActive.getDate() === today.getDate() &&
      lastActive.getMonth() === today.getMonth() &&
      lastActive.getFullYear() === today.getFullYear();

    const timeStr = lastActive.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isSameDay) {
      return {
        isOnline: false,
        label: `Last active today at ${timeStr}`,
        shortLabel: timeStr,
      };
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday =
      lastActive.getDate() === yesterday.getDate() &&
      lastActive.getMonth() === yesterday.getMonth() &&
      lastActive.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return {
        isOnline: false,
        label: `Last active yesterday at ${timeStr}`,
        shortLabel: 'Yesterday',
      };
    }

    if (diffHours < 24 * 7) {
      const dateShort = lastActive.toLocaleDateString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        isOnline: false,
        label: `Last active ${dateShort}`,
        shortLabel: lastActive.toLocaleDateString([], { weekday: 'short' }),
      };
    }

    const fullDate = lastActive.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    });
    return {
      isOnline: false,
      label: `Last active ${fullDate} at ${timeStr}`,
      shortLabel: fullDate,
    };
  }

  if (explicitOnline) {
    return { isOnline: true, label: 'Online now', shortLabel: 'Online' };
  }

  return { isOnline: false, label: 'Last active recently', shortLabel: 'Offline' };
}

export function isUserEligibleForAutoReply(
  config: ChatAutoReplyConfig | null | undefined,
  userId: string
): boolean {
  if (!config || !config.enabled) return false;
  if (!config.message || !config.message.trim()) return false;
  if (config.targetMode === 'all') return true;
  return Array.isArray(config.selectedUserIds) && config.selectedUserIds.includes(userId);
}
