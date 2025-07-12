// utils/time.js

export const getTimeAgo = (timestamp) => {
  if (!timestamp?.seconds) return '';
  const now = new Date();
  const msgDate = new Date(timestamp.seconds * 1000);
  const diff = Math.floor((now - msgDate) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;

  return msgDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const getMsgTime = (timestamp) => {
  if (!timestamp) return '';

  let msgDate;

  if (typeof timestamp === 'number') {
    msgDate = new Date(timestamp);
  } else if (timestamp.seconds) {
    msgDate = new Date(timestamp.seconds * 1000);
  } else if (typeof timestamp.toDate === 'function') {
    msgDate = timestamp.toDate();
  } else {
    return '';
  }

  return msgDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};


export function getMessageGroupLabel(date) {
  if (!date) return '';

  const msgDate = date instanceof Date ? date : date.toDate();
  const now = new Date();

  const isToday = msgDate.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = msgDate.toDateString() === yesterday.toDateString();

  const timeDiff = now.getTime() - msgDate.getTime();
  const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  if (dayDiff < 7) {
    return msgDate.toLocaleDateString('en-US', {
      weekday: 'long', // e.g., Monday
    });
  }

  return msgDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }); // e.g., Jun 15
}
