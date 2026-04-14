"use client";

import { useEffect, useState, useRef } from "react";
import type { DiaryEntry } from "@/lib/types";
import type { EditSection } from "@/components/EditDiaryModal";
import { formatDisplayDate } from "@/lib/utils";
import { compressImage, compressAudio } from "@/lib/client-compression";

type Props = {
  diary: DiaryEntry;
  memberColors: Record<string, string>;
  onClose: () => void;
  onEdit?: (diary: DiaryEntry, section?: EditSection) => void;
  onShareLink: (id: string) => void;
  onShareQR: (id: string) => void;
  onPDF: (id: string) => void;
  highlights: Record<string, string>;
  onLoadHighlights: (member: string) => void;
  /** 해시태그 클릭 시 연관 일기 보기: 키워드로 피드 검색 후 닫기 */
  onKeywordClick?: (keyword: string) => void;
  /** 오늘과 비슷한 날 추천 목록 */
  similarDiaries?: DiaryEntry[];
  /** 비슷한 날 카드 클릭 시 해당 일기로 전환 */
  onOpenDiary?: (diary: DiaryEntry) => void;
  /** 그림 파일 올리기 후 일기 목록 갱신용 (diaryId, customImageUrl) */
  onCustomImageUploaded?: (diaryId: string, customImageUrl: string) => void;
  /** 장소·날씨 저장 후 부모 상태 갱신 (diaryId, location, weather) */
  onSaveLocationWeather?: (diaryId: string, location: string, weather: string) => void;
  /** 일기 일부 필드 수정 후 부모 상태 갱신 (diaryId, patch) */
  onPatchDiary?: (diaryId: string, patch: Partial<DiaryEntry>) => void;
};

