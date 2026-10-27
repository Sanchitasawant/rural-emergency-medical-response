export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'rc-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
}
