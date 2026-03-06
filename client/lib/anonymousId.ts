const ANONYMOUS_ID_KEY = 'youtube_anonymous_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const getAnonymousId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
};