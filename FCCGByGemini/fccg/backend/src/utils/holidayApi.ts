import axios from 'axios';

const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY || '';
const GOOGLE_HOLIDAY_CALENDAR_ID =
  process.env.GOOGLE_HOLIDAY_CALENDAR_ID || 'ko.south_korea#holiday@group.v.calendar.google.com';
const GOOGLE_CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3/calendars';

interface GoogleCalendarEvent {
  summary?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[];
}

const isStatutoryHoliday = (summary: string) => {
  const name = summary.trim();
  if (!name) return false;

  // Google 공휴일 캘린더에는 기념일/관찰일이 섞여 있어 법정공휴일만 필터링
  const allowPatterns = [
    /새해첫날/,
    /설날/,
    /삼일절/,
    /어린이날/,
    /부처님오신날/,
    /현충일/,
    /광복절/,
    /개천절/,
    /한글날/,
    /추석/,
    /크리스마스$/,
    /성탄절/,
    /대통령선거일|국회의원선거일|지방선거일|전국동시지방선거일|선거일/,
    /대체공휴일/,
    /^쉬는 날 /
  ];

  const denyPatterns = [
    /노동절/,
    /식목일/,
    /스승의날/,
    /제헌절/,
    /크리스마스 이브/,
    /섣달 그믐날/
  ];

  if (denyPatterns.some((pattern) => pattern.test(name))) {
    return false;
  }

  return allowPatterns.some((pattern) => pattern.test(name));
};

// 특정 연도의 공휴일 조회 (날짜와 이름을 함께 반환)
export const getHolidaysByYear = async (year: string): Promise<{ [date: string]: string }> => {
  if (!GOOGLE_CALENDAR_API_KEY || GOOGLE_CALENDAR_API_KEY.trim().length === 0) {
    throw new Error('GOOGLE_CALENDAR_API_KEY is not configured');
  }

  try {
    const calendarId = encodeURIComponent(GOOGLE_HOLIDAY_CALENDAR_ID);
    const timeMin = `${year}-01-01T00:00:00Z`;
    const timeMax = `${year}-12-31T23:59:59Z`;

    console.log(`🗓️ ${year}년 공휴일 조회 시작 (Google Calendar)`);

    const response = await axios.get<GoogleCalendarResponse>(`${GOOGLE_CALENDAR_API_URL}/${calendarId}/events`, {
      params: {
        key: GOOGLE_CALENDAR_API_KEY,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
      },
      timeout: 10000,
    });

    const holidayMap: { [date: string]: string } = {};
    const items = Array.isArray(response.data?.items) ? response.data.items : [];

    items.forEach((item) => {
      const holidayDate = item?.start?.date;
      const holidayName = (item?.summary || '').trim();
      if (!holidayDate || !holidayName) return;
      if (!isStatutoryHoliday(holidayName)) return;
      holidayMap[holidayDate] = holidayName;
    });

    console.log(`✅ ${year}년 공휴일 ${Object.keys(holidayMap).length}개 조회 완료 (Google Calendar)`);
    return holidayMap;
  } catch (error) {
    console.error(`❌ ${year}년 공휴일 조회 실패:`, error);
    throw error;
  }
};

// 여러 연도의 공휴일 조회
export const getHolidaysByYears = async (years: string[]): Promise<{ [year: string]: { [date: string]: string } }> => {
  const result: { [year: string]: { [date: string]: string } } = {};
  
  await Promise.all(
    years.map(async (year) => {
      result[year] = await getHolidaysByYear(year);
    })
  );
  
  return result;
};

// 특정 날짜가 공휴일인지 확인
export const isHoliday = async (date: string): Promise<boolean> => {
  const year = date.substring(0, 4);
  const holidays = await getHolidaysByYear(year);
  return holidays[date] !== undefined;
};

// 주어진 날짜 범위에서 공휴일이 아닌 평일만 필터링
export const getWeekdaysOnly = async (dates: string[]): Promise<string[]> => {
  const result: string[] = [];
  
  for (const date of dates) {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 일요일(0) 또는 토요일(6)
    const isHolidayDate = await isHoliday(date);
    
    if (!isWeekend && !isHolidayDate) {
      result.push(date);
    }
  }
  
  return result;
};

// 다음 주 월-금 날짜 생성 (공휴일 제외)
export const getNextWeekWeekdays = async (startDate?: Date): Promise<string[]> => {
  const baseDate = startDate || new Date();
  const nextWeekStart = new Date(baseDate);
  
  // 다음 주 월요일 찾기
  let daysUntilMonday = (8 - baseDate.getDay()) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7; // 오늘이 월요일이면 다음 주 월요일
  nextWeekStart.setDate(baseDate.getDate() + daysUntilMonday);
  
  const weekdays: string[] = [];
  
  // 월요일부터 금요일까지 (5일)
  for (let i = 0; i < 5; i++) {
    const currentDate = new Date(nextWeekStart);
    currentDate.setDate(nextWeekStart.getDate() + i);
    
    const dateString = currentDate.toISOString().split('T')[0];
    weekdays.push(dateString);
  }
  
  // 공휴일 제외하고 반환
  return await getWeekdaysOnly(weekdays);
};

// 날짜 포맷팅 (YYYY-MM-DD → M월 D일(요일))
export const formatDateKorean = (dateString: string): string => {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  
  return `${month}월 ${day}일(${dayName})`;
};

// 디버깅용: 공휴일 정보 출력
export const logHolidayInfo = async (dates: string[]): Promise<void> => {
  console.log('📅 날짜별 공휴일 정보:');
  for (const date of dates) {
    const isHolidayDate = await isHoliday(date);
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const status = isHolidayDate ? '공휴일' : isWeekend ? '주말' : '평일';
    
    console.log(`  ${formatDateKorean(date)}: ${status}`);
  }
};
