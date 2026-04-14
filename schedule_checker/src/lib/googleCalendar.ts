/**
 * Google Calendar API 통합 라이브러리
 * Task의 마감일을 Google Calendar 이벤트로 동기화합니다.
 */
import { getAdminApp } from '@/lib/verifyToken';
import { getFirestore } from 'firebase-admin/firestore';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const TOKEN_REFRESH_URL = 'https://oauth2.googleapis.com/token';

interface CalendarTokens {
  refresh_token: string;
  access_token: string | null;
  expiry: number | null;
}

/**
 * Firestore에서 사용자의 Google Calendar 토큰을 가져옵니다.
 */
async function getCalendarTokens(uid: string): Promise<CalendarTokens | null> {
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  const doc = await db.collection('calendar_tokens').doc(uid).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    refresh_token: data?.refresh_token ?? '',
    access_token: data?.access_token ?? null,
    expiry: data?.expiry ?? null,
  };
}

/**
 * 액세스 토큰을 갱신하고 Firestore에 저장합니다.
 */
async function refreshAccessToken(uid: string, refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    console.error('Google Calendar credentials not configured');
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  try {
    const res = await fetch(TOKEN_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Token refresh failed:', err);
      return null;
    }

    const tokens = await res.json();
    const accessToken = tokens.access_token;
    const expiresIn = tokens.expires_in;

    // Firestore에 업데이트
    const app = getAdminApp();
    if (app) {
      const db = getFirestore(app);
      await db.collection('calendar_tokens').doc(uid).update({
        access_token: accessToken,
        expiry: expiresIn ? Date.now() + expiresIn * 1000 : null,
      });
    }

    return accessToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * 유효한 액세스 토큰을 가져옵니다 (필요 시 갱신).
 */
async function getValidAccessToken(uid: string): Promise<string | null> {
  const tokens = await getCalendarTokens(uid);
  if (!tokens || !tokens.refresh_token) return null;

  // 토큰이 있고 아직 만료되지 않았으면 그대로 사용
  if (tokens.access_token && tokens.expiry && tokens.expiry > Date.now() + 60000) {
    return tokens.access_token;
  }

  // 만료되었거나 없으면 갱신
  return await refreshAccessToken(uid, tokens.refresh_token);
}

/**
 * Tasks 캘린더 ID를 가져옵니다.
 * Tasks 캘린더가 없으면 생성합니다.
 */
export async function getTasksCalendarId(uid: string): Promise<string | null> {
  const accessToken = await getValidAccessToken(uid);
  if (!accessToken) return null;

  try {
    // 캘린더 목록 조회
    const listRes = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!listRes.ok) {
      console.error('Failed to list calendars:', await listRes.text());
      return null;
    }

    const calendarList = await listRes.json();
    const items = calendarList.items || [];

    // "Tasks" 또는 "할 일" 캘린더 찾기
    const tasksCalendar = items.find(
      (cal: any) =>
        cal.summary?.toLowerCase().includes('task') ||
        cal.summary?.toLowerCase().includes('할 일') ||
        cal.summary?.toLowerCase().includes('tasks')
    );

    if (tasksCalendar) {
      return tasksCalendar.id;
    }

    // Tasks 캘린더가 없으면 생성
    const newCalendar = {
      summary: 'Tasks',
      description: 'AutoFlow 업무 일정',
      timeZone: 'Asia/Seoul',
    };

    const createRes = await fetch(`${CALENDAR_API_BASE}/calendars`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newCalendar),
    });

    if (!createRes.ok) {
      console.error('Failed to create Tasks calendar:', await createRes.text());
      return null;
    }

    const created = await createRes.json();
    return created.id;
  } catch (error) {
    console.error('Error getting Tasks calendar ID:', error);
    return null;
  }
}

/**
 * Google Calendar에 이벤트를 생성합니다.
 * @param uid 사용자 ID
 * @param task Task 객체
 * @returns 생성된 이벤트 ID 또는 null
 */
