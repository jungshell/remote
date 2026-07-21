const PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Supabase(PostgREST)는 기본 최대 1000행만 반환하므로,
 * 전체 행이 필요한 집계·내보내기 조회는 이 헬퍼로 range 페이지네이션을 돌립니다.
 * buildQuery는 호출마다 새 쿼리를 만들어 .range(from, to)까지 적용해 반환해야 합니다.
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);

    if (error) {
      return { rows, error: error.message };
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return { rows, error: null };
    }
  }
}