export default function ReadFullScreen({
  diary,
  memberColors,
  onClose,
  onEdit,
  onShareLink,
  onShareQR,
  onPDF,
  highlights,
  onLoadHighlights,
  onKeywordClick,
  similarDiaries = [],
  onOpenDiary,
  onCustomImageUploaded,
  onSaveLocationWeather,
  onPatchDiary,
}: Props) {
  const [copyTooltip, setCopyTooltip] = useState(false);
  const [currentDiary, setCurrentDiary] = useState<DiaryEntry>(diary);

  const [editingGoodThings, setEditingGoodThings] = useState<{ member: string; index: number } | null>(null);
  const [editingGoodThingsValue, setEditingGoodThingsValue] = useState("");
  const [editingCaptions, setEditingCaptions] = useState(false); // 자막 수정 모드
  const [captionValues, setCaptionValues] = useState<string[]>([]);

  useEffect(() => {
    if (currentDiary.imageCaptions) {
      setCaptionValues(currentDiary.imageCaptions);
    }
  }, [currentDiary.imageCaptions]);

  const handleUpdateCaptions = async () => {
    const nextDiary = { ...currentDiary, imageCaptions: captionValues };
    setCurrentDiary(nextDiary);
    setEditingCaptions(false);

    try {
      await fetch("/api/diary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentDiary.id, imageCaptions: captionValues }),
      });
      onPatchDiary?.(currentDiary.id, { imageCaptions: captionValues });
      alert("자막이 저장되었어요.");
    } catch (e) {
      alert("저장 실패");
    }
  };

  const handleUpdateGoodThing = async (member: string, index: number, newValue: string) => {
    const currentList = currentDiary.goodThingsByMember?.[member] || [];
    const nextList = [...currentList];
    
    if (newValue.trim()) {
      nextList[index] = newValue.trim();
    } else {
      // 빈 값이면 삭제
      nextList.splice(index, 1);
    }

    const nextGoodThings = {
      ...currentDiary.goodThingsByMember,
      [member]: nextList,
    };

    // 해당 멤버의 리스트가 비었으면 키 삭제? -> 빈 배열로 유지하는 게 나을 듯 (UI 표시 위해)
    // if (nextList.length === 0) delete nextGoodThings[member];

    setCurrentDiary((prev) => ({ ...prev, goodThingsByMember: nextGoodThings }));
    setEditingGoodThings(null);
    setEditingGoodThingsValue("");

    try {
      await fetch("/api/diary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentDiary.id, goodThingsByMember: nextGoodThings }),
      });
      onPatchDiary?.(currentDiary.id, { goodThingsByMember: nextGoodThings });
    } catch (e) {
      alert("저장 실패");
    }
  };

  const handleDeleteGoodThing = async (member: string, index: number) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    
    const currentList = currentDiary.goodThingsByMember?.[member] || [];
    const nextList = currentList.filter((_, i) => i !== index);
    
    const nextGoodThings = {
      ...currentDiary.goodThingsByMember,
      [member]: nextList,
    };

    setCurrentDiary((prev) => ({ ...prev, goodThingsByMember: nextGoodThings }));

    try {
      await fetch("/api/diary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentDiary.id, goodThingsByMember: nextGoodThings }),
      });
      onPatchDiary?.(currentDiary.id, { goodThingsByMember: nextGoodThings });
    } catch (e) {
      alert("삭제 실패");
    }
  };
  const [editingTimelineIndex, setEditingTimelineIndex] = useState<number | null>(null);
  const [editingTimelineValue, setEditingTimelineValue] = useState("");

  const [editingMeta, setEditingMeta] = useState(false);
  const [editLocation, setEditLocation] = useState(diary.location ?? "");
  const [editWeather, setEditWeather] = useState(diary.weather ?? "");
  const [savingMeta, setSavingMeta] = useState(false);
  const [mapSearchOpen, setMapSearchOpen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [mapSearching, setMapSearching] = useState(false);
  const [regeneratingBody, setRegeneratingBody] = useState(false);
  const [regeneratingQuote, setRegeneratingQuote] = useState(false);
  const [regeneratingFromTranscript, setRegeneratingFromTranscript] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(true); // 기본적으로 펼쳐진 상태
  const [transcriptCopyTooltip, setTranscriptCopyTooltip] = useState(false);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [pastingImage, setPastingImage] = useState(false);
  const imagePasteAreaRef = useRef<HTMLDivElement>(null);
  const [extractingGoodThings, setExtractingGoodThings] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  // const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // 일기 데이터를 최신으로 불러오기 (할당량 절약: prop에 데이터가 있으면 API 호출 생략)
  useEffect(() => {
    // prop으로 받은 diary에 이미 최신 데이터(프롬프트)가 있으면 API 호출 생략
    // 주의: 이미지는 수동 생성이므로 없을 수 있음 -> 이미지 유무로 리프레시 결정하면 무한 루프 가능성 있음
    if (diary.combinedImagePrompt) {
      setCurrentDiary(diary);
      return;
    }
    
    // 프롬프트가 없는 경우에만 상세 조회 (목록 API에서는 프롬프트가 제외되어 있으므로)
    const loadLatestDiary = async () => {
      try {
        const res = await fetch(`/api/diary?id=${encodeURIComponent(diary.id)}`);
        if (res.ok) {
          const latestData = await res.json();
          console.log("[ReadFullScreen] 최신 일기 데이터 로드 완료:", latestData.id);
          
          setCurrentDiary(latestData);
          // 부모 컴포넌트에도 최신 데이터 전달하여 리스트 업데이트 (이로 인해 부모 리렌더링 -> diary prop 변경 -> useEffect 재실행 -> 위 if문에서 걸러짐)
          onPatchDiary?.(diary.id, latestData);
        }
      } catch (e) {
        console.error("최신 일기 데이터 불러오기 실패:", e);
        // 실패해도 prop 데이터 사용
        setCurrentDiary(diary);
      }
    };
    loadLatestDiary();
  }, [diary.id, diary.combinedImagePrompt, onPatchDiary]);

  // diary prop이 변경되면 currentDiary도 업데이트 (위 useEffect와 충돌 방지를 위해 id가 변경되었을 때만 초기화하는 것이 안전하나, 
  // 여기서는 위 useEffect가 처리를 다 하므로 이 useEffect는 제거하거나, 단순 동기화용으로 둡니다.
  // 하지만 위 useEffect에서 setCurrentDiary(diary)를 이미 수행하므로, 별도의 useEffect는 불필요하거나 충돌을 야기할 수 있습니다.
  // 따라서 아래 useEffect는 제거합니다.)


  const handleSaveLocationWeather = async () => {
    if (!onSaveLocationWeather) return;
    setSavingMeta(true);
    try {
      await fetch("/api/diary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentDiary.id,
          location: editLocation.trim() || undefined,
          weather: editWeather.trim() || undefined,
        }),
      });
      setCurrentDiary((prev) => ({ ...prev, location: editLocation.trim(), weather: editWeather.trim() }));
      onSaveLocationWeather(currentDiary.id, editLocation.trim(), editWeather.trim());
      setEditingMeta(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSavingMeta(false);
    }
  };

  const searchPlace = async () => {
    const q = mapSearchQuery.trim();
    if (!q) return;
    setMapSearching(true);
    setMapSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + " 대한민국")}&limit=6`,
        { headers: { "Accept-Language": "ko" } },
      );
      const data = await res.json();
      setMapSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setMapSearchResults([]);
    } finally {
      setMapSearching(false);
    }
  };

  useEffect(() => {
    if (editingMeta) {
      setEditLocation(currentDiary.location ?? "");
      setEditWeather(currentDiary.weather ?? "");
    }
  }, [editingMeta, currentDiary.location, currentDiary.weather]);

  // diary prop이 변경되면 currentDiary도 업데이트
  // useEffect(() => {
  //   setCurrentDiary(diary);
  // }, [diary]);

  // 오디오 파일 업로드 함수 (재사용)
  const handleAudioUpload = async (file: File) => {
    if (!file) return;
    
    // 파일 타입 검증
    if (!file.type.startsWith("audio/")) {
      alert("오디오 파일만 업로드할 수 있어요.");
      return;
    }

    setUploadingAudio(true);
    try {
      let uploadFile = file;
      // 4MB 초과 시 자동 압축 시도 (헤더 오버헤드 등 고려하여 4MB로 하향)
      if (file.size > 4 * 1024 * 1024) {
        console.log("Audio file too large, starting compression strategies...");
        
        // 단계별 압축 시도 전략
        const strategies = [
          { kbps: 24, sampleRate: 22050 }, // 1단계: 24kbps, 22.05kHz (품질 양호)
          { kbps: 16, sampleRate: 16000 }, // 2단계: 16kbps, 16kHz (음성 식별 가능)
          { kbps: 12, sampleRate: 11025 }, // 3단계: 12kbps, 11.025kHz (최후의 수단, 음질 낮음)
        ];

        let success = false;
        for (let i = 0; i < strategies.length; i++) {
          const { kbps, sampleRate } = strategies[i];
          try {
            console.log(`Trying compression strategy ${i + 1}: ${kbps}kbps, ${sampleRate}Hz`);
            const compressed = await compressAudio(file, { targetKbps: kbps, targetSampleRate: sampleRate });
            
            // 압축 실패(원본 반환)했거나, 크기가 여전히 4.2MB보다 크면 다음 단계 시도
            if (compressed === file || compressed.size > 4.2 * 1024 * 1024) {
              console.log(`Strategy ${i + 1} insufficient. Size: ${compressed.size}`);
              if (i === strategies.length - 1) {
                // 마지막 시도 실패
                throw new Error(`최대 압축 후에도 파일이 큽니다 (${(compressed.size / 1024 / 1024).toFixed(2)}MB)`);
              }
              continue; 
            }

            // 성공적으로 줄어들었으면 채택하고 루프 종료
            uploadFile = compressed;
            console.log("Compression successful:", uploadFile.size);
            success = true;
            break;

          } catch (e) {
            console.error(`Strategy ${i + 1} error:`, e);
            if (i === strategies.length - 1) {
              const errMsg = e instanceof Error ? e.message : "압축 실패";
              alert(`파일을 자동으로 줄이는데 실패했습니다 (${errMsg}). 더 짧은 녹음 파일을 올려주세요.`);
              setUploadingAudio(false);
              return;
            }
          }
        }

      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("diaryId", currentDiary.id);
      
      const res = await fetch("/api/diary/upload-audio", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.error === "string" ? data.error : null;
        if (res.status === 413) {
          throw new Error(msg || "파일이 너무 커요. 4MB 이하로 줄이거나 압축해 보세요. (Vercel 무료 버전 제한)");
        }
        throw new Error(msg || `업로드 실패 (${res.status})`);
      }
      
      const data = await res.json();
      setCurrentDiary((prev) => ({
        ...prev,
        audioUrl: data.audioUrl,
        transcript: data.transcript || prev.transcript,
        transcriptPreview: data.transcriptPreview || prev.transcriptPreview,
      }));
      onPatchDiary?.(currentDiary.id, {
        audioUrl: data.audioUrl,
        transcript: data.transcript,
        transcriptPreview: data.transcriptPreview,
      });
      alert("녹음 파일이 업로드되었고 자동 캡션이 생성되었어요!");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "녹음 파일 업로드에 실패했어요.";
      if (msg.includes("fetch failed") || msg.includes("Failed to fetch")) {
        alert("연결이 끊겼어요. 파일이 4.5MB 넘으면 줄이거나, 잠시 후 다시 시도해 주세요.");
      } else {
        alert(msg);
      }
    } finally {
      setUploadingAudio(false);
    }
  };

  const selectPlace = async (displayName: string) => {
    const loc = displayName.split(",")[0]?.trim() || displayName;
    setEditLocation(loc);
    setMapSearchOpen(false);
    setMapSearchQuery("");
    setMapSearchResults([]);
    try {
      const res = await fetch(
        `/api/weather?location=${encodeURIComponent(loc)}&date=${encodeURIComponent(currentDiary.date || "")}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.weather) setEditWeather(data.weather);
      }
    } catch {
      // ignore
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 지원되는 MIME 타입 찾기 (iOS 호환성 위해 mp4/aac 우선)
      const mimeTypes = [
        "audio/mp4",
        "audio/aac",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        ""
      ];
      const mimeType = mimeTypes.find(type => !type || MediaRecorder.isTypeSupported(type));
      const options = mimeType ? { mimeType } : undefined;

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // 실제 사용된 MIME 타입 확인
        const finalMimeType = mediaRecorder.mimeType || mimeType || "audio/webm";
        // 확장자 결정 (mp4/aac -> m4a, 그 외 -> webm)
        const ext = (finalMimeType.includes("mp4") || finalMimeType.includes("aac")) ? "m4a" : "webm";
        
        const blob = new Blob(chunksRef.current, { type: finalMimeType });
        const file = new File([blob], `recording.${ext}`, { type: finalMimeType });
        handleAudioUpload(file);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      alert("마이크를 사용할 수 없거나 권한이 필요합니다. 설정에서 확인해주세요.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Image upload handler removed as per user request -> restored/refactored for generic use
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    setPastingImage(true);
    try {
      // 이미지 압축 (모든 이미지에 대해 적용하여 최적화)
      let uploadFile = file;
      try {
        uploadFile = await compressImage(file);
      } catch (e) {
        console.error("Image compression failed:", e);
      }

      // 모든 이미지는 서버로 보내서 리사이징 처리
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("diaryId", currentDiary.id);
      
      const uploadRes = await fetch("/api/diary/upload-image", {
        method: "POST",
        body: formData,
      });
      
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        const patchRes = await fetch("/api/diary", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: currentDiary.id,
            combinedImageUrl: uploadData.url,
          }),
        });
        if (patchRes.ok) {
          const updated = await patchRes.json();
          setCurrentDiary((prev) => ({ ...prev, combinedImageUrl: uploadData.url }));
          onPatchDiary?.(currentDiary.id, { combinedImageUrl: uploadData.url });
          // 이미지 업로드 후 상태 업데이트로 화면 갱신 (리로드 제거)
        }
      } else {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error || "이미지 업로드 실패");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "이미지 업로드에 실패했어요.");
    } finally {
      setPastingImage(false);
    }
  };

  const handleRegeneratePrompt = async () => {
    // 이미 프롬프트가 있다면 확인
    if (currentDiary.combinedImagePrompt && !confirm("현재 프롬프트를 삭제하고 새로 만들까요?")) return;
    
    setRegeneratingImage(true);
    try {
      const res = await fetch("/api/diary/regenerate-4cut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentDiary.id, regenerateScenes: true }),
      });
      if (!res.ok) throw new Error("프롬프트 생성 실패");
      const data = await res.json();
      if (data.combinedImagePrompt) {
        setCurrentDiary((prev) => ({ ...prev, combinedImagePrompt: data.combinedImagePrompt }));
        onPatchDiary?.(currentDiary.id, { combinedImagePrompt: data.combinedImagePrompt });
        if (currentDiary.combinedImagePrompt) alert("프롬프트가 새로 생성되었어요!");
      }
    } catch (e) {
      alert("프롬프트 생성에 실패했어요.");
    } finally {
      setRegeneratingImage(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]"
      onDragOver={(e) => {
        // 페이지 전체로 파일이 드롭될 때 브라우저가 새 탭으로 여는 기본 동작 방지
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(e) => {
        // 카드 영역 밖에 드롭했을 때도 기본 동작(새 탭 열기) 방지 + 오디오면 업로드
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files);
          const audioFile = files.find((file) => file.type.startsWith("audio/"));
          if (audioFile) {
            handleAudioUpload(audioFile);
          }
        }
      }}
    >
      <header className="sticky top-0 z-10 flex min-h-[56px] items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-xl font-medium text-stone-600 hover:bg-stone-100"
        >
          ← 닫기
        </button>
        <div className="flex items-center gap-2 text-sm text-stone-500" suppressHydrationWarning>
          <span className="font-medium">{formatDisplayDate(currentDiary.date)}</span>
          {onEdit && (
            <button
              type="button"
              className="text-xs text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
              onClick={() => onEdit(currentDiary, "date")}
            >
              날짜 수정
            </button>
          )}
        </div>
        <div className="min-w-[44px]" />
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <article className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-2xl font-bold text-stone-900 font-[family-name:var(--font-gamja)]">
              {currentDiary.title || "제목 없는 일기"}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              {editingMeta ? (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="장소"
                    className="flex-1 min-w-0 rounded-xl border border-amber-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setMapSearchOpen(true)}
                    className="shrink-0 rounded-xl bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800"
                  >
                    지도로 검색
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={editWeather}
                    onChange={(e) => setEditWeather(e.target.value)}
                    placeholder="날씨 (장소 선택 시 자동 입력)"
                    className="flex-1 min-w-0 rounded-xl border border-amber-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSaveLocationWeather}
                    disabled={savingMeta}
                    className="shrink-0 rounded-xl bg-amber-500 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {savingMeta ? "저장 중…" : "저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeta(false);
                      setEditLocation(currentDiary.location ?? "");
                      setEditWeather(currentDiary.weather ?? "");
                    }}
                    className="shrink-0 rounded-xl border border-stone-200 px-3 py-2 text-xs"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSaveLocationWeather && setEditingMeta(true)}
                className="text-left hover:bg-amber-50/50 rounded-lg px-2 py-1 -mx-1 transition-colors"
              >
                <span>📍 {currentDiary.location?.trim() && !currentDiary.location.includes("사용 불가") ? currentDiary.location : "장소 없음"}</span>
                <span className="mx-1.5">·</span>
                <span>☁️ {currentDiary.weather?.trim() && !currentDiary.weather.includes("사용 불가") ? currentDiary.weather : "날씨 없음"}</span>
                {onSaveLocationWeather && (
                  <span className="ml-1 text-amber-600"> (클릭하여 수정)</span>
                )}
              </button>
            )}
          </div>
          </div>
          
