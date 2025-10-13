

export const formatVoiceTime = (minutes) => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.round(minutes % 60);
    
    let result = `${days}d`;
    if (hours > 0) result += ` ${hours}h`;
    if (mins > 0) result += ` ${mins}m`;
    return result;
  }
};