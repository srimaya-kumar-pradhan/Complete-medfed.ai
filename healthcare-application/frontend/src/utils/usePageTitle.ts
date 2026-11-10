import { useEffect } from 'react';

/**
 * Custom hook to update document title per route following DORI standard:
 * "DORI | [Page Title]"
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title.startsWith('DORI') ? title : `DORI | ${title}`;
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