{/* Image upload button removed as per user request */}

          {/* 4컷 만화 이미지 - 장소/날씨 정보 하단에 표시 */}
          {(() => {
            const imageUrl = currentDiary.combinedImageUrl;
            const hasImage = !!imageUrl && typeof imageUrl === "string" && imageUrl.trim().length > 0;
            
            // 프롬프트가 있는 경우: 항상 프롬프트 표시 및 복사/재생성 버튼 제공
            if (currentDiary.combinedImagePrompt) {
              return (
                <div className="mt-4 mb-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">🎨 4컷 만화 생성용 프롬프트</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRegeneratePrompt}
                        disabled={regeneratingImage}
                        className="rounded-lg bg-white border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        {regeneratingImage ? "생성 중..." : "🔄 재생성"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(currentDiary.combinedImagePrompt || "");
                          setCopyTooltip(true);
                          setTimeout(() => setCopyTooltip(false), 2000);
                        }}
                        className="relative rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                      >
                        {copyTooltip ? "✅ 복사됨!" : "📋 프롬프트 복사"}
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs text-slate-500 whitespace-pre-wrap break-words leading-relaxed">
                      {currentDiary.combinedImagePrompt}
                    </p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    * 위 프롬프트를 복사해서 외부 AI 이미지 생성 도구에 붙여넣으세요.
                  </p>
                </div>
              );
            } else {
              // 프롬프트가 없는 경우: 생성 버튼 제공
              return (
                <div className="mt-4 mb-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-700">🎨 4컷 만화 생성용 프롬프트</p>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-500 mb-3">
                      아직 프롬프트가 생성되지 않았어요.
                    </p>
                    <button
                      type="button"
                      onClick={handleRegeneratePrompt}
                      disabled={regeneratingImage}
                      className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {regeneratingImage ? "생성 중..." : "✨ 프롬프트 생성하기"}
                    </button>
                  </div>
                </div>
              );
            }
            
            return null;
          })()}
          {(() => {
            const imageUrl = currentDiary.combinedImageUrl || currentDiary.customImageDataUrl;
            const isValidImage = !!imageUrl && typeof imageUrl === "string" && imageUrl.trim().length > 0;
            
            if (!isValidImage) {
              // 이미지가 없으면 항상 붙여넣기/업로드 영역 표시
              return (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleImageUpload(e.target.files[0]);
                      }
                      e.target.value = "";
                    }}
                  />
                  <div 
                    ref={imagePasteAreaRef}
                    onClick={(e) => {
                      // 기본 클릭 시 파일 선택창 열기 방지 (버튼으로 분리)
                      // imageInputRef.current?.click() 
                    }}
                    className="mt-4 mb-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-6 transition-colors"
                    onPaste={async (e) => {
                      e.preventDefault();
                      e.stopPropagation(); // 이벤트 전파 중단 (상위 핸들러 간섭 방지)
                      const items = e.clipboardData.items;
                      for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.type.indexOf("image") !== -1) {
                          const file = item.getAsFile();
                          if (file) handleImageUpload(file);
                          break;
                        }
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer.files;
                      if (files.length > 0 && files[0].type.startsWith("image/")) {
                        handleImageUpload(files[0]);
                      }
                    }}
                    tabIndex={0}
                    style={{ outline: "none" }}
                  >
                    <div className="text-center">
                      <p className="text-sm text-amber-700 mb-2">
                        {currentDiary.combinedImagePrompt ? "4컷 만화 이미지가 아직 생성되지 않았어요." : "이미지가 없어요."}
                      </p>
                      <p className="text-xs text-amber-600 mb-3">
                        이 영역을 클릭하고 <strong>Ctrl+V (또는 Cmd+V)</strong>로<br />
                        이미지를 붙여넣어주세요.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          imageInputRef.current?.click();
                        }}
                        className="mt-2 rounded-lg bg-white border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-amber-50 transition-colors"
                      >
                        📁 파일 선택하여 업로드
                      </button>
                      {pastingImage && (
                        <p className="text-xs text-amber-600 mt-2">이미지 처리 중...</p>
                      )}
                    </div>
                  </div>
                </>
              );
            }
            
            return (
              <div className="mt-4 mb-4 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 relative group">
                <img 
                  src={imageUrl} 
                  alt="오늘의 4컷 만화" 
                  className="w-full h-auto object-contain" 
                  loading="lazy"
                  onError={(e) => {
                    console.error("[ReadFullScreen] 이미지 로드 실패:", {
                      url: imageUrl,
                      error: e,
                      target: e.target,
                    });
                  }}
                  onLoad={() => {
                    console.log("[ReadFullScreen] 이미지 로드 성공:", imageUrl);
                  }}
                />
                
                {/* 4컷 만화 자막 오버레이 - 반응형 위치 및 크기 조정 */}
                {currentDiary.imageCaptions && currentDiary.imageCaptions.length > 0 && (
                  <div className="absolute inset-0 z-30 pointer-events-none">
                    <div className="w-full h-full grid grid-cols-2 grid-rows-2">
                      {currentDiary.imageCaptions.slice(0, 4).map((caption, idx) => (
                        <div key={idx} className="relative w-full h-full border border-transparent">
                          {/* 
                            상단 여백(top): 이미지 비율(16:10)에 맞춰 2.5% -> 3.5%로 조정 
                            가로 너비(max-w): 95% -> 90%로 축소하여 여백 확보
                            폰트 크기: 화면 너비(vw) 기준으로 유동적 조절 (clamp 사용)
                          */}
                          <div className="absolute top-[3.5%] left-0 w-full flex justify-center px-1">
                            <div 
                              className="bg-white/95 text-stone-900 font-[family-name:var(--font-gamja)] leading-snug rounded-lg px-2 py-1 shadow-sm text-center border border-stone-200/50 break-keep pointer-events-auto"
                              style={{ 
                                fontSize: "clamp(12px, 2.5vw, 18px)", // 최소 12px, 최대 18px, 화면 너비에 비례
                                maxWidth: "90%"
                              }}
                            >
                              {caption}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentDiary.combinedImagePrompt && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("다른 이미지로 교체할까요?\n\n기존 이미지를 삭제하고 새 이미지를 붙여넣을 수 있어요.")) return;
                        // 이미지 URL을 null로 설정하여 붙여넣기 영역 표시
                        await fetch("/api/diary", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: currentDiary.id,
                            combinedImageUrl: null,
                            customImageDataUrl: null,
                          }),
                        });
                        setCurrentDiary((prev) => ({ 
                          ...prev, 
                          combinedImageUrl: undefined,
                          customImageDataUrl: undefined,
                        }));
                        onPatchDiary?.(currentDiary.id, { 
                          combinedImageUrl: undefined,
                          customImageDataUrl: undefined,
                        });
                      }}
                      className="rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm hover:bg-white transition-colors pointer-events-auto"
                    >
                      🔄 이미지 교체
                    </button>
                  </div>
                )}
 
              </div>
            );
          })()}

          {/* 자막 수정 UI */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm mb-6 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-1">
                💬 4컷 만화 자막
              </h3>
              {editingCaptions ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateCaptions}
                    className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    저장 완료
                  </button>
                  <button
                    onClick={() => {
                      setEditingCaptions(false);
                      setCaptionValues(currentDiary.imageCaptions || []);
                    }}
                    className="text-xs bg-stone-100 text-stone-600 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-colors"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingCaptions(true)}
                  className="text-xs text-stone-500 hover:text-amber-600 hover:bg-amber-50 px-2 py-1 rounded-md transition-colors"
                >
                  ✏️ 자막 수정하기
                </button>
              )}
            </div>

            {editingCaptions ? (
              <div className="grid grid-cols-1 gap-3">
                {captionValues.map((cap, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-stone-400">{idx + 1}컷 자막</label>
                    <textarea
                      value={cap}
                      onChange={(e) => {
                        const newVals = [...captionValues];
                        newVals[idx] = e.target.value;
                        setCaptionValues(newVals);
                      }}
                      className="w-full text-sm border border-stone-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(currentDiary.imageCaptions && currentDiary.imageCaptions.length > 0) ? (
                  currentDiary.imageCaptions.map((cap, idx) => (
                    <div key={idx} className="bg-stone-50 rounded-lg p-2 text-xs text-stone-700 border border-stone-100">
                      <span className="font-bold text-amber-500 mr-1">{idx + 1}.</span>
                      {cap}
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-xs text-stone-400 py-2 flex flex-col items-center gap-2">
                    <p>자막 데이터가 없어요.</p>
                    <button
                      onClick={async () => {
                        if (!confirm("일기 내용을 바탕으로 자막을 다시 만들까요?")) return;
                        setEditingCaptions(true); // 로딩 표시 대용
                        try {
                          const res = await fetch("/api/diary/regenerate-4cut", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: currentDiary.id, forceCaption: true }),
                          });
                          if (!res.ok) {
                            const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                            console.error("Caption generation failed:", errorData);
                            throw new Error(errorData.error || "생성 실패");
                          }
                          const data = await res.json();
                          console.log("Caption generation response:", data);
                          if (data.imageCaptions && Array.isArray(data.imageCaptions) && data.imageCaptions.length >= 4) {
                            const nextDiary = { ...currentDiary, imageCaptions: data.imageCaptions };
                            setCurrentDiary(nextDiary);
                            setCaptionValues(data.imageCaptions);
                            onPatchDiary?.(currentDiary.id, { imageCaptions: data.imageCaptions });
                            alert("자막이 생성되었습니다!");
                          } else {
                            console.error("Invalid response data:", data);
                            throw new Error("Invalid response format");
                          }
                        } catch (e) {
                          console.error("Caption generation error:", e);
                          alert(`자막 생성에 실패했어요. ${e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.'}`);
                        } finally {
                          setEditingCaptions(false);
                        }
                      }}
                      className="text-amber-600 underline hover:text-amber-700"
                    >
                      🔄 자막 자동 생성하기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {currentDiary.combinedImagePrompt && (
            <>
              {/* 중복된 하단 프롬프트 섹션 제거됨 */}
            </>
          )}

          {mapSearchOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setMapSearchOpen(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchPlace()}
                    placeholder="동네·도시·지명 검색"
                    className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm"
                  />
                  <button type="button" onClick={searchPlace} disabled={mapSearching} className="rounded-xl bg-amber-500 px-4 py-2 text-sm text-white disabled:opacity-50">
                    {mapSearching ? "검색 중…" : "검색"}
                  </button>
                </div>
                <ul className="flex-1 overflow-y-auto space-y-1 text-sm">
                  {mapSearchResults.map((r, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => selectPlace(r.display_name)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-100"
                      >
                        {r.display_name}
                      </button>
                    </li>
                  ))}
                  {mapSearchResults.length === 0 && !mapSearching && mapSearchQuery.trim() && (
                    <li className="text-stone-400 py-2">검색 결과가 없어요.</li>
                  )}
                </ul>
                <button type="button" onClick={() => setMapSearchOpen(false)} className="mt-2 rounded-xl border border-stone-200 py-2 text-sm">
                  닫기
                </button>
              </div>
            </div>
          )}
          {currentDiary.quote && (
            <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-amber-800">💫 오늘의 한 문장</p>
                <div className="flex items-center gap-2">
                  {onPatchDiary && (
                    <button
                      type="button"
                      disabled={regeneratingQuote}
                      onClick={async () => {
                        setRegeneratingQuote(true);
                        try {
                          const res = await fetch("/api/diary/regenerate-quote-timeline", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ diaryId: currentDiary.id }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data.error || "재생성 실패");
                          }
                          const data = await res.json();
                          if (data.quote) {
                            setCurrentDiary((prev) => ({ 
                              ...prev, 
                              quote: data.quote,
                              timeline: data.timeline || prev.timeline 
                            }));
                            onPatchDiary(currentDiary.id, { 
                              quote: data.quote,
                              timeline: data.timeline 
                            });
                          }
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "오늘의 한 문장 재생성에 실패했어요.");
                        } finally {
                          setRegeneratingQuote(false);
                        }
                      }}
                      className="text-[11px] text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline disabled:opacity-50"
                    >
                      {regeneratingQuote ? "생성 중…" : "🔄 재생성"}
                    </button>
                  )}
                  {onEdit && (
                    <button
                      type="button"
                      className="text-[11px] text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
                      onClick={() => onEdit(currentDiary, "quote")}
                    >
                      수정
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-amber-900 italic">&quot;{currentDiary.quote}&quot;</p>
            </div>
          )}
          {currentDiary.photoUrls && currentDiary.photoUrls.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {currentDiary.photoUrls.map((url, idx) => (
                <div key={idx} className="aspect-square overflow-hidden rounded-2xl bg-stone-100">
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-base leading-relaxed text-stone-800">
                <span className="mr-1.5">✨</span>
                {currentDiary.summary}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onPatchDiary && (
                <>
                  <button
                    type="button"
                    disabled={regeneratingBody}
                    onClick={async () => {
                      setRegeneratingBody(true);
                      try {
                        const res = await fetch("/api/diary/regenerate-body", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: currentDiary.id }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "재생성 실패");
                        }
                        const data = await res.json();
                        if (data.summary) {
                          setCurrentDiary((prev) => ({ ...prev, summary: data.summary }));
                          onPatchDiary(currentDiary.id, { summary: data.summary });
                        }
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "일기 본문 재생성에 실패했어요.");
                      } finally {
                        setRegeneratingBody(false);
                      }
                    }}
                    className="text-sm font-medium text-amber-700 hover:text-amber-800 hover:underline disabled:opacity-50"
                  >
                    {regeneratingBody ? "생성 중…" : "✏️ 일기 본문만 다시 생성"}
                  </button>
                  {(() => {
                    const t = currentDiary.transcript && typeof currentDiary.transcript === "string" ? currentDiary.transcript.trim() : "";
                    const isRealTranscript = t.length >= 20 && !t.includes("오디오 녹음본만 첨부") && !t.includes("(녹음 내용 없음)");
                    return isRealTranscript;
                  })() && (
                    <button
                      type="button"
                      disabled={regeneratingFromTranscript}
                      onClick={async () => {
                        setRegeneratingFromTranscript(true);
                        try {
                          const res = await fetch("/api/diary/regenerate-from-transcript", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: currentDiary.id }),
                          });
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            throw new Error(data.error || "재생성 실패");
                          }
                          const data = await res.json();
                          if (data.title != null || data.summary != null) {
                            const patch = {
                              ...(data.title != null && { title: data.title }),
                              ...(data.summary != null && { summary: data.summary }),
                              ...(data.quote != null && { quote: data.quote }),
                              ...(data.timeline != null && { timeline: data.timeline }),
                              ...(data.keywords != null && { keywords: data.keywords }),
                              ...(data.moodScore != null && { moodScore: data.moodScore }),
                              ...(data.goodThingsByMember != null && { goodThingsByMember: data.goodThingsByMember }),
                            };
                            setCurrentDiary((prev) => ({ ...prev, ...patch }));
                            onPatchDiary(currentDiary.id, patch);
                            alert("녹음 내용으로 일기가 다시 생성되었어요.");
                          }
                        } catch (e) {
                          const msg = e instanceof Error ? e.message : "녹음 기반 재생성에 실패했어요.";
                          if (msg === "fetch failed" || msg.includes("Failed to fetch") || msg.includes("Load failed") || msg.includes("NetworkError")) {
                            alert("연결이 끊겼어요. 재생성에 30초 이상 걸릴 수 있으니 잠시 후 다시 시도해 주세요.");
                          } else {
                            alert(msg);
                          }
                        } finally {
                          setRegeneratingFromTranscript(false);
                        }
                      }}
                      className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-50"
                    >
                      {regeneratingFromTranscript ? "생성 중… (30초 걸릴 수 있어요)" : "🎤 녹음 내용으로 전체 재생성"}
                    </button>
                  )}
                  {/* 좋았던 일 자동 추출 버튼 */}
                  <button
                    type="button"
                    disabled={extractingGoodThings}
                    onClick={async () => {
                      if (!currentDiary.summary) {
                        alert("일기 본문이 있어야 추출할 수 있어요.");
                        return;
                      }
                      setExtractingGoodThings(true);
                      try {
                        const res = await fetch("/api/diary/extract-good-things", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            id: currentDiary.id,
                            transcript: currentDiary.transcript || "",
                            summary: currentDiary.summary,
                            members: ["엄마", "아빠", "아이"], // 기본값
                          }),
                        });
                        if (!res.ok) throw new Error("추출 실패");
                        const data = await res.json();
                        if (data.goodThingsByMember) {
                          const patch = { goodThingsByMember: data.goodThingsByMember };
                          setCurrentDiary((prev) => ({ ...prev, ...patch }));
                          onPatchDiary?.(currentDiary.id, patch);
                          alert("좋았던 일을 자동으로 찾았어요!");
                        }
                      } catch (e) {
                        alert("좋았던 일 추출에 실패했어요.");
                      } finally {
                        setExtractingGoodThings(false);
                      }
                    }}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline disabled:opacity-50"
                  >
                    {extractingGoodThings ? "추출 중..." : "🍀 좋았던 일 자동 추출"}
                  </button>
                </>
              )}
              {onEdit && (
                <button
                  type="button"
                  className="text-xs text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline"
                  onClick={() => onEdit(currentDiary, "summary")}
                >
                  본문 수정
                </button>
              )}
            </div>
          </div>
          {/* 원본 녹음 내용 - 일기 본문 하단에 표시 */}
          <div 
            className={`mt-6 rounded-xl border transition-colors ${
              isDraggingAudio 
                ? "border-amber-400 bg-amber-100 border-2" 
                : "border-stone-200 bg-stone-50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isDraggingAudio) setIsDraggingAudio(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // 드래그가 카드 영역을 완전히 벗어났을 때만 상태 변경
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX;
              const y = e.clientY;
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                setIsDraggingAudio(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingAudio(false);
              
              const files = Array.from(e.dataTransfer.files);
              const audioFile = files.find(file => file.type.startsWith("audio/"));
              
              if (audioFile) {
                handleAudioUpload(audioFile);
              } else if (files.length > 0) {
                alert("오디오 파일만 업로드할 수 있어요.");
              }
            }}
          >
            <div className="flex items-center justify-between p-3">
              <button
                type="button"
                onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                className="flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-900"
              >
                <span>{transcriptExpanded ? "▼" : "▶"}</span>
                <span>🎤 원본 녹음 내용</span>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {currentDiary.audioUrl && (!currentDiary.transcript?.trim() || String(currentDiary.transcript).includes("오디오 녹음본만 첨부")) && (
                  <button
                    type="button"
                    disabled={transcribingAudio}
                    onClick={async () => {
                      setTranscribingAudio(true);
                      try {
                        const res = await fetch("/api/diary/transcribe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ diaryId: currentDiary.id, audioUrl: currentDiary.audioUrl }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "전사 실패");
                        }
                        const data = await res.json();
                        if (data.transcript != null) {
                          setCurrentDiary((prev) => ({
                            ...prev,
                            transcript: data.transcript,
                            transcriptPreview: data.transcriptPreview ?? prev.transcriptPreview,
                          }));
                          onPatchDiary?.(currentDiary.id, {
                            transcript: data.transcript,
                            transcriptPreview: data.transcriptPreview,
                          });
                          alert("저장된 녹음으로 전사가 완료되었어요. 이제 \"녹음 내용으로 전체 재생성\"을 누르면 일기가 새로 만들어져요.");
                        }
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "저장된 녹음 전사에 실패했어요.");
                      } finally {
                        setTranscribingAudio(false);
                      }
                    }}
                    className="rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    {transcribingAudio ? "전사 중…" : "🎤 저장된 녹음으로 전사 다시 하기"}
                  </button>
                )}
                {/* 오디오가 있지만 전사가 안 된 경우 (또는 실패한 경우) 수동으로 전사 요청하는 버튼 - 기존 버튼과 통합됨 */}
                {/* 
                  수정: 오디오 URL이 있는데 transcript가 없거나 내용이 부실할 때 항상 노출되도록 조건 변경 필요 
                  현재 조건: currentDiary.audioUrl && (!currentDiary.transcript?.trim() || String(currentDiary.transcript).includes("오디오 녹음본만 첨부"))
                  이 조건은 적절해 보임. "오디오 녹음본만 첨부"라는 텍스트는 전사 실패 시 나오는 문구일 수 있음.
                */}
                {currentDiary.transcript && typeof currentDiary.transcript === "string" && currentDiary.transcript.trim().length > 0 && (
                  <button
                    type="button"
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(currentDiary.transcript ?? "");
                        setTranscriptCopyTooltip(true);
                        setTimeout(() => setTranscriptCopyTooltip(false), 2000);
                      } catch {}
                    }}
                  >
                    {transcriptCopyTooltip ? "복사됨 ✓" : "복사"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={uploadingAudio}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
                    isRecording
                      ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 animate-pulse"
                      : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {isRecording ? "⏹️ 녹음 중지" : "🎙️ 앱에서 녹음"}
                </button>
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAudioUpload(file);
                    }
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => audioFileInputRef.current?.click()}
                  disabled={uploadingAudio}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                >
                  {uploadingAudio ? "업로드 중..." : "📁 녹음 파일 선택"}
                </button>
                {typeof window !== "undefined" && "showOpenFilePicker" in window && (
                  <button
                    type="button"
                    disabled={uploadingAudio}
                    className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-stone-50 disabled:opacity-50"
                    onClick={async () => {
                      try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                          handleAudioUpload(file);
                        }
                      } catch {}
                    }}
                  >
                    🔎 기기에서 녹음 찾기
                  </button>
                )}
              </div>
            </div>
            {(currentDiary.audioUrl || (currentDiary.transcript && typeof currentDiary.transcript === "string" && currentDiary.transcript.trim().length > 0)) && transcriptExpanded && (
              <div className="px-3 pb-3 space-y-3">
                  {/* 오디오 재생 */}
                  {currentDiary.audioUrl && (
                    <div className="rounded-lg bg-white p-3 border border-stone-200">
                      <p className="text-xs font-semibold text-stone-600 mb-2">🔊 녹음 재생</p>
                      <audio
                        controls
                        src={currentDiary.audioUrl}
                        className="w-full"
                        style={{ maxHeight: "40px" }}
                      >
                        브라우저가 오디오 재생을 지원하지 않습니다.
                      </audio>
                    </div>
                  )}
                  {/* 자동 캡션 텍스트 */}
                  {currentDiary.transcript && typeof currentDiary.transcript === "string" && currentDiary.transcript.trim().length > 0 && (
                    <div className="rounded-lg bg-white p-3 border border-stone-200">
                      <p className="text-xs font-semibold text-stone-600 mb-2">📝 자동 캡션 (전사 텍스트)</p>
                      <p className="whitespace-pre-wrap break-words text-sm text-stone-700 leading-relaxed">
                        {currentDiary.transcript}
                      </p>
                    </div>
                  )}
                  {currentDiary.audioUrl && (!currentDiary.transcript?.trim() || String(currentDiary.transcript).includes("오디오 녹음본만 첨부")) && (
                    <div className="rounded-lg bg-white p-3 border border-stone-200">
                      <p className="text-sm text-stone-500">오디오만 저장되어 있고 전사(글자)가 없어요.</p>
                      <p className="text-xs text-stone-400 mt-1">위의 「🎤 저장된 녹음으로 전사하기」를 누르면 앱에 저장된 녹음으로 자동 전사된 뒤, 「녹음 내용으로 전체 재생성」으로 일기를 다시 만들 수 있어요.</p>
                    </div>
                  )}
                  {!currentDiary.audioUrl && (!currentDiary.transcript || typeof currentDiary.transcript !== "string" || currentDiary.transcript.trim().length === 0) && (
                    <div className="rounded-lg bg-white p-3 border border-stone-200">
                      <p className="text-sm text-stone-500">오디오 녹음본만 첨부되었습니다.</p>
                    </div>
                  )}
                </div>
            )}
            {!currentDiary.audioUrl && (!currentDiary.transcript || typeof currentDiary.transcript !== "string" || currentDiary.transcript.trim().length === 0) && (
              <div className="px-3 pb-3">
                <p className="text-sm text-stone-500">
                  {isDraggingAudio 
                    ? "🎤 여기에 녹음 파일을 놓아주세요" 
                    : "아직 녹음 파일이 없어요. 위의 \"📁 녹음 파일 업로드\" 버튼을 눌러 추가하거나, 여기에 파일을 드래그 앤 드롭해주세요."}
                </p>
              </div>
            )}
          </div>
          {currentDiary.moodScore && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm font-semibold text-stone-700">오늘의 기분</span>
              {onEdit && (
                <button
                  type="button"
                  className="text-[11px] text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
                  onClick={() => onEdit(currentDiary, "mood")}
                >
                  수정
                </button>
              )}
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className={s <= currentDiary.moodScore ? "text-amber-400" : "text-stone-300"}
                  >
                    {s <= currentDiary.moodScore ? "⭐" : "☆"}
                  </span>
                ))}
              </div>
            </div>
          )}
          {currentDiary.timeline && currentDiary.timeline.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-900">📝 오늘 있었던 일</p>
                {onEdit && (
                  <button
                    type="button"
                    className="text-[11px] text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
                    onClick={() => onEdit(currentDiary, "timeline")}
                  >
                    전체 수정
                  </button>
                )}
              </div>
              <ul className="mt-2 space-y-1.5 pl-4">
                {currentDiary.timeline.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700 group">
                    {editingTimelineIndex === i ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <input
                          type="text"
                          value={editingTimelineValue}
                          onChange={(e) => setEditingTimelineValue(e.target.value)}
                          className="rounded-xl border border-amber-200 px-3 py-2 text-sm w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const next = [...(currentDiary.timeline || [])];
                              next[i] = editingTimelineValue.trim() || next[i];
                              setEditingTimelineIndex(null);
                              setCurrentDiary((prev) => ({ ...prev, timeline: next }));
                              onPatchDiary?.(currentDiary.id, { timeline: next });
                              fetch("/api/diary", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: currentDiary.id, timeline: next }),
                              }).catch(() => {});
                            }
                            if (e.key === "Escape") setEditingTimelineIndex(null);
                          }}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const next = [...(currentDiary.timeline || [])];
                              next[i] = editingTimelineValue.trim() || next[i];
                              setEditingTimelineIndex(null);
                              setCurrentDiary((prev) => ({ ...prev, timeline: next }));
                              await fetch("/api/diary", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: currentDiary.id, timeline: next }),
                              });
                              onPatchDiary?.(currentDiary.id, { timeline: next });
                            }}
                            className="text-xs rounded-lg bg-amber-500 text-white px-2.5 py-1"
                          >
                            저장
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTimelineIndex(null);
                              setEditingTimelineValue("");
                            }}
                            className="text-xs rounded-lg border border-stone-200 px-2.5 py-1"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-amber-500 shrink-0">•</span>
                        <span className="flex-1 min-w-0">{item}</span>
                        {onPatchDiary && (
                          <span className="shrink-0 opacity-0 group-hover:opacity-100 flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTimelineIndex(i);
                                setEditingTimelineValue(item);
                              }}
                              className="text-amber-600 hover:underline text-xs"
                              aria-label="수정"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("이 항목을 삭제할까요?")) return;
                                const next = (currentDiary.timeline || []).filter((_, idx) => idx !== i);
                                setCurrentDiary((prev) => ({ ...prev, timeline: next }));
                                await fetch("/api/diary", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: currentDiary.id, timeline: next }),
                                });
                                onPatchDiary?.(currentDiary.id, { timeline: next });
                              }}
                              className="text-rose-600 hover:underline text-xs"
                              aria-label="삭제"
                            >
                              삭제
                            </button>
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-900">💝 좋았던 일</p>
              <div className="flex items-center gap-2">
                {(currentDiary.transcript || currentDiary.summary) && (
                  <button
                    type="button"
                    disabled={extractingGoodThings}
                    onClick={async () => {
                      setExtractingGoodThings(true);
                      try {
                        const res = await fetch("/api/diary/extract-good-things", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ diaryId: currentDiary.id }),
                        });
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          throw new Error(data.error || "추출 실패");
                        }
                        const data = await res.json();
                        if (data.goodThingsByMember) {
                          setCurrentDiary((prev) => ({
                            ...prev,
                            goodThingsByMember: data.goodThingsByMember,
                          }));
                          onPatchDiary?.(currentDiary.id, {
                            goodThingsByMember: data.goodThingsByMember,
                          });
                          alert("좋았던 일이 자동으로 추출되었어요!");
                        }
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "좋았던 일 추출에 실패했어요.");
                      } finally {
                        setExtractingGoodThings(false);
                      }
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {extractingGoodThings ? "추출 중..." : "🤖 자동 추출"}
                  </button>
                )}
                {onEdit && (
                  <button
                    type="button"
                    className="text-[11px] text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
                    onClick={() => onEdit(currentDiary, "goodThings")}
                  >
                    수정
                  </button>
                )}
              </div>
            </div>
            {currentDiary.goodThingsByMember && Object.keys(currentDiary.goodThingsByMember).length > 0 ? (
              <div className="mt-2 space-y-3">
                {Object.entries(currentDiary.goodThingsByMember).map(([name, items]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${
                          memberColors[name] === "pink"
                            ? "bg-pink-100 text-pink-700"
                            : memberColors[name] === "blue"
                            ? "bg-blue-100 text-blue-700"
                            : memberColors[name] === "yellow"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {name === "엄마" ? "👩" : name === "아빠" ? "👨" : name === "아이" ? "👶" : "👤"} {name}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-amber-600"
                        onClick={() => onLoadHighlights(name)}
                      >
                        {highlights[name] ? "하이라이트 보기" : "하이라이트"}
                      </button>
                    </div>
                    {highlights[name] && (
                      <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                        {highlights[name]}
                      </p>
                    )}
                    {items.length > 0 ? (
                      <ul className="mt-1 space-y-1 pl-4 text-sm text-stone-600">
                        {items.map((item, i) => (
                          <li key={i} className="flex items-start gap-1.5 group">
                            {editingGoodThings?.member === name && editingGoodThings?.index === i ? (
                              <div className="flex-1 flex flex-col gap-2">
                                <input
                                  type="text"
                                  value={editingGoodThingsValue}
                                  onChange={(e) => setEditingGoodThingsValue(e.target.value)}
                                  className="rounded-xl border border-amber-200 px-3 py-2 text-sm w-full"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleUpdateGoodThing(name, i, editingGoodThingsValue);
                                    }
                                    if (e.key === "Escape") {
                                      setEditingGoodThings(null);
                                      setEditingGoodThingsValue("");
                                    }
                                  }}
                                />
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateGoodThing(name, i, editingGoodThingsValue)}
                                    className="text-xs rounded-lg bg-amber-500 text-white px-2.5 py-1"
                                  >
                                    저장
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGoodThings(null);
                                      setEditingGoodThingsValue("");
                                    }}
                                    className="text-xs rounded-lg border border-stone-200 px-2.5 py-1"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-amber-500 shrink-0">⭐</span>
                                <span className="flex-1 min-w-0">{item}</span>
                                {onPatchDiary && (
                                  <div className="shrink-0 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingGoodThings({ member: name, index: i });
                                        setEditingGoodThingsValue(item);
                                      }}
                                      className="text-stone-400 hover:text-amber-600 px-1"
                                      aria-label="수정"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGoodThing(name, i)}
                                      className="text-stone-400 hover:text-rose-600 px-1"
                                      aria-label="삭제"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-stone-400">내용 없음</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-400">
                {currentDiary.transcript || currentDiary.summary
                  ? "위의 '🤖 자동 추출' 버튼을 눌러서 녹음 내용과 일기 본문에서 좋았던 일을 자동으로 추출할 수 있어요."
                  : "녹음 내용이나 일기 본문이 없어서 자동 추출할 수 없어요."}
              </p>
            )}
          </div>
          {(currentDiary.keywords ?? []).length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-stone-700">키워드</p>
                {onEdit && (
                  <button
                    type="button"
                    className="text-[11px] text-amber-600 hover:text-amber-700 underline-offset-2 hover:underline"
                    onClick={() => onEdit(currentDiary, "keywords")}
                  >
                    수정
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(currentDiary.keywords ?? []).map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 hover:bg-amber-200"
                    onClick={() => { onKeywordClick?.(kw); onClose(); }}
                  >
                    #{kw}
                  </button>
                ))}
              </div>
            </div>
          )}
          {similarDiaries.length > 0 && onOpenDiary && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-stone-800 mb-2">🕐 이런 날도 있어요</p>
              <div className="space-y-2">
                {similarDiaries.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onOpenDiary(d)}
                    className="w-full rounded-2xl border border-amber-100 bg-amber-50/50 p-3 text-left text-sm transition hover:border-amber-200 hover:bg-amber-50"
                  >
                    <span className="font-medium text-amber-800" suppressHydrationWarning>
                      {formatDisplayDate(d.date)}
                    </span>
                    {d.location && <span className="ml-2 text-stone-500">· {d.location}</span>}
                    <p className="mt-1 line-clamp-2 text-stone-600">{d.summary || d.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-[44px] rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium"
              onClick={() => onShareLink(currentDiary.id)}
            >
              🔗 링크 공유
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium"
              onClick={() => onShareQR(currentDiary.id)}
            >
              📱 QR
            </button>
            <button
              type="button"
              className="min-h-[44px] rounded-2xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium"
              onClick={() => onPDF(currentDiary.id)}
            >
              📄 PDF
            </button>
            {onEdit && (
              <button
                type="button"
                className="min-h-[44px] rounded-2xl bg-amber-500 px-4 py-2 text-sm font-medium text-white"
                onClick={() => onEdit(currentDiary)}
              >
                수정
              </button>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}
