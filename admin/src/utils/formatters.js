export const formatRecordLabel = (record) => {
  if (!record) return '';
  return record.key || record.name || record.displayName || record.username || record.email || `#${record.id}`;
};

export const formatDate = (date, includeTime = false) => {
  if (!date) return '';
  const d = new Date(date);
  if (includeTime) {
    return d.toLocaleString();
  }
  return d.toLocaleDateString();
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};
