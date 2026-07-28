const SVG_NS = "http://www.w3.org/2000/svg";

/** Recharts SVG를 흰 배경 + 문항 제목 포함한 PNG Blob으로 래스터화 */
function svgToPngBlob(svg: SVGSVGElement, title: string): Promise<Blob | null> {
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const titleHeight = title ? 40 : 0;
  const totalHeight = height + titleHeight;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(totalHeight));
  clone.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);

  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("transform", `translate(0, ${titleHeight})`);
  while (clone.firstChild) {
    group.appendChild(clone.firstChild);
  }
  clone.appendChild(group);

  if (title) {
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", "8");
    text.setAttribute("y", "26");
    text.setAttribute("fill", "#111111");
    text.setAttribute("font-size", "15");
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-family", "'Malgun Gothic', 'Noto Sans KR', sans-serif");
    text.textContent = title.length > 42 ? `${title.slice(0, 42)}…` : title;
    clone.insertBefore(text, group);
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = totalHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, totalHeight);
      ctx.drawImage(image, 0, 0, width, totalHeight);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    image.onerror = () => resolve(null);
    image.src = svgUrl;
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type CaptureResult = "copied" | "downloaded" | "failed";

/**
 * 문항 그래프를 클립보드로 복사(캡처). 붙여넣기(Ctrl+V)로 한글 등에 바로 삽입 가능.
 * 클립보드 이미지 복사를 지원하지 않으면 PNG 다운로드로 대체.
 */
export async function captureSvgToClipboard(
  svg: SVGSVGElement,
  title: string,
  filename: string,
): Promise<CaptureResult> {
  const blob = await svgToPngBlob(svg, title);
  if (!blob) {
    return "failed";
  }

  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      return "copied";
    }
  } catch {
    // 클립보드 실패 시 다운로드로 대체
  }

  triggerDownload(blob, filename);
  return "downloaded";
}

/** 문항 그래프를 PNG 파일로 저장 */
export async function downloadSvgAsPng(svg: SVGSVGElement, filename: string, title: string) {
  const blob = await svgToPngBlob(svg, title);
  if (blob) {
    triggerDownload(blob, filename);
  }
}
