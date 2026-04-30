export const validateDomainKey = (key) => {
  if (!key) return 'Key is required';
  if (key.length < 2) return 'Key must be at least 2 characters';
  if (!/^[a-z][a-z0-9-]*$/.test(key)) return 'Key must start with a letter and contain only lowercase letters, numbers, and hyphens';
  return null;
};

export const validateUrlPath = (path) => {
  if (!path) return 'Path is required';
  if (!path.startsWith('/')) return 'Path must start with /';
  return null;
};

export const validateResourceKey = (key) => {
  if (!key) return 'Key is required';
  if (!/^[a-z][a-z0-9.-]*$/.test(key)) return 'Key must start with a letter and contain only lowercase letters, numbers, dots, and hyphens';
  return null;
};
