// ============================================================
// i18n React Context + useT() hook
// ============================================================

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { t as translate, type Locale, type TranslationKey } from '@shared/i18n';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? 'ko');

  const t = useCallback(
    (key: TranslationKey) => translate(key, locale),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}
