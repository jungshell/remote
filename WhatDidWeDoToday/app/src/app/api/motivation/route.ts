import { NextResponse } from "next/server";
import { getMongoDb } from "@/lib/mongodbAdmin";

export const runtime = "nodejs";

/**
 * 일기 작성 동기부여 정보 제공
 * GET /api/motivation
 * Returns: { streak: number, lastDiaryDate: string, todayWritten: boolean, totalDiaries: number }
 */
export async function GET(request: Request) {
  try {
    // 할당량 절약: 최근 30개만 확인 (연속 작성일 계산에는 충분)
    const db = await getMongoDb();
    const collection = db.collection("diaries");
    
    const docs = await collection
      .find({})
      .sort({ date: -1, createdAt: -1 })
      .limit(30)
      .toArray();

    const diaries: Array<{ date: string; createdAt?: string }> = [];
    docs.forEach((doc: any) => {
      const { _id, ...data } = doc;
      if (data.date && typeof data.date === "string") {
        diaries.push({
          date: data.date,
          createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
        });
      }
    });

    if (diaries.length === 0) {
      return NextResponse.json({
        streak: 0,
        lastDiaryDate: null,
        todayWritten: false,
        totalDiaries: 0,
        message: "첫 일기를 작성해보세요!",
      });
    }

    // 날짜별로 그룹화 (같은 날 여러 일기가 있어도 1일로 카운트)
    const datesSet = new Set<string>();
    diaries.forEach((d) => {
      if (d.date) datesSet.add(d.date);
    });
    const sortedDates = Array.from(datesSet).sort().reverse(); // 최신순

    // 오늘 날짜
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // 오늘 일기 작성 여부
    const todayWritten = sortedDates.includes(todayStr);

    // 연속 작성일 계산 (오늘부터 역순으로)
    let streak = 0;
    let checkDate = new Date(today);
    
    // 오늘 일기를 썼으면 streak 시작
    if (todayWritten) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // 어제부터 역순으로 연속 작성일 계산
    while (true) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, "0")}-${String(checkDate.getDate()).padStart(2, "0")}`;
      if (sortedDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const lastDiaryDate = sortedDates[0] || null;

    // 동기부여 메시지 생성
    let message = "";
    if (todayWritten) {
      if (streak === 1) {
        message = "오늘도 일기를 작성하셨네요! 내일도 계속해요!";
      } else if (streak < 7) {
        message = `연속 ${streak}일째 일기를 작성하고 있어요! 멋져요!`;
      } else if (streak < 30) {
        message = `와! 연속 ${streak}일째예요! 정말 대단해요!`;
      } else {
        message = `놀라워요! 연속 ${streak}일째 일기를 작성하고 있어요!`;
      }
    } else {
      if (streak === 0) {
        message = "오늘 하루를 기록해보세요!";
      } else {
        message = `연속 ${streak}일 기록 중이에요! 오늘도 작성하면 ${streak + 1}일이 돼요!`;
      }
    }

    // 배지 계산 (7일, 30일, 100일)
    const badges: string[] = [];
    if (streak >= 7) badges.push("7일");
    if (streak >= 30) badges.push("30일");
    if (streak >= 100) badges.push("100일");

    // 이번 달 작성일 수 계산
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const thisMonthDiaries = diaries.filter((d) => {
      const diaryDate = new Date(d.date);
      return diaryDate.getMonth() === currentMonth && diaryDate.getFullYear() === currentYear;
    });
    const thisMonthDates = new Set(thisMonthDiaries.map((d) => d.date));
    const thisMonthCount = thisMonthDates.size;

    // 이번 달 총 일수
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthProgress = daysInMonth > 0 ? (thisMonthCount / daysInMonth) * 100 : 0;

    return NextResponse.json({
      streak,
      lastDiaryDate,
      todayWritten,
      totalDiaries: diaries.length,
      message,
      badges,
      thisMonthCount,
      monthProgress: Math.round(monthProgress),
      daysInMonth,
    });
  } catch (e) {
    console.error("[motivation] 오류:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "동기부여 정보 조회 실패",
      },
      { status: 500 }
    );
  }
}
