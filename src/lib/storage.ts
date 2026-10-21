// localStorage wrappers that never throw (private mode, blocked storage, SSR).
export const store = {
  get<T = string>(key: string): T | null {
    try {
      const v = window.localStorage.getItem(key);
      return v === null ? null : (JSON.parse(v) as T);
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
  remove(key: string) {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

export const KEYS = { prompt: 'bc-prompt-v1', draft: 'bc-draft-v3' };