export async function createCalendarEvent(
  uid: string,
  task: { id: string; title: string; description?: string; dueAt?: string }
): Promise<string | null> {
  if (!task.dueAt) return null; // 마감일이 없으면 이벤트 생성 안 함

  const accessToken = await getValidAccessToken(uid);
  if (!accessToken) {
    console.warn(`No valid access token for user ${uid}`);
    return null;
  }

  const dueDate = new Date(task.dueAt);
  const startTime = new Date(dueDate);
  startTime.setHours(dueDate.getHours(), dueDate.getMinutes(), 0, 0);
  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 1); // 기본 1시간 이벤트

  const event = {
    summary: `[업무] ${task.title}`,
    description: task.description
      ? `${task.description}\n\n업무 ID: ${task.id}`
      : `업무 ID: ${task.id}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
    reminders: {
      useDefault: false,
      overrides: [], // 알림 없음
    },
  };

  // Tasks 캘린더 ID 가져오기
  const calendarId = await getTasksCalendarId(uid);
  if (!calendarId) {
    console.warn(`Failed to get Tasks calendar ID for user ${uid}, falling back to primary`);
    // Tasks 캘린더를 찾을 수 없으면 기본 캘린더 사용
    const fallbackCalendarId = 'primary';
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${fallbackCalendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to create calendar event:', err);
      return null;
    }
    const created = await res.json();
    return created.id ?? null;
  }

  try {
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to create calendar event:', err);
      return null;
    }

    const created = await res.json();
    return created.id ?? null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

/**
 * Google Calendar 이벤트를 업데이트합니다.
 * @param uid 사용자 ID
 * @param eventId 이벤트 ID
 * @param task Task 객체
 */
export async function updateCalendarEvent(
  uid: string,
  eventId: string,
  task: { id: string; title: string; description?: string; dueAt?: string }
): Promise<boolean> {
  const accessToken = await getValidAccessToken(uid);
  if (!accessToken) {
    console.warn(`No valid access token for user ${uid}`);
    return false;
  }

  // 마감일이 없으면 이벤트 삭제
  if (!task.dueAt) {
    return await deleteCalendarEvent(uid, eventId);
  }

  const dueDate = new Date(task.dueAt);
  const startTime = new Date(dueDate);
  startTime.setHours(dueDate.getHours(), dueDate.getMinutes(), 0, 0);
  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 1);

  const event = {
    summary: `[업무] ${task.title}`,
    description: task.description
      ? `${task.description}\n\n업무 ID: ${task.id}`
      : `업무 ID: ${task.id}`,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'Asia/Seoul',
    },
    reminders: {
      useDefault: false,
      overrides: [], // 알림 없음
    },
  };

  // Tasks 캘린더 ID 가져오기
  const calendarId = await getTasksCalendarId(uid);
  if (!calendarId) {
    console.warn(`Failed to get Tasks calendar ID for user ${uid}, falling back to primary`);
    const fallbackCalendarId = 'primary';
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${fallbackCalendarId}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to update calendar event:', err);
      return false;
    }
    return true;
  }

  try {
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to update calendar event:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

/**
 * Google Calendar 이벤트를 삭제합니다.
 * @param uid 사용자 ID
 * @param eventId 이벤트 ID
 */
export async function deleteCalendarEvent(uid: string, eventId: string): Promise<boolean> {
  const accessToken = await getValidAccessToken(uid);
  if (!accessToken) {
    console.warn(`No valid access token for user ${uid}`);
    return false;
  }

  // Tasks 캘린더 ID 가져오기
  const calendarId = await getTasksCalendarId(uid);
  const targetCalendarId = calendarId || 'primary';

  try {
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${targetCalendarId}/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok && res.status !== 404) {
      // 404는 이미 삭제된 경우이므로 성공으로 간주
      const err = await res.text();
      console.error('Failed to delete calendar event:', err);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

/**
 * Google Calendar에서 이벤트 목록을 가져옵니다.
 * @param uid 사용자 ID
 * @param calendarId 캘린더 ID (기본값: 'primary' 또는 'Tasks' 캘린더)
 * @param timeMin 시작 시간 (ISO 8601 형식, 선택사항)
 * @param timeMax 종료 시간 (ISO 8601 형식, 선택사항)
 * @returns 이벤트 목록
 */
export async function listCalendarEvents(
  uid: string,
  options?: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }
): Promise<any[]> {
  const accessToken = await getValidAccessToken(uid);
  if (!accessToken) {
    console.warn(`No valid access token for user ${uid}`);
    return [];
  }

  // 캘린더 ID 결정: 옵션에서 지정했거나 Tasks 캘린더, 없으면 primary
  let calendarId = options?.calendarId;
  if (!calendarId) {
    const tasksCalendarId = await getTasksCalendarId(uid);
    calendarId = tasksCalendarId || 'primary';
  }

  const params = new URLSearchParams();
  if (options?.timeMin) {
    params.append('timeMin', options.timeMin);
  } else {
    // 기본값: 오늘부터 1년 후까지
    const now = new Date();
    params.append('timeMin', now.toISOString());
  }
  if (options?.timeMax) {
    params.append('timeMax', options.timeMax);
  } else {
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    params.append('timeMax', oneYearLater.toISOString());
  }
  if (options?.maxResults) {
    params.append('maxResults', options.maxResults.toString());
  } else {
    params.append('maxResults', '250'); // 기본값: 최대 250개
  }
  params.append('singleEvents', 'true');
  params.append('orderBy', 'startTime');

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${calendarId}/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Failed to list calendar events:', err);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error('Error listing calendar events:', error);
    return [];
  }
}
