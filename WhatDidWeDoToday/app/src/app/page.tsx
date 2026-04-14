"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiaryEntry, VoiceSegment, UploadedPhoto, TabType, StatsData, TimelineEntry } from "@/lib/types";
import { formatDisplayDate, formatDate, getErrorMessage, weatherMap } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";
import FeedView from "@/components/FeedView";
import ReadFullScreen from "@/components/ReadFullScreen";
import Toast, { type ToastItem } from "@/components/Toast";
import WriteModal from "@/components/WriteModal";
import EditDiaryModal, { type EditSection } from "@/components/EditDiaryModal";
import AlbumView from "@/components/AlbumView";
import MapView from "@/components/MapView";
 

// 유틸리티 함수는 lib/utils.ts로 이동됨

function DiaryImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
  return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-stone-100 text-xs text-stone-500">
        이미지 없음
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function Home() {
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("위치 확인 중...");
  const [weather, setWeather] = useState("날씨 확인 중...");
  const [mounted, setMounted] = useState(false);
  const [membersInput, setMembersInput] = useState("엄마, 아빠, 아이");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(
    null,
  );
  const [voiceSegments, setVoiceSegments] = useState<VoiceSegment[]>([]);
  const [copyTooltip, setCopyTooltip] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Record<string, string>>({});
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("diary");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{current: number; total: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [writeOpen, setWriteOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [editingDiary, setEditingDiary] = useState<DiaryEntry | null>(null);
  const [editingSection, setEditingSection] = useState<EditSection | null>(null);
  const [similarDiaries, setSimilarDiaries] = useState<DiaryEntry[]>([]);
  const [reportPeriod, setReportPeriod] = useState<"month" | "year">("month");
  const [reportYear, setReportYear] = useState(() => new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(() => new Date().getMonth() + 1);
  const [reportLoading, setReportLoading] = useState(false);
  const [regeneratingAllBodies, setRegeneratingAllBodies] = useState(false);
  const [reportData, setReportData] = useState<{
    period: string;
    year: number;
    month?: number;
    diaryCount: number;
    stats: { avgMood: number; topKeywords: string[]; topLocations: string[] };
    summary: string;
  } | null>(null);
  const [timelineMember, setTimelineMember] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isDraggingNewAudio, setIsDraggingNewAudio] = useState(false);
  const [motivation, setMotivation] = useState<{
    streak: number;
    todayWritten: boolean;
    message: string;
    badges?: string[];
    thisMonthCount?: number;
    monthProgress?: number;
    daysInMonth?: number;
  } | null>(null);
  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    return id;
  };
  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceDataRef = useRef<Array<{ pitch: number; time: number }>>([]);

  const members = useMemo(
    () =>
      membersInput
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [membersInput],
  );

  const memberColors = useMemo(() => {
    const colors: Record<string, string> = {
      엄마: "pink",
      아빠: "blue",
      아이: "yellow",
    };
    members.forEach((m, idx) => {
      if (!colors[m]) {
        const defaultColors = ["emerald", "purple", "orange", "rose"];
        colors[m] = defaultColors[idx % defaultColors.length];
      }
    });
    return colors;
  }, [members]);

  const [loadingDiaries, setLoadingDiaries] = useState(true);
  
  // localStorage 캐시 키
  const CACHE_KEY = "wdwdt_diaries_cache";
  const CACHE_EXPIRY_KEY = "wdwdt_diaries_cache_expiry";
  const CACHE_DURATION_MS = 10 * 60 * 1000; // 10분 캐시

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadDiaries = async () => {
      setLoadingDiaries(true);
      
      // 캐시 확인 (할당량 절약)
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        
        if (cachedData && cacheExpiry) {
          const expiryTime = parseInt(cacheExpiry, 10);
          const now = Date.now();
          
          if (now < expiryTime) {
            // 캐시가 유효함
            console.log("[page] 캐시에서 일기 목록 로드 (할당량 절약)");
            const parsed = JSON.parse(cachedData);
            if (isMounted && Array.isArray(parsed)) {
              setDiaries(parsed);
              setLoadingDiaries(false);
              return; // API 호출 생략
            }
          } else {
            console.log("[page] 캐시 만료됨, 새로 로드");
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_EXPIRY_KEY);
          }
        }
      } catch (e) {
        console.warn("[page] 캐시 읽기 실패:", e);
      }
      
      try {
        console.log("[page] 일기 목록 로딩 시작");
        const response = await fetch("/api/diary?limit=30", {
          signal: controller.signal,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[page] 일기 목록 로딩 실패:", response.status, errorData);
          if (isMounted) {
            if (errorData.quotaExceeded || errorData.error?.includes("RESOURCE_EXHAUSTED") || errorData.error?.includes("Quota exceeded")) {
              // 할당량 리셋 시간 계산 (매일 자정 UTC = 한국 시간 오전 9시)
              const now = new Date();
              const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
              const koreaOffset = 9 * 60; // UTC+9
              const koreaTime = new Date(utcNow.getTime() + (koreaOffset * 60000));
              
              // 다음 자정 UTC (한국 시간 오전 9시) 계산
              const tomorrow = new Date(koreaTime);
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(9, 0, 0, 0);
              
              const hoursUntilReset = Math.ceil((tomorrow.getTime() - koreaTime.getTime()) / (1000 * 60 * 60));
              
              setError(
                `⚠️ Firestore 할당량이 초과되었습니다.\n\n` +
                `💾 소중한 일기 데이터는 모두 안전하게 저장되어 있습니다!\n\n` +
                `할당량은 매일 오전 9시(한국 시간)에 자동으로 리셋됩니다.\n` +
                `다음 리셋까지 약 ${hoursUntilReset}시간 남았습니다.\n\n` +
                `📅 다음에 확인 가능한 시간: ${tomorrow.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`
              );
            } else {
              setError(`일기 목록을 불러오지 못했습니다 (${response.status}). 페이지를 새로고침해주세요.`);
            }
          }
          return;
        }
        const data = await response.json();
        console.log("[page] 일기 목록 응답:", {
          hasDiaries: !!data?.diaries,
          count: data?.diaries?.length || 0,
          dataKeys: Object.keys(data || {}),
        });
        if (!isMounted) return;
        if (data?.diaries) {
          // 날짜 최신순으로 정렬 (createdAt 기준, 없으면 date 기준)
          // 날짜 기준으로 최신순 정렬 (date 필드 우선, 없으면 createdAt)
          const sorted = [...data.diaries].sort((a: any, b: any) => {
            // date 필드를 우선 사용 (YYYY-MM-DD 형식)
            const dateA = a.date ? new Date(a.date + "T12:00:00").getTime() : new Date(a.createdAt || 0).getTime();
            const dateB = b.date ? new Date(b.date + "T12:00:00").getTime() : new Date(b.createdAt || 0).getTime();
            // 최신순 (내림차순)
            return dateB - dateA;
          });
          console.log("[page] 일기 목록 정렬 완료:", sorted.length, "개");
          setDiaries(sorted);
          
          // 캐시에 저장 (할당량 절약)
          try {
            const expiryTime = Date.now() + CACHE_DURATION_MS;
            localStorage.setItem(CACHE_KEY, JSON.stringify(sorted));
            localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
            console.log("[page] 일기 목록 캐시 저장 (10분 유효)");
          } catch (e) {
            console.warn("[page] 캐시 저장 실패:", e);
          }
          
          // 첫 화면은 리스트만 보이도록 (상세 정보 기본 노출 제거)
          setSelectedDiaryId(null);
        } else {
          console.warn("[page] 일기 목록이 비어있음:", data);
          setDiaries([]);
        }
      } catch (err) {
        console.error("[page] 일기 목록 로딩 중 오류:", err);
        if (isMounted && !controller.signal.aborted) {
          setError("일기 목록을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.");
        }
      } finally {
        if (isMounted) {
          setLoadingDiaries(false);
        }
      }
    };

    loadDiaries();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedDiaryId) {
      setSimilarDiaries([]);
      return;
    }
    const ac = new AbortController();
    fetch(`/api/similar?id=${encodeURIComponent(selectedDiaryId)}`, { signal: ac.signal })
      .then((res) => (res.ok ? res.json() : { similar: [] }))
      .then((data) => setSimilarDiaries(Array.isArray(data.similar) ? data.similar : []))
      .catch(() => setSimilarDiaries([]));
    return () => ac.abort();
  }, [selectedDiaryId]);

  const transcribeAudioFile = useCallback(async (file: File | Blob): Promise<string | null> => {
    const form = new FormData();
    form.append("file", file, file instanceof File ? file.name : "audio.m4a");
    const res = await fetch("/api/transcribe", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "녹음 내용 변환 실패");
    }
    const data = await res.json();
    return data?.text ?? null;
  }, []);

  const fetchKoreanAddress = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ko`,
        {
          headers: {
            "Accept-Language": "ko",
          },
        },
      );
      if (!response.ok) {
        throw new Error("reverse geocode failed");
      }
      const data = await response.json();
      return (
        data?.address?.city ??
        data?.address?.town ??
        data?.address?.village ??
        data?.address?.county ??
        data?.address?.state ??
        ""
      );
    } catch {
      return "";
    }
  };

  const refreshLocationWeather = useCallback(async (dateStr?: string) => {
    const targetDate = dateStr?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateStr : new Date().toISOString().slice(0, 10);
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocation("위치 확인 중...");
      setWeather("날씨 확인 중...");
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        if (!ipRes.ok) {
          throw new Error("ipapi failed");
        }
        const ipData = await ipRes.json();
        const ipLat = ipData?.latitude;
        const ipLon = ipData?.longitude;
        const ipPlace = [ipData?.city, ipData?.region]
          .filter(Boolean)
          .join(" ");
        if (typeof ipLat === "number" && typeof ipLon === "number") {
          const koPlace = await fetchKoreanAddress(ipLat, ipLon);
          if (koPlace) {
            setLocation(koPlace);
          } else if (ipPlace) {
            setLocation(ipPlace);
          }
          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${ipLat}&longitude=${ipLon}&start_date=${targetDate}&end_date=${targetDate}&daily=weather_code,temperature_2m_max,temperature_2m_min`,
          );
          const weatherData = await weatherRes.json();
          const daily = weatherData?.daily;
          const code = daily?.weather_code?.[0];
          const tempMin = daily?.temperature_2m_min?.[0];
          const tempMax = daily?.temperature_2m_max?.[0];
          const label = weatherMap[code] ?? "날씨 정보";
          if (typeof tempMin === "number" && typeof tempMax === "number") {
            setWeather(`${label} ${tempMin} ~ ${tempMax}°C`);
          } else {
            setWeather(label);
          }
        } else {
          setLocation("위치를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
          setWeather("날씨를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
        }
      } catch {
        setLocation("위치를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
        setWeather("날씨를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
      }
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const place = await fetchKoreanAddress(latitude, longitude);
          if (place) {
            setLocation(place);
          } else {
            setLocation("위치를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
          }

          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&start_date=${targetDate}&end_date=${targetDate}&daily=weather_code,temperature_2m_max,temperature_2m_min`,
          );
          if (!weatherRes.ok) {
            throw new Error("weather failed");
          }
          const weatherData = await weatherRes.json();
          const daily = weatherData?.daily;
          const code = daily?.weather_code?.[0];
          const tempMin = daily?.temperature_2m_min?.[0];
          const tempMax = daily?.temperature_2m_max?.[0];
          const label = weatherMap[code] ?? "날씨 정보";
          if (typeof tempMin === "number" && typeof tempMax === "number") {
            setWeather(`${label} ${tempMin} ~ ${tempMax}°C`);
          } else {
            setWeather(label);
          }
        } catch {
          setLocation("위치를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
          setWeather("날씨를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
        }
      },
      async () => {
        try {
          const ipRes = await fetch("https://ipapi.co/json/");
          if (!ipRes.ok) {
            throw new Error("ipapi failed");
          }
          const ipData = await ipRes.json();
          const ipLat = ipData?.latitude;
          const ipLon = ipData?.longitude;
          const ipPlace = [ipData?.city, ipData?.region]
            .filter(Boolean)
            .join(" ");
          if (typeof ipLat === "number" && typeof ipLon === "number") {
            const koPlace = await fetchKoreanAddress(ipLat, ipLon);
            if (koPlace) {
              setLocation(koPlace);
            } else if (ipPlace) {
              setLocation(ipPlace);
            } else {
              setLocation("위치를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
            }
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${ipLat}&longitude=${ipLon}&start_date=${targetDate}&end_date=${targetDate}&daily=weather_code,temperature_2m_max,temperature_2m_min`,
            );
            const weatherData = await weatherRes.json();
            const daily = weatherData?.daily;
            const code = daily?.weather_code?.[0];
            const tempMin = daily?.temperature_2m_min?.[0];
            const tempMax = daily?.temperature_2m_max?.[0];
            const label = weatherMap[code] ?? "날씨 정보";
            if (typeof tempMin === "number" && typeof tempMax === "number") {
              setWeather(`${label} ${tempMin} ~ ${tempMax}°C`);
            } else {
              setWeather(label);
            }
          } else {
            setLocation("위치를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
            setWeather("날씨를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
          }
        } catch {
          setLocation("위치를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
          setWeather("날씨를 불러오지 못했어요. 아래 '위치/날씨 다시 불러오기'를 눌러주세요.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const fetchWeatherByLocationAndDate = useCallback(async (locationStr: string, dateStr?: string) => {
    const q = locationStr?.trim();
    if (!q || q.startsWith("위치")) return;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + " 대한민국")}&limit=1`,
        { headers: { "Accept-Language": "ko" } },
      );
      if (!geoRes.ok) return;
      const geoData = await geoRes.json();
      const lat = parseFloat(geoData[0]?.lat);
      const lon = parseFloat(geoData[0]?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const targetDate = dateStr?.match(/^\d{4}-\d{2}-\d{2}$/) ? dateStr : new Date().toISOString().slice(0, 10);
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${targetDate}&end_date=${targetDate}&daily=weather_code,temperature_2m_max,temperature_2m_min`,
      );
      if (!weatherRes.ok) return;
      const weatherData = await weatherRes.json();
      const daily = weatherData?.daily;
      const code = daily?.weather_code?.[0];
      const tempMin = daily?.temperature_2m_min?.[0];
      const tempMax = daily?.temperature_2m_max?.[0];
      const label = weatherMap[code] ?? "날씨 정보";
      if (typeof tempMin === "number" && typeof tempMax === "number") {
        setWeather(`${label} ${tempMin} ~ ${tempMax}°C`);
      } else {
        setWeather(label);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    setDate(formatDate(new Date()));
    refreshLocationWeather();
  }, [refreshLocationWeather]);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const value = saved === "dark" || saved === "light" ? saved : "light";
    setTheme(value);
    document.documentElement.setAttribute("data-theme", value);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkNotificationPermission = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    };
    checkNotificationPermission();

    const scheduleReminder = () => {
      const now = new Date();
      const reminderTime = new Date();
      reminderTime.setHours(19, 0, 0, 0);
      if (reminderTime <= now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }
      const msUntilReminder = reminderTime.getTime() - now.getTime();

      setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("우리가족 일기", {
            body: "오늘 하루를 정리할 시간이에요! 🎉",
            icon: "/favicon.ico",
            tag: "daily-reminder",
          });
          scheduleReminder();
        }
      }, msUntilReminder);
    };

    scheduleReminder();
  }, []);

  const detectSpeaker = (pitch: number): string => {
    if (pitch > 200) return "아이";
    if (pitch > 150) return "엄마";
    return "아빠";
  };

  // 새 일기 작성 모달에서 사용하는 오디오 파일 처리 (버튼/드래그앤드롭 공통)
  const handleNewAudioFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (!file.type.startsWith("audio/")) {
        addToast("오디오 파일만 넣을 수 있어요.", "error");
        return;
      }

      const url = URL.createObjectURL(file);
      setAudioPreviewUrl(url);
      setAudioUrl(url);
      addToast("오디오 파일을 추가했어요", "success");

      // 날짜/위치 자동 세팅
      if (uploadedPhotos.length === 0) {
        if (!date) setDate(formatDate(new Date()));
        if (!location || location.startsWith("위치 확인") || !weather || weather.startsWith("날씨 확인")) {
          refreshLocationWeather();
        }
      }

      setIsTranscribing(true);
      try {
        const text = await transcribeAudioFile(file);
        if (text) setTranscript(text);
        else addToast("녹음 내용을 텍스트로 변환하지 못했어요.", "info");
      } catch (err) {
        addToast(getErrorMessage(err), "error");
      } finally {
        setIsTranscribing(false);
      }
    },
    [addToast, date, location, refreshLocationWeather, transcribeAudioFile, uploadedPhotos.length, weather],
  );

  const analyzePitch = (audioBuffer: AudioBuffer): number => {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const bufferSize = 2048;
    let maxCorrelation = 0;
    let bestPeriod = 0;

    for (let period = 20; period < 200; period++) {
      let correlation = 0;
      for (let i = 0; i < bufferSize - period; i++) {
        correlation += Math.abs(channelData[i] * channelData[i + period]);
      }
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestPeriod = period;
      }
    }

    if (bestPeriod === 0) return 0;
    return sampleRate / bestPeriod;
  };

  const startRecording = async () => {
    setError("");
    setInterimTranscript("");
    chunksRef.current = [];
    setAudioUrl("");
    setAudioPreviewUrl("");
    setVoiceSegments([]);
    voiceDataRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
      },
    });
    const recorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });
    mediaRecorderRef.current = recorder;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyserRef.current = analyser;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let lastPitchTime = Date.now();
    const pitchInterval = setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxValue) {
          maxValue = dataArray[i];
          maxIndex = i;
        }
      }
      const pitch = (maxIndex * audioContext.sampleRate) / (2 * bufferLength);
      if (pitch > 50 && pitch < 500) {
        voiceDataRef.current.push({
          pitch,
          time: Date.now() - lastPitchTime,
        });
      }
    }, 100);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      clearInterval(pitchInterval);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const previewUrl = URL.createObjectURL(blob);
      setAudioPreviewUrl(previewUrl);
      setAudioUrl(previewUrl);

      // 녹음 완료 후 자동 전사(서버 STT) — 앱에서 녹음한 경우 별도 업로드 없이 전사됨
      setIsTranscribing(true);
      let transcribedText: string | null = null;
      try {
        const fileForTranscribe = new File([blob], "recording.webm", { type: "audio/webm" });
        transcribedText = await transcribeAudioFile(fileForTranscribe);
        if (transcribedText && transcribedText.trim()) setTranscript(transcribedText.trim());
        else addToast("녹음 내용을 텍스트로 변환하지 못했어요.", "info");
      } catch (err) {
        addToast(getErrorMessage(err), "error");
      } finally {
        setIsTranscribing(false);
      }

      const audioBuffer = await blob.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(audioBuffer);
      const avgPitch = analyzePitch(decoded);
      const detectedSpeaker = detectSpeaker(avgPitch);

      if (transcribedText?.trim()) {
        setVoiceSegments([
          { text: transcribedText.trim(), speaker: detectedSpeaker, startTime: 0 },
        ]);
      } else if (transcript.trim()) {
        setVoiceSegments([
          { text: transcript, speaker: detectedSpeaker, startTime: 0 },
        ]);
      }
    };

    recorder.start();
    setIsRecording(true);

    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (Recognition) {
      const recognition = new Recognition();
      recognition.lang = "ko-KR";
      recognition.continuous = true;
      recognition.interimResults = true;
      let segmentStartTime = Date.now();
      recognition.onresult = (event: { resultIndex: number; results: SpeechRecognitionResultList }) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript + " ";
            const avgPitch = voiceDataRef.current.length > 0
              ? voiceDataRef.current.reduce((sum, d) => sum + d.pitch, 0) / voiceDataRef.current.length
              : 150;
            const speaker = detectSpeaker(avgPitch);
            setVoiceSegments((prev) => [
              ...prev,
              {
                text: result[0].transcript,
                speaker,
                startTime: segmentStartTime,
              },
            ]);
            voiceDataRef.current = [];
            segmentStartTime = Date.now();
          } else {
            interimText += result[0].transcript;
          }
        }
        if (finalText) {
          setTranscript((prev) => `${prev}${finalText}`.trim());
        }
        setInterimTranscript(interimText);
      };
      recognition.start();
      speechRecognitionRef.current = recognition;
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream
      .getTracks()
      .forEach((track) => track.stop());
    speechRecognitionRef.current?.stop();
    audioContextRef.current?.close();
    setInterimTranscript("");
    setIsRecording(false);
  };

  const generateDiary = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const textInput = `${transcript}\n${interimTranscript}`.trim();
      const hasAudio = !!audioUrl || !!audioPreviewUrl;
      
      if (!textInput && uploadedPhotos.length === 0 && !hasAudio) {
        setError("내용을 입력하거나 녹음하거나 사진을 업로드해주세요.");
        setIsGenerating(false);
        return;
      }

      // 사진이 있으면 날짜별로 그룹화, 없으면 현재 날짜로 하나만 생성
      let photosByDate: Record<string, typeof uploadedPhotos> = {};
      
      if (uploadedPhotos.length > 0) {
        // 사진을 날짜별로 그룹화
        uploadedPhotos.forEach((photo) => {
          const photoDate = photo.analysis?.photoDate;
          if (photoDate) {
            if (!photosByDate[photoDate]) {
              photosByDate[photoDate] = [];
            }
            photosByDate[photoDate].push(photo);
          } else {
            // 날짜가 없는 사진은 현재 선택된 날짜에 포함
            const currentDate = date || formatDate(new Date());
            if (!photosByDate[currentDate]) {
              photosByDate[currentDate] = [];
            }
            photosByDate[currentDate].push(photo);
          }
        });

        console.log(`[일기 생성] 사진 ${uploadedPhotos.length}장을 날짜별로 그룹화:`);
        Object.entries(photosByDate).forEach(([d, ps]) => {
          console.log(`  - ${d}: ${ps.length}장`);
        });
      } else {
        // 사진이 없으면 현재 날짜로 하나만 생성
        const currentDate = date || formatDate(new Date());
        photosByDate[currentDate] = [];
        console.log(`[일기 생성] 사진 없음, 현재 날짜(${currentDate})로 일기 생성`);
      }

      // 날짜별로 일기 생성 (각 날짜마다 별도의 일기 생성)
      const diaryPromises = Object.entries(photosByDate).map(async ([photoDate, photos]) => {
        // 해당 날짜의 사진들을 시간순으로 정렬
        const sortedPhotos = [...photos].sort((a, b) => {
          const timeA = a.analysis?.photoTime;
          const timeB = b.analysis?.photoTime;
          if (!timeA && !timeB) return 0;
          if (!timeA) return 1;
          if (!timeB) return -1;
          return timeA.localeCompare(timeB);
        });

        console.log(`[일기 생성] 날짜 ${photoDate}: ${sortedPhotos.length}장의 사진 사용`);

        // 사진 데이터를 JSON 구조로 준비 (시간 정보 강화)
        const photoData = sortedPhotos.map((photo, index) => {
          const analysis = photo.analysis || {};
          let timeStr = null;
          let timeDisplay = null;
          
          if (analysis.photoTime) {
            try {
              const timeObj = new Date(analysis.photoTime);
              const hours = timeObj.getHours();
              const minutes = timeObj.getMinutes();
              timeStr = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
              // 오전/오후 표시 추가
              const period = hours < 12 ? "오전" : "오후";
              const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
              timeDisplay = `${period} ${displayHours}시 ${minutes}분`;
            } catch {
              timeStr = null;
              timeDisplay = null;
            }
          }
          
          // 사진 분석이 실패했어도 기본 정보는 사용
          const caption = analysis.caption || "";
          // "사진 분석에 실패했습니다"나 "사진이 업로드되었습니다" 같은 기본 메시지는 빈 문자열로 처리
          const finalCaption = (caption === "사진 분석에 실패했습니다" || caption === "사진이 업로드되었습니다") ? "" : caption;
          
          return {
            순서: index + 1,
            시간: timeStr || null,
            시간표시: timeDisplay || null, // 오전/오후 형식
            설명: finalCaption,
            활동: analysis.activity && analysis.activity !== "기타" ? analysis.activity : null,
            장소: analysis.location || null,
            인물: analysis.people && analysis.people.length > 0 ? analysis.people : [],
            태그: analysis.tags && analysis.tags.length > 0 ? analysis.tags : [],
          };
        });

        const photoUrls = sortedPhotos.map((p) => p.url).filter(Boolean);
        console.log(`[일기 생성] 날짜 ${photoDate}: ${photoUrls.length}장의 사진으로 일기 생성 시작`);

        // 각 날짜별로 별도의 일기 생성 (텍스트는 공유하되, 사진은 해당 날짜의 것만 사용)
        const response = await fetch("/api/diary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: photos.length > 0 ? "" : (textInput || (audioUrl ? "오디오 녹음본만 첨부되었습니다." : "")), // 사진이 있으면 텍스트 무시, 오디오만 있으면 플레이스홀더
            audioUrl: photos.length > 0 ? "" : audioUrl, // 사진이 있으면 오디오는 무시
            date: photoDate, // 사진에서 추출한 날짜 사용
            location,
            weather,
            members,
            photoUrls: photoUrls, // 해당 날짜의 사진 URL만 전달
            photoData: photos.length > 0 ? JSON.stringify(photoData, null, 2) : undefined, // 구조화된 사진 데이터 (사진이 있을 때만)
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `일기 생성 실패 (${response.status})`);
        }

        return await response.json();
      });

      const results = await Promise.all(diaryPromises);
      
      if (results.length === 0) {
        throw new Error("생성된 일기가 없습니다");
      }

      console.log(`[일기 생성 완료] 총 ${results.length}개의 일기가 생성되었습니다:`, results.map(r => ({ date: r.date, photoCount: r.photoUrls?.length || 0 })));

      // 생성된 일기들을 최신순으로 정렬해서 추가
      const sortedResults = results.sort((a, b) => {
        const dateA = a.date ? new Date(a.date + "T12:00:00").getTime() : new Date(a.createdAt || 0).getTime();
        const dateB = b.date ? new Date(b.date + "T12:00:00").getTime() : new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      setDiaries((prev) => [...sortedResults, ...prev].slice(0, 50));
      setSelectedDiaryId(sortedResults[0].id);

      // 나노바나나 이미지 생성 로직 제거됨 (수동 생성으로 전환)
      if (results.length > 1) {
        addToast(`${results.length}개의 일기가 생성되었어요. 4컷 만화는 일기를 클릭하여 프롬프트를 복사한 후 수동으로 생성해주세요.`, "success");
      } else {
        addToast("일기가 생성되었어요. 4컷 만화는 일기를 클릭하여 프롬프트를 복사한 후 수동으로 생성해주세요.", "success");
      }
      setWriteOpen(false);
      setUploadedPhotos([]);
      setTranscript("");
      setInterimTranscript("");
      setError("");
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("일기 생성 오류:", err);
      addToast(`일기 생성 실패: ${errorMsg}`, "error");
      setError(`일기 생성에 실패했어요: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteDiary = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      const response = await fetch(`/api/diary?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `삭제 실패 (${response.status})`);
      }
      setDiaries((prev) => prev.filter((item) => item.id !== id));
      setSelectedDiaryId((prev) => (prev === id ? null : prev));
      addToast("일기가 삭제되었어요", "success");
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("일기 삭제 오류:", err);
      addToast(`삭제 실패: ${errorMsg}`, "error");
    }
  };

  const loadHighlights = useCallback(async (member: string) => {
    if (highlights[member]) return;
    setLoadingHighlights(true);
    try {
      const response = await fetch(
        `/api/highlights?member=${encodeURIComponent(member)}&period=month`,
      );
      if (response.ok) {
        const data = await response.json();
        setHighlights((prev) => ({
          ...prev,
          [member]: data.highlight,
        }));
      }
    } catch {
      // 무시
    } finally {
      setLoadingHighlights(false);
    }
  }, [highlights]);

  const loadStats = useCallback(async (period = "month") => {
    try {
      const response = await fetch(`/api/stats?period=${period}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch {
      // 무시
    }
  }, []);

  const loadTimeline = useCallback(async (member: string | null = null) => {
    try {
      const url = member
        ? `/api/timeline?member=${encodeURIComponent(member)}`
        : "/api/timeline";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline || []);
      }
    } catch {
      // 무시
    }
  }, []);

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    setError("");

    const total = files.length;
    let firstAnalysisApplied = false;

    try {
      // 모든 파일을 한 번에 업로드
      const formData = new FormData();
      for (let i = 0; i < total; i++) {
        const file = files[i];
        if (file) {
          formData.append("files", file);
          console.log(`[클라이언트] 파일 추가 (${i + 1}/${total}): ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
        }
      }
      formData.append("diaryId", selectedDiaryId || "");
      formData.append("timestamp", new Date().toISOString());

      console.log(`[클라이언트] 사진 일괄 업로드 시작: ${total}개 파일`);

      const response = await fetch("/api/photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.error || `사진 업로드에 실패했어요 (${response.status})`;
        console.error(`[클라이언트] 사진 업로드 실패:`, msg);
        setError(`⚠️ 사진 업로드 실패: ${msg}`);
        setIsUploading(false);
        return;
      }

      const data = await response.json();
      console.log(`[클라이언트] 사진 업로드 응답: ${data.photos?.length || 0}개 성공`);

      const newPhotos = (data.photos || []) as any[];
      if (newPhotos.length === 0) {
        console.warn(`[클라이언트] 업로드 결과가 비어 있습니다.`);
        setError(`⚠️ 업로드된 사진이 없습니다.`);
        setIsUploading(false);
        return;
      }

      // 업로드된 사진 수와 요청한 파일 수 비교
      if (newPhotos.length < total) {
        const failedCount = total - newPhotos.length;
        console.warn(`[클라이언트] 일부 사진 업로드 실패: ${newPhotos.length}/${total}개 성공, ${failedCount}개 실패`);
        setError(`⚠️ ${newPhotos.length}개 업로드 완료 (${failedCount}개 실패)`);
      } else {
        setError("");
      }

      setUploadProgress({ current: newPhotos.length, total: total });

      const photoList = newPhotos.map((p: any, idx: number) => ({
        id: p.id || `photo-${Date.now()}-${idx}-${Math.random()}`,
        url: p.url,
        analysis: p.analysis || {},
      }));

      setUploadedPhotos((prev) => [...prev, ...photoList]);
      console.log(`[클라이언트] 총 업로드된 사진: ${photoList.length}장`);

      // 첫 번째 사진의 EXIF 위치 정보만 사용 (사진 분석 location은 무시)
      if (!firstAnalysisApplied && newPhotos[0]?.analysis) {
        const firstPhoto = newPhotos[0].analysis;
        // EXIF에서 추출한 위치 정보만 사용 (photoLocation이 우선)
        // 사진 분석으로 나온 location은 사용하지 않음
        if (firstPhoto.location) {
          setLocation(firstPhoto.location);
          console.log(`[클라이언트] 위치 설정: ${firstPhoto.location} (EXIF 기반)`);
        }
        // 사진 분석 내용은 대화 텍스트에 자동 입력하지 않음
        // 일기는 사진 데이터만으로 생성됨
        firstAnalysisApplied = true;
      }

      // 얼굴 특징 저장
      if (data.faceFeatures && data.faceFeatures.length > 0) {
        for (const faceData of data.faceFeatures) {
          for (const person of faceData.features) {
            let memberName = "";
            if (
              person.hasBeard === true &&
              person.gender === "남성" &&
              person.age === "성인"
            ) {
              memberName = "아빠";
            } else if (person.gender === "여성" && person.age === "성인") {
              memberName = "엄마";
            } else if (person.age === "아이" && person.gender === "남성") {
              memberName = "아이";
            }

            if (!memberName) continue;

            try {
              await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  member: memberName,
                  features: person,
                  photoUrl: faceData.photoUrl,
                }),
              });
            } catch (err) {
              console.error("프로필 저장 실패:", err);
            }
          }
        }
      }

      // 모든 사진 업로드 완료 후, 모든 업로드된 사진의 날짜를 재계산
      const allUploadedDates: string[] = [];
      photoList.forEach((photo) => {
        if (photo.analysis?.photoDate) {
          allUploadedDates.push(photo.analysis.photoDate);
        }
      });

      if (allUploadedDates.length > 0) {
        // 날짜별 빈도 계산
        const dateCount: Record<string, number> = {};
        allUploadedDates.forEach((d) => {
          dateCount[d] = (dateCount[d] || 0) + 1;
        });

        // 가장 많이 나온 날짜 찾기
        let mostCommonDate = allUploadedDates[0];
        let maxCount = dateCount[allUploadedDates[0]];
        Object.entries(dateCount).forEach(([date, count]) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonDate = date;
          }
        });

        setDate(mostCommonDate);
        console.log(`[최종] 사진 날짜 자동 적용 (${maxCount}/${allUploadedDates.length}장 일치): ${mostCommonDate}`);
        const exifLocation = newPhotos[0]?.analysis?.location;
        if (exifLocation) {
          fetchWeatherByLocationAndDate(exifLocation, mostCommonDate);
        }
      }
    } catch (err: any) {
      console.error("사진 업로드 오류:", err);
      setError(err.message || "사진 업로드 실패");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  useEffect(() => {
    if (activeTab === "stats") {
      loadStats();
    } else if (activeTab === "timeline") {
      loadTimeline(timelineMember);
    }
  }, [activeTab, loadStats, loadTimeline, timelineMember]);

  // 동기부여 정보 로드 (할당량 절약: 일기 목록 로드 후에만, 그리고 덜 자주)
  useEffect(() => {
    // 일기 목록이 없으면 동기부여 정보도 로드하지 않음 (할당량 절약)
    if (diaries.length === 0 && !loadingDiaries) {
      return;
    }
    
    const loadMotivation = async () => {
      try {
        const res = await fetch("/api/motivation");
        if (res.ok) {
          const data = await res.json();
          setMotivation({
            streak: data.streak || 0,
            todayWritten: data.todayWritten || false,
            message: data.message || "",
            badges: data.badges || [],
            thisMonthCount: data.thisMonthCount || 0,
            monthProgress: data.monthProgress || 0,
            daysInMonth: data.daysInMonth || 30,
          });
        }
      } catch (e) {
        console.error("동기부여 정보 로드 실패:", e);
      }
    };
    
    // 초기 로드만 (일기 목록 로드 후)
    if (diaries.length > 0) {
      loadMotivation();
    }
    
    // 주기적 갱신은 5분마다로 변경 (1분 → 5분, 할당량 절약)
    const interval = setInterval(() => {
      if (diaries.length > 0) {
        loadMotivation();
      }
    }, 5 * 60 * 1000); // 5분마다 갱신
    return () => clearInterval(interval);
  }, [diaries.length, loadingDiaries]);

  const selectedDiary = diaries.find((d) => d.id === selectedDiaryId) ?? null;

  return (
    <>
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-2xl">
              우리가족 일기
            </h1>
            <p className="text-sm text-[var(--muted)]">오늘 하루를 그림일기로 정리해요</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[1.1rem] text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--foreground)] transition-colors"
              title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
              aria-label={theme === "light" ? "다크 모드 전환" : "라이트모드 전환"}
            >
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button
              type="button"
              onClick={() => {
                setDate(formatDate(new Date()));
                refreshLocationWeather();
                setWriteOpen(true);
              }}
              className="min-h-[44px] shrink-0 rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
            >
              오늘 기록하기
            </button>
          </div>
        </header>

        {/* 동기부여 배너 */}
        {motivation && !motivation.todayWritten && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-semibold text-amber-900">
                    {motivation.streak > 0 ? `연속 ${motivation.streak}일 기록 중!` : "오늘 하루를 기록해보세요"}
                  </span>
                </div>
                <p className="text-xs text-amber-700">{motivation.message}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDate(formatDate(new Date()));
                  refreshLocationWeather();
                  setWriteOpen(true);
                }}
                className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
              >
                지금 작성하기
              </button>
            </div>
          </div>
        )}
        {motivation && motivation.todayWritten && motivation.streak > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-sm font-semibold text-green-900">
                    연속 {motivation.streak}일 기록 달성!
                  </span>
                  {motivation.badges && motivation.badges.length > 0 && (
                    <>
                      {motivation.badges.includes("7일") && (
                        <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">🏆 1주일</span>
                      )}
                      {motivation.badges.includes("30일") && (
                        <span className="text-xs bg-green-300 text-green-900 px-2 py-0.5 rounded-full font-medium">⭐ 1개월</span>
                      )}
                      {motivation.badges.includes("100일") && (
                        <span className="text-xs bg-yellow-300 text-yellow-900 px-2 py-0.5 rounded-full font-medium">👑 100일</span>
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-green-700 mb-2">{motivation.message}</p>
                {/* 월별 진행률 */}
                {motivation.thisMonthCount !== undefined && motivation.monthProgress !== undefined && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-green-800 mb-1">
                      <span>이번 달 작성일: {motivation.thisMonthCount}일 / {motivation.daysInMonth}일</span>
                      <span className="font-semibold">{motivation.monthProgress}%</span>
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(motivation.monthProgress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { tab: "diary" as const, label: "📝 피드" },
            { tab: "stats" as const, label: "📊 통계" },
            { tab: "timeline" as const, label: "📅 타임라인" },
            { tab: "dashboard" as const, label: "👤 대시보드" },
            { tab: "album" as const, label: "📷 앨범" },
            { tab: "map" as const, label: "🗺️ 지도" },
          ].map(({ tab, label }) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-[40px] shrink-0 rounded-full px-4 text-sm font-medium transition-colors ${
                activeTab === tab ? "bg-amber-500 text-white shadow-sm" : "tab-inactive hover:opacity-90"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "diary" && (
          <>
            {loadingDiaries && (
              <div className="py-12 text-center">
                <p className="text-[var(--muted)]">일기 목록을 불러오는 중...</p>
              </div>
            )}
            {!loadingDiaries && error && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💾</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 mb-2">데이터는 안전합니다!</p>
                    <p className="text-sm text-amber-800 whitespace-pre-line">{error}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoadingDiaries(true);
                          setError("");
                          window.location.reload();
                        }}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                      >
                        다시 시도
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          // 5분 후 자동 재시도
                          setTimeout(() => {
                            setLoadingDiaries(true);
                            setError("");
                            window.location.reload();
                          }, 5 * 60 * 1000);
                          alert("5분 후 자동으로 다시 시도합니다.");
                        }}
                        className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                      >
                        5분 후 자동 재시도
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {!loadingDiaries && diaries.length > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  disabled={regeneratingAllBodies}
                  onClick={async () => {
                    if (!confirm(`지금 보이는 일기 ${diaries.length}개의 본문을 150~300자 어린이 말투로 다시 생성할까요?`)) return;
                    setRegeneratingAllBodies(true);
                    try {
                      const res = await fetch("/api/diary/regenerate-body", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: diaries.map((d) => d.id) }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data.error || "적용 실패");
                      const results = Array.isArray(data.results) ? data.results : [];
                      const ok = results.filter((r: { summary?: string }) => r.summary).length;
                      results.forEach((r: { id: string; summary?: string }) => {
                        if (r.summary) setDiaries((prev) => prev.map((d) => (d.id === r.id ? { ...d, summary: r.summary as string } : d)));
                      });
                      addToast(ok === results.length ? `전체 ${ok}개 일기 본문을 적용했어요.` : `${ok}개 적용, ${results.length - ok}개 실패했어요.`, ok === results.length ? "success" : "info");
                    } catch (e) {
                      addToast(e instanceof Error ? e.message : "적용 실패", "error");
                    } finally {
                      setRegeneratingAllBodies(false);
                    }
                  }}
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  {regeneratingAllBodies ? "적용 중…" : "✏️ 전체 일기 본문 적용 (150~300자)"}
                </button>
              </div>
            )}
            <FeedView
              diaries={diaries}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onCardClick={(diary) => setSelectedDiaryId(diary.id)}
              onDeleteClick={(e, diary) => { e.stopPropagation(); setDeleteConfirmId(diary.id); }}
              deleteConfirmId={deleteConfirmId}
              onConfirmDelete={deleteDiary}
              onCancelDelete={() => setDeleteConfirmId(null)}
              memberColors={memberColors}
            />
          </>
        )}

        {activeTab === "album" && (
          <div className="rounded-3xl bg-white p-6 shadow-warm border border-stone-100">
            <AlbumView diaries={diaries} onOpenDiary={(id) => setSelectedDiaryId(id)} />
          </div>
        )}

        {activeTab === "map" && (
          <MapView
            onOpenDiary={async (id) => {
              if (diaries.some((d) => d.id === id)) {
                setSelectedDiaryId(id);
                return;
              }
              try {
                const res = await fetch(`/api/diary?id=${encodeURIComponent(id)}`);
                if (!res.ok) return;
                const diary = await res.json();
                setDiaries((prev) => [diary, ...prev].slice(0, 50));
                setSelectedDiaryId(id);
              } catch {
                addToast("일기를 불러오지 못했어요", "error");
              }
            }}
          />
        )}

        {activeTab === "stats" && stats && (
          <section className="rounded-3xl bg-[var(--card-bg)] p-6 sm:p-8 shadow-warm border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-6 text-[var(--foreground)]">📊 통계 대시보드</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5">
                <p className="text-sm font-semibold text-stone-600 mb-2">총 일기 수</p>
                <p className="text-3xl font-bold text-amber-700">{stats.totalDiaries}</p>
              </div>
              <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5">
                <p className="text-sm font-semibold text-stone-600 mb-2">평균 기분 점수</p>
                <p className="text-3xl font-bold text-amber-600">
                  {stats.moodScores.length > 0
                    ? (stats.moodScores.reduce((a: number, b: number) => a + b, 0) / stats.moodScores.length).toFixed(1)
                    : "0"}
          </p>
        </div>
              <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5">
                <p className="text-sm font-semibold text-stone-600 mb-2">인기 키워드</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(stats.totalKeywords)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([kw, count]) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
                      >
                        #{kw} ({count})
                      </span>
                    ))}
                </div>
              </div>
              <div className="rounded-2xl bg-amber-50/50 border border-amber-100 p-5">
                <p className="text-sm font-semibold text-stone-600 mb-2">자주 간 장소</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(stats.locations)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 5)
                    .map(([loc, count]) => (
                      <span
                        key={loc}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
                      >
                        📍 {loc} ({count})
                      </span>
                    ))}
                </div>
              </div>
              {Object.keys(stats.members).length > 0 && (
                <div className="md:col-span-2 rounded-2xl bg-amber-50/30 border border-amber-100 p-5">
                  <p className="text-sm font-semibold text-stone-700 mb-3">가족 구성원별 통계</p>
                  <div className="grid gap-3">
                    {Object.entries(stats.members).map(([name, data]: [string, any]) => (
                      <div key={name} className="rounded-2xl bg-white border border-stone-100 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className={`font-medium inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                            memberColors[name] === "pink" ? "bg-pink-100 text-pink-700" :
                            memberColors[name] === "blue" ? "bg-blue-100 text-blue-700" :
                            memberColors[name] === "yellow" ? "bg-yellow-100 text-yellow-700" :
                            "bg-amber-100 text-amber-800"
                          }`}>
                            {name === "엄마" ? "👩" : name === "아빠" ? "👨" : name === "아이" ? "👶" : "👤"} {name}
                          </p>
                          <span className="text-sm text-stone-600">일기 {data.count}개 · 평균 기분 {data.totalMood.toFixed(1)}</span>
                        </div>
                        {Object.keys(data.keywords).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {Object.entries(data.keywords)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .slice(0, 5)
                              .map(([kw, count]: [string, any]) => (
                                <span
                                  key={kw}
                                  className="text-xs text-stone-500"
                                >
                                  #{kw} ({count})
                                </span>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 월별/연도별 요약 리포트 */}
            <div className="mt-8 pt-8 border-t border-amber-100">
              <h3 className="text-base font-semibold text-stone-900 mb-4">📋 월별/연도별 요약 리포트</h3>
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-stone-600">기간</span>
                  <select
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value as "month" | "year")}
                    className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  >
                    <option value="month">월별</option>
                    <option value="year">연도별</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-stone-600">연도</span>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={reportYear}
                    onChange={(e) => setReportYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                    className="w-24 rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  />
                </label>
                {reportPeriod === "month" && (
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-stone-600">월</span>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                      className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m}월</option>
                      ))}
                    </select>
                  </label>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setReportLoading(true);
                    setReportData(null);
                    try {
                      const params = new URLSearchParams({
                        period: reportPeriod,
                        year: String(reportYear),
                      });
                      if (reportPeriod === "month") params.set("month", String(reportMonth));
                      const res = await fetch(`/api/report?${params}`);
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || "리포트 조회 실패");
                      }
                      const data = await res.json();
                      setReportData({
                        period: data.period,
                        year: data.year,
                        month: data.month,
                        diaryCount: data.diaryCount,
                        stats: {
                          avgMood: data.stats?.avgMood ?? 0,
                          topKeywords: data.stats?.topKeywords ?? [],
                          topLocations: data.stats?.topLocations ?? [],
                        },
                        summary: data.summary ?? "",
                      });
                    } catch (e) {
                      addToast(getErrorMessage(e), "error");
                    } finally {
                      setReportLoading(false);
                    }
                  }}
                  disabled={reportLoading}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {reportLoading ? "요약 생성 중…" : "요약 보기"}
                </button>
              </div>
              {reportData && (
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5 space-y-4">
                  <p className="text-sm font-semibold text-amber-900">
                    {reportData.period === "month"
                      ? `${reportData.year}년 ${reportData.month}월`
                      : `${reportData.year}년`}{" "}
                    · 일기 {reportData.diaryCount}개 · 평균 기분 {reportData.stats.avgMood.toFixed(1)}점
                  </p>
                  {reportData.stats.topKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {reportData.stats.topKeywords.slice(0, 8).map((kw) => (
                        <span key={kw} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          #{kw.replace(/\(\d+\)$/, "").trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  {reportData.stats.topLocations.length > 0 && (
                    <p className="text-xs text-stone-600">
                      📍 {reportData.stats.topLocations.map((s) => s.replace(/\(\d+\)$/, "").trim()).join(", ")}
                    </p>
                  )}
                  <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{reportData.summary}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "timeline" && (
          <section className="rounded-3xl bg-[var(--card-bg)] p-6 sm:p-8 shadow-warm border border-[var(--border)]">
            <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">📅 타임라인</h2>
            <div className="mb-6">
              <label className="text-sm font-medium text-[var(--foreground)] mb-2 block">
                구성원 필터
              </label>
              <select
                value={timelineMember ?? ""}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setTimelineMember(v);
                  loadTimeline(v);
                }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
              >
                <option value="">전체</option>
                {members.map((m) => (
                  <option key={m} value={m}>
                    {m === "엄마" ? "👩" : m === "아빠" ? "👨" : m === "아이" ? "👶" : "👤"} {m}
                  </option>
                ))}
              </select>
            </div>
            {timeline.length === 0 ? (
              <p className="py-8 text-center text-[var(--muted)] text-sm">
                {timelineMember ? `${timelineMember}님의 타임라인 데이터가 없어요.` : "타임라인 데이터가 없어요."}
              </p>
            ) : (
              (() => {
                const byYear: Record<string, Record<string, TimelineEntry[]>> = {};
                timeline.forEach((item) => {
                  const y = (item.date || "").slice(0, 4) || "없음";
                  const m = (item.date || "").slice(5, 7) || "00";
                  if (!byYear[y]) byYear[y] = {};
                  if (!byYear[y][m]) byYear[y][m] = [];
                  byYear[y][m].push(item);
                });
                const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
                return (
                  <div className="space-y-8">
                    {years.map((year) => (
                      <div key={year}>
                        <h3 className="text-base font-bold text-amber-700 dark:text-amber-400 mb-4">
                          {timelineMember ? `${timelineMember}님의 ${year}년` : `${year}년`}
                        </h3>
                        <div className="space-y-6">
                          {Object.keys(byYear[year])
                            .sort((a, b) => b.localeCompare(a))
                            .map((month) => (
                              <div key={month}>
                                <p className="text-xs font-semibold text-[var(--muted)] mb-2">
                                  {parseInt(month, 10)}월
                                </p>
                                <div className="space-y-3">
                                  {byYear[year][month].map((item) => (
                                    <button
                                      type="button"
                                      key={item.id}
                                      onClick={async () => {
                                        if (diaries.some((d) => d.id === item.id)) {
                                          setSelectedDiaryId(item.id);
                                          return;
                                        }
                                        try {
                                          const res = await fetch(`/api/diary?id=${encodeURIComponent(item.id)}`);
                                          if (!res.ok) return;
                                          const diary = await res.json();
                                          setDiaries((prev) => [diary, ...prev].slice(0, 50));
                                          setSelectedDiaryId(item.id);
                                        } catch {
                                          addToast("일기를 불러오지 못했어요", "error");
                                        }
                                      }}
                                      className="w-full rounded-2xl border border-amber-100 dark:border-stone-600 bg-amber-50/30 dark:bg-stone-800/50 p-4 sm:p-5 text-left hover:border-amber-200 dark:hover:border-amber-600 transition"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400" suppressHydrationWarning>
                                          {mounted ? formatDisplayDate(item.date) : item.date}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-[var(--muted)]">📍 {item.location}</span>
                                          <span className="text-xs text-[var(--muted)]">☁️ {item.weather}</span>
                                        </div>
                                      </div>
                                      <h3 className="font-semibold text-[var(--foreground)] mb-1">{item.title}</h3>
                                      <p className="text-sm text-[var(--muted)] line-clamp-2">{item.summary}</p>
                                      {item.keywords && item.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                          {item.keywords.slice(0, 4).map((kw: string) => (
                                            <span key={kw} className="text-xs text-[var(--muted)]">
                                              #{kw}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </section>
        )}

        {activeTab === "dashboard" && (
          <section className="rounded-3xl bg-white p-6 sm:p-8 shadow-warm border border-stone-100">
            <div className="mb-6">
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                구성원 선택
              </label>
              <select
                value={selectedMember || ""}
                onChange={(e) => setSelectedMember(e.target.value || null)}
                className="rounded-2xl border border-stone-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
              >
                <option value="">전체</option>
                {members.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <Dashboard
              selectedMember={selectedMember}
              diaries={diaries}
              stats={stats}
              memberColors={memberColors}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/backup");
                    if (!response.ok) throw new Error("백업 실패");
                    const data = await response.json();
                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    alert(`백업 실패: ${getErrorMessage(err)}`);
                  }
                }}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                💾 백업 다운로드
              </button>
              <label className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer transition">
                📥 백업 복원
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        const response = await fetch("/api/backup", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(data),
                        });
                        if (response.ok) {
                          alert("복원 완료!");
                          window.location.reload();
                        } else {
                          throw new Error("복원 실패");
                        }
                      } catch (err) {
                        alert(`복원 실패: ${getErrorMessage(err)}`);
                      }
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/summary?period=week");
                    if (!response.ok) throw new Error("요약 생성 실패");
                    const data = await response.json();
                    alert(`주간 요약:\n\n${data.summary}`);
                  } catch (err) {
                    alert(`요약 생성 실패: ${getErrorMessage(err)}`);
                  }
                }}
                className="rounded-2xl border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                📄 주간 요약
              </button>
        </div>
          </section>
        )}
      </main>
    </div>

    <WriteModal open={writeOpen} onClose={() => setWriteOpen(false)}>
      <div
        className="grid gap-5"
        onPaste={async (e) => {
          const files = e.clipboardData?.files;
          if (!files?.length) return;
          const file = Array.from(files).find((f) => f.type.startsWith("audio/"));
          if (!file) return;
          e.preventDefault();
          const url = URL.createObjectURL(file);
          setAudioPreviewUrl(url);
          setAudioUrl(url);
          addToast("오디오를 붙여넣었어요", "success");
          if (uploadedPhotos.length === 0) {
            if (!date) setDate(formatDate(new Date()));
            if (!location || location.startsWith("위치 확인") || !weather || weather.startsWith("날씨 확인")) {
              refreshLocationWeather();
            }
          }
          setIsTranscribing(true);
          try {
            const text = await transcribeAudioFile(file);
            if (text) setTranscript(text);
            else addToast("녹음 내용을 텍스트로 변환하지 못했어요.", "info");
          } catch (err) {
            addToast(getErrorMessage(err), "error");
          } finally {
            setIsTranscribing(false);
          }
        }}
      >
        <span className="text-xs text-stone-500">Chrome 권장 · 오디오는 Ctrl+V(붙여넣기) 또는 아래 버튼으로 추가</span>
        <label className="grid gap-2 text-sm font-medium text-stone-700 mt-1">
          날짜
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-2xl border border-stone-200 px-4 py-3 text-sm flex-1 min-w-0"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onBlur={(e) => {
                const loc = location?.trim();
                const d = (e.target as HTMLInputElement).value?.trim() || date;
                if (loc && loc.length >= 2 && !loc.startsWith("위치") && d) {
                  fetchWeatherByLocationAndDate(loc, d || undefined);
                }
              }}
            />
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const d = formatDate(new Date());
                  setDate(d);
                  const loc = location?.trim();
                  if (loc && loc.length >= 2 && !loc.startsWith("위치")) {
                    fetchWeatherByLocationAndDate(loc, d);
                  } else {
                    refreshLocationWeather();
                  }
                }}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                오늘
              </button>
              <button
                type="button"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const d = formatDate(yesterday);
                  setDate(d);
                  const loc = location?.trim();
                  if (loc && loc.length >= 2 && !loc.startsWith("위치")) {
                    fetchWeatherByLocationAndDate(loc, d);
                  } else {
                    refreshLocationWeather(d);
                  }
                }}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100"
              >
                어제
              </button>
            </div>
          </div>
          {date && <span className="text-xs text-stone-500" suppressHydrationWarning>{mounted ? formatDisplayDate(date) : date}</span>}
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700 mt-2">
          가족 구성원 (쉼표로 구분)
          <input className="rounded-2xl border border-stone-200 px-4 py-3 text-sm" value={membersInput} onChange={(e) => setMembersInput(e.target.value)} />
        </label>
        <div className="grid gap-5 rounded-2xl bg-amber-50/50 border border-amber-100 px-4 py-5 text-sm text-stone-600 mt-2">
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">장소</span>
            <input
              className="w-60 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-right text-xs"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onBlur={(e) => {
                const loc = (e.target as HTMLInputElement).value?.trim();
                if (loc && loc.length >= 2 && !loc.startsWith("위치")) {
                  fetchWeatherByLocationAndDate(loc, date || undefined);
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-amber-100 pt-4">
            <span className="font-medium">날씨</span>
            <input className="w-60 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-right text-xs" value={weather} onChange={(e) => setWeather(e.target.value)} />
          </div>
          <button
          type="button"
          className="self-end text-xs font-medium text-amber-700 mt-1"
          onClick={async () => {
            const loc = location?.trim();
            const useDate = date || formatDate(new Date());
            if (loc && loc.length >= 2 && !loc.startsWith("위치")) {
              await fetchWeatherByLocationAndDate(loc, useDate);
              addToast("선택한 날짜·장소 기준으로 날씨를 불러왔어요", "success");
            } else {
              refreshLocationWeather();
            }
          }}
        >
          위치/날씨 다시 불러오기
        </button>
        </div>
        <div
          className={`flex flex-wrap items-center gap-2 rounded-2xl px-2 py-2 transition-colors ${
            isDraggingNewAudio ? "border-2 border-amber-400 bg-amber-50/80" : ""
          }`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              if (!isDraggingNewAudio) setIsDraggingNewAudio(true);
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
              setIsDraggingNewAudio(false);
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setIsDraggingNewAudio(false);
              const files = Array.from(e.dataTransfer.files);
              const audioFile = files.find((file) => file.type.startsWith("audio/"));
              if (audioFile) {
                void handleNewAudioFile(audioFile);
              } else if (files.length > 0) {
                addToast("오디오 파일만 넣을 수 있어요.", "error");
              }
            }
          }}
        >
          <button
            type="button"
            className="min-h-[44px] rounded-2xl bg-stone-800 px-5 py-2.5 text-sm font-semibold text-white disabled:bg-stone-400"
            onClick={startRecording}
            disabled={isRecording}
          >
            녹음 시작
          </button>
          <button
            type="button"
            className="min-h-[44px] rounded-2xl border border-stone-300 px-5 py-2.5 text-sm font-semibold"
            onClick={stopRecording}
            disabled={!isRecording}
          >
            녹음 종료
          </button>
          <input
            ref={audioFileInputRef}
            type="file"
            accept="audio/*"
            capture={true}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleNewAudioFile(file);
              }
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="min-h-[44px] rounded-2xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            onClick={() => audioFileInputRef.current?.click()}
          >
            🎤 오디오 파일 넣기
          </button>
          {typeof window !== "undefined" && "showOpenFilePicker" in window && (
            <button
              type="button"
              className="min-h-[44px] rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50"
              onClick={async () => {
                try {
                  const handles = await (window as any).showOpenFilePicker({
                    multiple: false,
                    types: [
                      {
                        description: "오디오",
                        accept: {
                          "audio/*": [".m4a", ".mp3", ".wav", ".ogg", ".webm"],
                        },
                      },
                    ],
                  });
                  const file = handles?.[0] ? await handles[0].getFile() : null;
                  if (file) {
                    void handleNewAudioFile(file);
                  }
                } catch (err) {}
              }}
            >
              🔎 기기에서 녹음 찾기
            </button>
          )}
          <span className="text-sm text-stone-500">
            {isRecording
              ? "녹음 중..."
              : isTranscribing
              ? "녹음 내용 불러오는 중..."
              : audioPreviewUrl
              ? "녹음 준비 완료"
              : isDraggingNewAudio
              ? "🎤 여기에 녹음 파일을 놓아주세요"
              : "오디오 없음"}
          </span>
        </div>
        {audioPreviewUrl && <audio className="w-full" controls src={audioPreviewUrl} />}
        <div>
          <span className="text-sm font-medium">사진 (선택, 여러 장)</span>
          <input type="file" accept="image/*" multiple className="hidden" id="photo-upload-modal" onChange={(e) => { const f = e.target.files; if (f?.length) handlePhotoUpload(f).then(() => { e.target.value = ""; }); }} disabled={isUploading} />
          <label htmlFor="photo-upload-modal" className={`mt-2 flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 text-sm ${isUploading ? "border-stone-200 bg-stone-50 text-stone-400" : "border-amber-300 bg-amber-50/80 text-amber-800"}`}>
            {isUploading && uploadProgress ? `업로드 중 ${uploadProgress.current}/${uploadProgress.total}` : "📷 사진 선택"}
          </label>
          {uploadedPhotos.length > 0 && <p className="mt-1 text-xs text-amber-700">✅ {uploadedPhotos.length}장</p>}
        </div>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          대화 텍스트
          <textarea className="min-h-[120px] rounded-2xl border border-stone-200 px-4 py-3 text-sm" value={`${transcript}${interimTranscript ? `\n${interimTranscript}` : ""}`} onChange={(e) => setTranscript(e.target.value)} placeholder="녹음하면 자동으로 들어와요. 오디오 파일이나 사진만 넣었어도 일기 자동 생성 버튼을 누를 수 있어요." />
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button type="button" className="min-h-[48px] rounded-2xl bg-amber-500 px-6 py-3 text-sm font-semibold text-white disabled:bg-amber-300 disabled:cursor-not-allowed" onClick={generateDiary} disabled={(!transcript.trim() && uploadedPhotos.length === 0 && !audioPreviewUrl) || isGenerating || (!!audioPreviewUrl && isTranscribing)}>
          {isGenerating ? "일기 생성 중..." : audioPreviewUrl && isTranscribing ? "전사 중... 잠시만요" : "일기 자동 생성"}
        </button>
      </div>
    </WriteModal>

    {selectedDiary && (
      <ReadFullScreen
        diary={selectedDiary}
        memberColors={memberColors}
        onClose={() => setSelectedDiaryId(null)}
        onEdit={(d, section) => {
          setEditingDiary(d);
          setEditingSection(section ?? "all");
        }}
        onShareLink={async (id) => { try { const r = await fetch(`/api/share?id=${id}`); const d = await r.json(); if (d.shareUrl) { await navigator.clipboard.writeText(d.shareUrl); addToast("공유 링크가 복사되었어요", "success"); } } catch { addToast("복사 실패", "error"); } }}
        onShareQR={async (id) => { try { const r = await fetch(`/api/share?id=${id}`); const d = await r.json(); if (d.qrCodeUrl) window.open(d.qrCodeUrl, "_blank"); } catch { addToast("QR 생성 실패", "error"); } }}
        onPDF={(id) => window.open(`/api/pdf?id=${encodeURIComponent(id)}`, "_blank")}
        highlights={highlights}
        onLoadHighlights={loadHighlights}
        onKeywordClick={(keyword) => { setSearchQuery(keyword); setActiveTab("diary"); setSelectedDiaryId(null); }}
        similarDiaries={similarDiaries}
        onOpenDiary={(d) => {
          setSelectedDiaryId(d.id);
          setDiaries((prev) => (prev.some((x) => x.id === d.id) ? prev : [d, ...prev]));
        }}
        onCustomImageUploaded={(diaryId, customImageUrl) => {
          setDiaries((prev) => prev.map((d) => (d.id === diaryId ? { ...d, customImageUrl } : d)));
          setEditingDiary((prev) => (prev?.id === diaryId ? { ...prev, customImageUrl } : prev));
          addToast("그림이 적용되었어요. PDF/책에서는 이 그림이 표시돼요.", "success");
        }}
        onSaveLocationWeather={(diaryId, location, weather) => {
          setDiaries((prev) => prev.map((d) => (d.id === diaryId ? { ...d, location, weather } : d)));
          setEditingDiary((prev) => (prev?.id === diaryId ? { ...prev, location, weather } : prev));
          addToast("장소·날씨가 저장되었어요.", "success");
        }}
        onPatchDiary={(diaryId, patch) => {
          setDiaries((prev) => prev.map((d) => (d.id === diaryId ? { ...d, ...patch } : d)));
          setEditingDiary((prev) => (prev?.id === diaryId ? { ...prev, ...patch } : prev));
        }}
      />
    )}

    {editingDiary && (
      <EditDiaryModal
        diary={editingDiary}
        section={editingSection ?? "all"}
        onSave={async (id, payload) => {
          const res = await fetch("/api/diary", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "수정 실패");
          }
          const updated = await res.json();
          
          // 본문(summary) 수정 시 자동으로 quote와 timeline 재생성
          if (payload.summary && editingSection === "summary") {
            try {
              const regenerateRes = await fetch("/api/diary/regenerate-quote-timeline", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ diaryId: id }),
              });
              if (regenerateRes.ok) {
                const regenerateData = await regenerateRes.json();
                Object.assign(updated, {
                  quote: regenerateData.quote,
                  timeline: regenerateData.timeline,
                });
                addToast("본문과 함께 '오늘의 한 문장'과 '오늘 있었던 일'도 자동으로 재생성되었어요", "success");
              }
            } catch (err) {
              console.error("quote/timeline 재생성 실패:", err);
              // 재생성 실패해도 본문 수정은 성공했으므로 계속 진행
            }
          }
          
          setDiaries((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
          if (!payload.summary || editingSection !== "summary") {
            addToast("일기가 수정되었어요", "success");
          }
          setEditingDiary(null);
          setEditingSection(null);
        }}
        onClose={() => {
          setEditingDiary(null);
          setEditingSection(null);
        }}
      />
    )}

    <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
