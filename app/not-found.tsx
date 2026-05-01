'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 flex-col space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">404 - {t('notFound.title')}</h2>
      <p className="text-gray-500">{t('notFound.description')}</p>
      <div className="pt-4">
        <Link href="/">
          <button className="px-4 py-2 bg-[#0B152A] text-white rounded-md hover:bg-opacity-90 transition-opacity">{t('notFound.backHome')}</button>
        </Link>
      </div>
    </div>
  );
}
