const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Recharts가 그린 SVG를 흰 배경 PNG로 저장 (한글 문서 첨부용).
 * 문항 제목을 상단에 함께 그려 넣어, 이미지만 봐도 어느 문항인지 알 수 있게 합니다.
 */
export function downloadSvgAsPng(svg: SVGSVGElement, filename: string, title: string) {
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

  // 기존 차트 내용을 제목 높이만큼 아래로 이동
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

  const image = new Image();
  image.onload = () => {
    const scale = 2; // 고해상도
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = totalHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, totalHeight);
    ctx.drawImage(image, 0, 0, width, totalHeight);

    canvas.toBlob((blob) => {
      if (!blob) {
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };
  image.src = svgUrl;
}
