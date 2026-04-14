import imageCompression from "browser-image-compression";
import * as lamejs from "lamejs";

/**
 * 이미지 압축
 * - 4MB 이하로 줄임 (Vercel 제한 고려)
 * - 최대 너비 1920px
 */
export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 3.5, // 4.5MB 제한이므로 여유있게 3.5MB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    console.log(`[Compression] Image: ${file.size} -> ${compressedFile.size}`);
    return compressedFile;
  } catch (error) {
    console.error("이미지 압축 실패:", error);
    return file; // 실패 시 원본 반환
  }
}

/**
 * 오디오 압축 (MP3 변환)
 * - 4.5MB 제한을 맞추기 위해 노력
 * - 1채널(Mono), 샘플 레이트 다운샘플링, 비트레이트 조정
 */
export async function compressAudio(
  file: File, 
  options: { targetKbps?: number; targetSampleRate?: number } = {}
): Promise<File> {
  // 이미 작으면 패스 (4MB로 기준 하향) - 옵션이 있으면 강제 실행 가능하게 할 수도 있지만 일단 유지
  if (file.size < 4 * 1024 * 1024 && !options.targetKbps) return file;

  console.log(`[Compression] Audio start: ${file.size} bytes, options:`, options);

  try {
    const arrayBuffer = await file.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // 1채널로 믹스다운 & 다운샘플링 (용량 절감을 위해 필수)
    const channels = 1;
    const targetSampleRate = options.targetSampleRate || 22050; // 기본 22.05kHz
    const kbps = options.targetKbps || 24; // 기본 24kbps

    // 다운샘플링 수행 (OfflineAudioContext)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OfflineAudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineAudioContextClass(channels, audioBuffer.duration * targetSampleRate, targetSampleRate);
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    
    const resampledBuffer = await offlineCtx.startRendering();
    const samples = resampledBuffer.getChannelData(0); // Resampled data
    
    // MP3 인코딩
    const mp3encoder = new lamejs.Mp3Encoder(channels, targetSampleRate, kbps);
    const mp3Data: Int8Array[] = [];
    
    // Float32 -> Int16 변환
    // lamejs는 Int16Array를 받음 (-32768 ~ 32767)
    // MPEG2 sample block size = 576 (MPEG1 is 1152)
    // 하지만 lamejs가 내부적으로 처리할 수도 있음. 안전하게 1152 단위로 처리하되, 
    // lamejs가 필요로 하는 샘플 수는 encodeBuffer 호출 시 유동적일 수 있음.
    // 보통 1152로 보내면 알아서 버퍼링함.
    const sampleBlockSize = 1152; 
    const int16Samples = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      // 클리핑 방지
      const s = Math.max(-1, Math.min(1, samples[i]));
      int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    let remaining = int16Samples.length;
    let i = 0;
    while (remaining >= sampleBlockSize) {
      const left = int16Samples.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(left);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
      remaining -= sampleBlockSize;
      i += sampleBlockSize;
    }
    
    const mp3buf = mp3encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
    
    // Blob 생성 시 Int8Array[] -> Blob 호환성 문제 해결을 위해 any 캐스팅 또는 타입 단언 사용
    const blobParts = mp3Data as unknown as BlobPart[];
    const blob = new Blob(blobParts, { type: "audio/mp3" });
    const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".mp3", {
      type: "audio/mp3",
      lastModified: Date.now(),
    });

    console.log(`[Compression] Audio: ${file.size} -> ${compressedFile.size}`);
    
    // 압축 결과 반환 (크기 체크는 호출하는 쪽에서 담당)
    return compressedFile;
  } catch (error) {
    console.error("오디오 압축 실패:", error);
    // 실패 시 원본 반환 (어차피 업로드 실패하겠지만)
    return file;
  }
}
