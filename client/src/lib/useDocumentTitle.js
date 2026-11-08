import { useEffect } from 'react';

// No react-helmet dependency needed for four static titles — a plain effect
// is simpler and it's the only per-page <head> control this site needs.
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
