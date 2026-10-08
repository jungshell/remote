import { useEffect, useState } from 'react';

// 실제 브라우저 화면 높이(약 650~800px)와 무관하게 데스크톱 폭이면 페이지 단위로 보여준다
const DESKTOP_PAGED_QUERY = '(min-width: 1024px)';

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
