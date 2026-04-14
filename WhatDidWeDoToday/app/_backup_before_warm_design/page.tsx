"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DiaryEntry, VoiceSegment, UploadedPhoto, TabType, StatsData, TimelineEntry } from "@/lib/types";
import { formatDisplayDate, formatDate, getErrorMessage, weatherMap } from "@/lib/utils";
import Dashboard from "@/components/Dashboard";

// 유틸리티 함수는 lib/utils.ts로 이동됨

function DiaryImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
  return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-zinc-100 text-xs text-zinc-400">
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
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

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadDiaries = async () => {
      try {
        const response = await fetch("/api/diary", {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
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
          setDiaries(sorted);
          // 첫 화면은 리스트만 보이도록 (상세 정보 기본 노출 제거)
          setSelectedDiaryId(null);
        }
      } catch {
        // 네트워크/개발서버 재시작 중에는 무시
      }
    };

    loadDiaries();

    return () => {
      isMounted = false;
      controller.abort();
    };
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

  const refreshLocationWeather = useCallback(async () => {
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
            `https://api.open-meteo.com/v1/forecast?latitude=${ipLat}&longitude=${ipLon}&current=temperature_2m,weather_code`,
          );
          const weatherData = await weatherRes.json();
          const code = weatherData?.current?.weather_code;
          const temp = weatherData?.current?.temperature_2m;
          const label = weatherMap[code] ?? "날씨 정보";
          setWeather(
            typeof temp === "number"
              ? `${label} · ${temp}°C`
              : label,
          );
        }
      } catch {
        setLocation("위치 사용 불가");
        setWeather("날씨 사용 불가");
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
            setLocation("알 수 없음");
          }

          const weatherRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
          );
          if (!weatherRes.ok) {
            throw new Error("weather failed");
          }
          const weatherData = await weatherRes.json();
          const code = weatherData?.current?.weather_code;
          const temp = weatherData?.current?.temperature_2m;
          const label = weatherMap[code] ?? "날씨 정보";
          setWeather(
            typeof temp === "number"
              ? `${label} · ${temp}°C`
              : label,
          );
        } catch {
          setLocation("위치 확인 실패");
          setWeather("날씨 확인 실패");
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
              setLocation("위치 사용 불가");
            }
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${ipLat}&longitude=${ipLon}&current=temperature_2m,weather_code`,
            );
            const weatherData = await weatherRes.json();
            const code = weatherData?.current?.weather_code;
            const temp = weatherData?.current?.temperature_2m;
            const label = weatherMap[code] ?? "날씨 정보";
            setWeather(
              typeof temp === "number"
                ? `${label} · ${temp}°C`
                : label,
            );
          } else {
            setWeather("날씨 사용 불가");
          }
        } catch {
          setLocation("위치 사용 불가");
          setWeather("날씨 사용 불가");
        }
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    setMounted(true);
    setDate(formatDate(new Date()));
    refreshLocationWeather();
  }, [refreshLocationWeather]);

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

      const audioBuffer = await blob.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(audioBuffer);
      const avgPitch = analyzePitch(decoded);
      const detectedSpeaker = detectSpeaker(avgPitch);

      if (transcript.trim()) {
        setVoiceSegments([
          {
            text: transcript,
            speaker: detectedSpeaker,
            startTime: 0,
          },
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
      recognition.onresult = (event: SpeechRecognitionEvent) => {
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
      
      if (!textInput && uploadedPhotos.length === 0) {
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
            transcript: photos.length > 0 ? "" : textInput, // 사진이 있으면 텍스트는 무시 (사진 내용만 사용), 없으면 텍스트 사용
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
      
      // 여러 일기가 생성되었을 때 사용자에게 알림
      if (results.length > 1) {
        const dateList = results.map(r => r.date).join(", ");
        setError(`✅ ${results.length}개의 일기가 생성되었습니다 (날짜: ${dateList})`);
      }
      
      // 일기 생성 후 업로드된 사진 초기화
      setUploadedPhotos([]);
      setTranscript("");
      setInterimTranscript("");
      setError("");
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("일기 생성 오류:", err);
      setError(`일기 생성에 실패했어요: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteDiary = async (id: string) => {
    if (!confirm("정말 이 일기를 삭제하시겠어요?")) {
      return;
    }
    
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
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      console.error("일기 삭제 오류:", err);
      setError(`삭제에 실패했어요: ${errorMsg}`);
    }
  };

  const selectedDiary =
    diaries.find((diary) => diary.id === selectedDiaryId) ?? null;

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

  const loadTimeline = useCallback(async () => {
    try {
      const response = await fetch("/api/timeline");
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
      loadTimeline();
    }
  }, [activeTab, loadStats, loadTimeline]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10">
        <header className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-zinc-500">
            우리가족 일기 자동생성
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            오늘 하루를 그림일기로 정리해요
          </h1>
          <p className="max-w-2xl text-base text-zinc-600">
            가족이 말한 대화를 그대로 정리해서 요약과 감성 카드로
            만들어줘요.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("diary")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === "diary"
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              📝 일기
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stats")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === "stats"
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              📊 통계
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === "timeline"
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              📅 타임라인
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === "dashboard"
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              👤 대시보드
            </button>
          </div>
        </header>

        {activeTab === "diary" && (
        <section className="grid gap-6 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">오늘 기록 입력</h2>
              <span className="text-xs text-zinc-500">
                Chrome 권장
              </span>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                날짜
                <input
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
                {date && (
                  <span className="text-xs text-zinc-500" suppressHydrationWarning>
                    {mounted ? formatDisplayDate(date) : date}
                  </span>
                )}
              </label>
              <label className="grid gap-2 text-sm font-medium">
                가족 구성원 (쉼표로 구분)
                <input
                  className="rounded-xl border border-zinc-200 px-4 py-3 text-sm"
                  value={membersInput}
                  onChange={(event) => setMembersInput(event.target.value)}
                />
              </label>
              <div className="grid gap-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <div className="flex items-center justify-between gap-2">
                  <span>장소</span>
                  <input
                    className="w-60 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-right text-xs text-zinc-900"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>날씨</span>
                  <input
                    className="w-60 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-right text-xs text-zinc-900"
                    value={weather}
                    onChange={(event) => setWeather(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="mt-1 self-end text-xs font-medium text-emerald-600"
                  onClick={refreshLocationWeather}
                >
                  위치/날씨 다시 불러오기
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  className="rounded-full bg-zinc-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white disabled:bg-zinc-400"
                  onClick={startRecording}
                  disabled={isRecording}
                >
                  녹음 시작
                </button>
                <button
                  className="rounded-full border border-zinc-300 px-4 py-2 text-xs sm:text-sm font-semibold disabled:opacity-50"
                  onClick={stopRecording}
                  disabled={!isRecording}
                >
                  녹음 종료
                </button>
                <span className="text-xs sm:text-sm text-zinc-500">
                  {isRecording
                    ? "녹음 중..."
                    : audioPreviewUrl
                    ? "녹음 준비 완료"
                    : "오디오 없음"}
                </span>
              </div>
              {audioPreviewUrl && (
                <audio
                  className="w-full"
                  controls
                  src={audioPreviewUrl}
                />
              )}

              <div className="grid gap-2 text-sm font-medium">
                <span>사진 업로드 (선택, 여러 장 가능)</span>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    id="photo-upload"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        console.log("선택된 파일 수:", files.length);
                        // 비동기로 업로드 시작 (await 없이)
                        handlePhotoUpload(files).then(() => {
                          // 업로드 완료 후 input 초기화
                          e.target.value = "";
                        }).catch(() => {
                          // 에러 발생 시에도 input 초기화
                          e.target.value = "";
                        });
                      }
                    }}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="photo-upload"
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm cursor-pointer transition ${
                      isUploading
                        ? "border-zinc-300 bg-zinc-50 text-zinc-400"
                        : "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {isUploading ? "업로드 중..." : "📷 사진 선택 (여러 장 가능)"}
                  </label>
                </div>
                {isUploading && uploadProgress && (
                  <div className="mt-2 text-xs text-emerald-600 font-medium">
                    ⏳ 사진 업로드 중... {uploadProgress.current}/{uploadProgress.total} ({(uploadProgress.current / uploadProgress.total * 100).toFixed(0)}%)
                  </div>
                )}
                {uploadedPhotos.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-emerald-600 mb-2 font-medium">
                      ✅ {uploadedPhotos.length}장 업로드 완료
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {uploadedPhotos.map((photo, index) => {
                        console.log(`[썸네일 렌더링] ${index + 1}/${uploadedPhotos.length}: ${photo.id} - ${photo.url?.substring(0, 50)}...`);
                        return (
                        <div key={photo.id} className="relative rounded-lg overflow-hidden border-2 border-emerald-300 bg-emerald-50 shadow-sm">
                          <img
                            src={photo.url}
                            alt="Uploaded"
                            className="w-full h-20 object-cover"
                            style={{ imageOrientation: 'from-image' }}
                            onError={(e) => {
                              console.error("이미지 로드 실패:", photo.url);
                              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3E이미지 없음%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedPhotos((prev) => prev.filter((p) => p.id !== photo.id));
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 shadow-sm z-10"
                            title="삭제"
                          >
                            ×
                          </button>
                          {photo.analysis && photo.analysis.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1 line-clamp-1">
                              {photo.analysis.caption}
        </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <label className="grid gap-2 text-sm font-medium">
                대화 텍스트
                <textarea
                  className="min-h-[140px] rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                  value={`${transcript}${
                    interimTranscript ? `\n${interimTranscript}` : ""
                  }`}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="녹음하면 자동으로 텍스트가 들어와요. 필요하면 수정하세요."
                />
                {voiceSegments.length > 0 && (
                  <div className="mt-2 rounded-xl bg-zinc-50 p-3 text-xs">
                    <p className="mb-2 font-semibold text-zinc-700">화자 분석 결과 (수정 가능):</p>
                    <div className="space-y-2">
                      {voiceSegments.map((seg, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <select
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border-0 focus:ring-1 focus:ring-emerald-300"
                            value={seg.speaker}
                            onChange={(e) => {
                              const updated = [...voiceSegments];
                              updated[idx].speaker = e.target.value;
                              setVoiceSegments(updated);
                            }}
                          >
                            <option value="엄마">👩 엄마</option>
                            <option value="아빠">👨 아빠</option>
                            <option value="아이">👶 아이</option>
                          </select>
                          <input
                            type="text"
                            className="flex-1 rounded-lg border border-zinc-200 bg-white px-2 py-0.5 text-zinc-600 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            value={seg.text}
                            onChange={(e) => {
                              const updated = [...voiceSegments];
                              updated[idx].text = e.target.value;
                              setVoiceSegments(updated);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </label>
              {error && (
                <p className="text-sm text-rose-600">{error}</p>
              )}
              <button
                className="mt-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white disabled:bg-emerald-300"
                onClick={generateDiary}
                disabled={(!transcript.trim() && uploadedPhotos.length === 0) || isGenerating}
              >
                {isGenerating ? "일기 생성 중..." : "일기 자동 생성"}
              </button>
        </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">최근 일기</h2>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="날짜, 키워드, 장소 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {diaries.length === 0 && (
                <p className="text-sm text-zinc-500">
                  아직 생성된 일기가 없어요.
                </p>
              )}
              {diaries
                .filter((diary) => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  const dateStr = formatDisplayDate(diary.date).toLowerCase();
                  const locationStr = diary.location?.toLowerCase() || "";
                  const keywordsStr = (diary.keywords || []).join(" ").toLowerCase();
                  const summaryStr = diary.summary?.toLowerCase() || "";
                  const titleStr = diary.title?.toLowerCase() || "";
                  
                  return (
                    dateStr.includes(query) ||
                    locationStr.includes(query) ||
                    keywordsStr.includes(query) ||
                    summaryStr.includes(query) ||
                    titleStr.includes(query)
                  );
                })
                .map((diary) => (
                <div key={diary.id} className="grid gap-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDiaryId((prev) =>
                          prev === diary.id ? null : diary.id,
                        )
                      }
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        diary.id === selectedDiaryId
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-zinc-100 bg-zinc-50 hover:border-zinc-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100" suppressHydrationWarning>
                          <span className="text-emerald-500">📅</span>
                          {mounted ? formatDisplayDate(diary.date) : diary.date}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-amber-700 shadow-sm ring-1 ring-amber-100">
                          <span className="text-amber-500">📍</span>
                          {diary.location}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-sky-700 shadow-sm ring-1 ring-sky-100">
                          <span className="text-sky-500">☁️</span>
                          {diary.weather}
                        </span>
                      </div>
                      {(diary.keywords ?? []).length > 0 && (
                        <div className="mt-2 flex items-center justify-end">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs">
                            {(diary.keywords ?? []).slice(0, 4).map((keyword, idx) => (
                              <span
                                key={`${diary.id}-${keyword}`}
                                className="font-semibold text-emerald-700"
                              >
                                #{keyword}
                                {idx < Math.min((diary.keywords ?? []).length, 4) - 1 && (
                                  <span className="mx-1 text-emerald-400">·</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDiary(diary.id)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 shadow-sm"
                      aria-label="삭제"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      selectedDiaryId === diary.id
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <article className="rounded-3xl border border-zinc-100 bg-zinc-50 p-5">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1" suppressHydrationWarning>
                          <span>📅</span>
                          {mounted ? formatDisplayDate(diary.date) : diary.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span>☁️</span>
                          {diary.weather}
                        </span>
                      </div>
                      {diary.quote && (
                        <div className="mt-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
                          <p className="text-sm font-semibold text-amber-900 inline-flex items-center gap-1.5 mb-1">
                            <span>💫</span>
                            오늘의 한 문장
                          </p>
                          <p className="text-sm text-amber-800 leading-relaxed italic">
                            "{diary.quote}"
                          </p>
                        </div>
                      )}
                      {/* 사진 썸네일 표시 */}
                      {diary.photoUrls && diary.photoUrls.length > 0 && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {diary.photoUrls.map((photoUrl, idx) => (
                            <div key={idx} className="relative rounded-lg overflow-hidden border border-emerald-200 bg-emerald-50 aspect-square">
                              <img
                                src={photoUrl}
                                alt={`사진 ${idx + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  console.error("사진 썸네일 로드 실패:", photoUrl);
                                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3E이미지 없음%3C/text%3E%3C/svg%3E";
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
                        <span className="mr-1.5">✨</span>
                        {diary.summary}
                      </p>
                      {diary.moodScore && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-700">오늘의 기분:</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <span
                                key={score}
                                className={`text-lg ${
                                  score <= diary.moodScore
                                    ? diary.moodScore >= 4
                                      ? "text-yellow-400"
                                      : diary.moodScore >= 3
                                      ? "text-emerald-400"
                                      : "text-rose-400"
                                    : "text-zinc-300"
                                }`}
                              >
                                {score <= diary.moodScore ? "⭐" : "☆"}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-zinc-500">
                            {diary.moodScore >= 4
                              ? "😊 매우 좋음"
                              : diary.moodScore >= 3
                              ? "🙂 좋음"
                              : diary.moodScore >= 2
                              ? "😐 보통"
                              : "😔 아쉬움"}
                          </span>
                        </div>
                      )}
                      <div className="mt-4 grid gap-4 text-sm text-zinc-700">
                        {diary.timeline?.length > 0 && (
                          <div>
                            <p className="font-semibold text-zinc-900 inline-flex items-center gap-1.5">
                              <span>📝</span>
                              오늘 있었던 일
                            </p>
                            <ul className="mt-2 space-y-1.5 pl-4">
                              {diary.timeline.map((item, index) => (
                                <li key={`${diary.id}-t-${index}`} className="inline-flex items-start gap-1.5">
                                  <span className="text-emerald-500 mt-0.5">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {diary.goodThingsByMember && (
                          <div>
                            <p className="font-semibold text-zinc-900 inline-flex items-center gap-1.5">
                              <span>💝</span>
                              좋았던 일 3가지
                            </p>
                            <div className="mt-2 grid gap-3">
                              {Object.entries(diary.goodThingsByMember).map(
                                ([name, items]) => (
                                  <div key={`${diary.id}-${name}`}>
                                    <div className="flex items-center justify-between">
                                      <p className={`font-medium inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                                        memberColors[name] === "pink" ? "bg-pink-100 text-pink-700" :
                                        memberColors[name] === "blue" ? "bg-blue-100 text-blue-700" :
                                        memberColors[name] === "yellow" ? "bg-yellow-100 text-yellow-700" :
                                        memberColors[name] === "emerald" ? "bg-emerald-100 text-emerald-700" :
                                        memberColors[name] === "purple" ? "bg-purple-100 text-purple-700" :
                                        memberColors[name] === "orange" ? "bg-orange-100 text-orange-700" :
                                        "bg-rose-100 text-rose-700"
                                      }`}>
                                        <span>{name === "엄마" ? "👩" : name === "아빠" ? "👨" : name === "아이" ? "👶" : "👤"}</span>
                                        {name}
                                      </p>
                                      <button
                                        type="button"
                                        className="text-xs text-emerald-600 hover:text-emerald-700"
                                        onClick={() => loadHighlights(name)}
                                      >
                                        {highlights[name] ? "하이라이트 보기" : "하이라이트 생성"}
                                      </button>
                                    </div>
                                    {highlights[name] && (
                                      <div className="mt-1 rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
                                        <span className="font-semibold">🌟 {name}님의 이번 달:</span> {highlights[name]}
                                      </div>
                                    )}
                                    {items.length === 0 ? (
                                      <p className="mt-1 text-sm text-zinc-400 inline-flex items-center gap-1">
                                        <span>😔</span>
                                        내용 없음
                                      </p>
                                    ) : (
                                      <ul className="mt-1 space-y-1 pl-4 text-zinc-600">
                                        {items.map((item, index) => (
                                          <li
                                            key={`${diary.id}-${name}-${index}`}
                                            className="inline-flex items-start gap-1.5"
                                          >
                                            <span className="text-amber-500 mt-0.5">⭐</span>
                                            <span>{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {diary.imagePrompts?.length ? null : null}
                      {diary.combinedImagePrompt ? (
                        <div className="mt-4 rounded-2xl bg-white p-3 text-xs text-zinc-500">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-zinc-700">
                              4컷 프롬프트
                            </p>
                            <div className="relative">
                              <button
                                type="button"
                                className="rounded-full border border-zinc-200 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
                                onClick={async () => {
                                  if (diary.combinedImagePrompt) {
                                    try {
                                      await navigator.clipboard.writeText(
                                        diary.combinedImagePrompt,
                                      );
                                      setCopyTooltip(diary.id);
                                      setTimeout(() => setCopyTooltip(null), 2000);
                                    } catch {
                                      setCopyTooltip(null);
                                    }
                                  }
                                }}
                              >
                                복사
                              </button>
                              {copyTooltip === diary.id && (
                                <div className="absolute -top-8 right-0 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                                  복사되었습니다! ✓
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="mt-2">{diary.combinedImagePrompt}</p>
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          onClick={async () => {
                            try {
                              const shareRes = await fetch(
                                `/api/share?id=${encodeURIComponent(diary.id)}`,
                              );
                              const shareData = await shareRes.json();
                              if (shareData.shareUrl) {
                                await navigator.clipboard.writeText(
                                  shareData.shareUrl,
                                );
                                alert("공유 링크가 복사되었어요!");
                              }
                            } catch {
                              alert("공유 링크 복사에 실패했어요.");
                            }
                          }}
                        >
                          🔗 링크 공유
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          onClick={async () => {
                            try {
                              const shareRes = await fetch(
                                `/api/share?id=${encodeURIComponent(diary.id)}`,
                              );
                              const shareData = await shareRes.json();
                              if (shareData.qrCodeUrl) {
                                window.open(shareData.qrCodeUrl, "_blank");
                              }
                            } catch {
                              alert("QR 코드 생성에 실패했어요.");
                            }
                          }}
                        >
                          📱 QR 코드
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          onClick={() => {
                            window.open(
                              `/api/pdf?id=${encodeURIComponent(diary.id)}`,
                              "_blank",
                            );
                          }}
                        >
                          📄 PDF 내보내기
                        </button>
                      </div>
                    </article>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {activeTab === "stats" && stats && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">📊 통계 대시보드</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-700 mb-2">총 일기 수</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.totalDiaries}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-700 mb-2">평균 기분 점수</p>
                <p className="text-3xl font-bold text-amber-600">
                  {stats.moodScores.length > 0
                    ? (stats.moodScores.reduce((a: number, b: number) => a + b, 0) / stats.moodScores.length).toFixed(1)
                    : "0"}
          </p>
        </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-700 mb-2">인기 키워드</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(stats.totalKeywords)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 10)
                    .map(([kw, count]) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                      >
                        #{kw} ({count})
                      </span>
                    ))}
                </div>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-sm font-semibold text-zinc-700 mb-2">자주 간 장소</p>
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
                <div className="md:col-span-2 rounded-2xl bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-700 mb-3">가족 구성원별 통계</p>
                  <div className="grid gap-3">
                    {Object.entries(stats.members).map(([name, data]: [string, any]) => (
                      <div key={name} className="rounded-xl bg-white p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className={`font-medium inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                            memberColors[name] === "pink" ? "bg-pink-100 text-pink-700" :
                            memberColors[name] === "blue" ? "bg-blue-100 text-blue-700" :
                            memberColors[name] === "yellow" ? "bg-yellow-100 text-yellow-700" :
                            "bg-emerald-100 text-emerald-700"
                          }`}>
                            {name === "엄마" ? "👩" : name === "아빠" ? "👨" : name === "아이" ? "👶" : "👤"} {name}
                          </p>
                          <span className="text-sm text-zinc-600">일기 {data.count}개 · 평균 기분 {data.totalMood.toFixed(1)}</span>
                        </div>
                        {Object.keys(data.keywords).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {Object.entries(data.keywords)
                              .sort(([, a], [, b]) => (b as number) - (a as number))
                              .slice(0, 5)
                              .map(([kw, count]: [string, any]) => (
                                <span
                                  key={kw}
                                  className="text-xs text-zinc-500"
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
          </section>
        )}

        {activeTab === "timeline" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">📅 타임라인</h2>
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-zinc-500">타임라인 데이터가 없어요.</p>
              ) : (
                timeline.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 p-4 hover:border-emerald-300 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-700" suppressHydrationWarning>
                        {mounted ? formatDisplayDate(item.date) : item.date}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">📍 {item.location}</span>
                        <span className="text-xs text-zinc-500">☁️ {item.weather}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-zinc-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-600 line-clamp-2">{item.summary}</p>
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.keywords.slice(0, 4).map((kw: string) => (
                          <span
                            key={kw}
                            className="text-xs text-zinc-500"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "dashboard" && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-4">
              <label className="text-sm font-medium text-zinc-700 mb-2 block">
                구성원 선택
              </label>
              <select
                value={selectedMember || ""}
                onChange={(e) => setSelectedMember(e.target.value || null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
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
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                💾 백업 다운로드
              </button>
              <label className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer transition">
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
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
              >
                📄 주간 요약
              </button>
        </div>
          </section>
        )}
      </main>
    </div>
  );
}
