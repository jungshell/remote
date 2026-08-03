import { useEffect, useState } from 'react';

const DESKTOP_PAGED_QUERY =
  '(min-width: 1280px) and (min-height: 900px) and (max-resolution: 1.25dppx)';

export function useDesktopPagedLayout() {
  const [isDesktopPaged, setIsDesktopPaged] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_PAGED_QUERY);
    const update = () => setIsDesktopPaged(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isDesktopPaged;
}
