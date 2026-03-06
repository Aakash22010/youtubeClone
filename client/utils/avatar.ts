export const getAvatarUrl = (photoURL?: string | null, displayName?: string | null): string => {
  if (photoURL) return photoURL;
  const name = displayName || 'User';
  // UI Avatars API: returns a nice letter avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&length=1&bold=true`;
};