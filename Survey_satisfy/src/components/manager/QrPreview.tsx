"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface QrPreviewProps {
  url: string;
  downloadFileName?: string;
}

export function QrPreview({ url, downloadFileName = "CCON_설문_QR.png" }: QrPreviewProps) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    }).then(setDataUrl);
  }, [url]);

  function handleDownload() {
    if (!dataUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = downloadFileName;
    anchor.click();
  }

  if (!dataUrl) {
    return <div className="grid h-56 w-56 place-items-center border border-[var(--hairline)] text-sm text-[var(--text-muted)]">QR 생성 중</div>;
  }

  return (
    <div className="grid gap-3">
      <div className="inline-flex bg-white p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt="설문 응답 QR 코드" width={220} height={220} />
      </div>
      <button
        type="button"
        onClick={handleDownload}
        className="focus-ring label-machined border border-[var(--hairline)] px-4 py-3 text-sm text-[var(--text-body)] transition-colors hover:border-white hover:text-white"
      >
        QR코드 다운로드
      </button>
    </div>
  );
}
