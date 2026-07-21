"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface QrPreviewProps {
  url: string;
  downloadFileName?: string;
  size?: number;
  title?: string;
  fullscreen?: boolean;
  onClose?: () => void;
}

export function QrPreview({
  url,
  downloadFileName = "CCON_설문_QR.png",
  size = 220,
  title,
  fullscreen,
  onClose,
}: QrPreviewProps) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 1,
      width: size,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }).then(setDataUrl);
  }, [url, size]);

  function handleDownload() {
    if (!dataUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = downloadFileName;
    anchor.click();
  }

  async function handleShare() {
    if (!navigator.share) {
      await navigator.clipboard.writeText(url);
      return;
    }

    try {
      await navigator.share({
        title: title ?? "만족도 설문",
        text: title ?? "설문에 참여해 주세요.",
        url,
      });
    } catch {
      // 사용자가 공유를 취소한 경우
    }
  }

  const body = !dataUrl ? (
    <div
      className="grid place-items-center border border-[var(--hairline)] text-sm text-[var(--text-muted)]"
      style={{ width: size, height: size }}
    >
      QR 생성 중
    </div>
  ) : (
    <div className="grid gap-3">
      <div className="inline-flex justify-center bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="설문 응답 QR 코드" width={size} height={size} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleDownload}
          className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-4 py-3 text-sm text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
        >
          QR 저장
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="focus-ring label-machined min-h-11 border border-white px-4 py-3 text-sm transition-colors hover:bg-white hover:text-black"
        >
          공유
        </button>
      </div>
    </div>
  );

  if (!fullscreen) {
    return body;
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-scale flex-col bg-black px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label-machined text-[var(--accent)]">CCON · QR Share</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">충남콘텐츠진흥원</p>
          <h2 className="mt-2 text-lg font-bold text-white">{title ?? "설문 QR"}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring label-machined min-h-11 border border-[var(--hairline)] px-4 text-sm text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
        >
          닫기
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {body}
        <p className="max-w-sm break-all text-center font-mono text-xs text-[var(--text-muted)]">{url}</p>
      </div>
    </div>
  );
}
