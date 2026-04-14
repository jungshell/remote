import { NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";
import sharp from "sharp";
import exifReader from "exif-reader";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL ?? "Salesforce/blip-image-captioning-base";

// Hugging Face API를 사용한 사진 분석 (Gemini 폴백용)
async function analyzePhotoWithHuggingFace(imageBase64: string) {
  if (!HUGGINGFACE_API_KEY) {
    console.warn("[사진 분석] HUGGINGFACE_API_KEY가 설정되지 않아 Hugging Face 폴백을 사용할 수 없습니다.");
    throw new Error("HUGGINGFACE_API_KEY is missing");
  }

  try {
    // Hugging Face Inference API - BLIP 모델을 사용하여 이미지 캡션 생성
    // base64를 Buffer로 변환하여 바이너리로 전송
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HUGGINGFACE_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/octet-stream",
        },
        body: imageBuffer,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      // 모델이 로딩 중일 수 있음 (503)
      if (response.status === 503) {
        // 잠시 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 5000));
        const retryResponse = await fetch(
          `https://api-inference.huggingface.co/models/${HUGGINGFACE_MODEL}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
            },
            body: imageBuffer,
          },
        );
        if (!retryResponse.ok) {
          throw new Error(`Hugging Face API error: ${retryResponse.status}`);
        }
        const retryData = await retryResponse.json();
        const caption = Array.isArray(retryData) ? retryData[0]?.generated_text : retryData.generated_text || "";
        
        return {
          tags: extractTags(caption),
          location: extractLocation(caption),
          activity: extractActivity(caption),
          people: extractPeople(caption),
          caption: caption || "사진이 업로드되었습니다",
          title: caption.split(".")[0] || "일상",
          emotion: "평온",
        };
      }
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const caption = Array.isArray(data) ? data[0]?.generated_text : data.generated_text || "";

    // Hugging Face 결과를 Gemini 형식으로 변환
    return {
      tags: extractTags(caption),
      location: extractLocation(caption),
      activity: extractActivity(caption),
      people: extractPeople(caption),
      caption: caption || "사진이 업로드되었습니다",
      title: caption.split(".")[0] || "일상",
      emotion: "평온",
    };
  } catch (error: any) {
    console.error("Hugging Face 분석 실패:", error);
    throw error;
  }
}

// 간단한 텍스트 파싱 헬퍼 함수들
function extractTags(text: string): string[] {
  const tags: string[] = [];
  const commonTags = ["음식", "피자", "고기", "카페", "공원", "미용실", "집", "테이블", "의자"];
  commonTags.forEach(tag => {
    if (text.includes(tag)) tags.push(tag);
  });
  return tags;
}

function extractLocation(text: string): string | null {
  const locations = ["음식점", "레스토랑", "카페", "미용실", "공원", "집", "상점"];
  for (const loc of locations) {
    if (text.includes(loc)) return loc;
  }
  return null;
}

function extractActivity(text: string): string {
  const activities = ["먹기", "자르기", "산책", "쇼핑", "놀기"];
  for (const act of activities) {
    if (text.includes(act)) return act;
  }
  return "기타";
}

function extractPeople(text: string): string[] {
  const people: string[] = [];
  const commonPeople = ["아이", "엄마", "아빠", "사람"];
  commonPeople.forEach(person => {
    if (text.includes(person)) people.push(person);
  });
  return people;
}

async function analyzePhotoWithGemini(imageBase64: string) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                text: [
                  "이 사진을 정확하게 분석해서 다음 JSON 형식으로 응답해줘:",
                  "",
                  "⚠️ 절대 중요: 사진에 실제로 보이는 것만 기록하세요. 추측하거나 만들지 마세요.",
                  "",
                  "분석 단계:",
                  "1. 사진을 자세히 보고 배경, 물체, 사람, 활동을 구체적으로 파악하기",
                  "2. 배경과 환경에서 위치 파악하기 (예: 실내/야외, 어떤 종류의 장소인지)",
                  "3. 사람들이 하고 있는 구체적인 활동 파악하기",
                  "4. 먹는 음식이 있으면 구체적으로 무엇인지 파악하기",
                  "5. 시간대 단서 찾기 (조명, 창문, 시계 등)",
                  "",
                  "{",
                  '  "tags": ["사진에 실제로 보이는 구체적인 것들만, 예: 피자, 고기, 미용실, 공원, 테이블, 음식 등"],',
                  '  "location": "사진의 배경에서 보이는 구체적인 장소 (예: 음식점/레스토랑, 미용실, 공원, 카페, 집, 상점 등) 또는 null - 반드시 사진에 보이는 환경을 기반으로",',
                  '  "activity": "사진에서 보이는 사람들이 실제로 하고 있는 구체적인 활동 (예: 고기 구워 먹기, 음식 먹기, 머리 자르기, 산책, 쇼핑, 기타)",',
                  '  "people": ["사진에 실제로 보이는 사람들, 예: 아이, 엄마, 아빠, 이발사 등"],',
                  '  "caption": "사진에 실제로 보이는 내용을 구체적으로 설명 (예: \\"음식점에서 아이가 고기 구이를 먹고 있다\\" 또는 \\"미용실에서 아이가 머리를 자르고 있다\\")",',
                  '  "title": "이 사진 한 장만 보면 어떤 일이었는지 간단히 (예: \\"음식점에서 고기 먹기\\" 또는 \\"미용실에서 머리 자르기\\")",',
                  '  "emotion": "사진 속 사람들의 감정 (기쁨/평온/설렘/집중/기타)"',
                  "}",
                  "",
                  "⚠️ 금지 사항:",
                  "- 사진에 보이지 않는 것은 절대 만들지 마세요",
                  "- 크레파스, 게임, 그림 그리기, 낮잠, VR 등은 사진에 명확히 보이지 않으면 쓰지 마세요",
                  "- 사진의 실제 배경과 환경을 무시하지 마세요 (예: 집이 아니라 음식점이 보이면 음식점이라고 하세요)",
                  "- 시간대를 추측하지 마세요 (사진에 시각 정보가 없으면 기록하지 마세요)",
                  "",
                  "한국어로 응답하고, JSON만 출력해줘.",
                ].join("\n"),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          response_mime_type: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    // Gemini 한도 초과(429) 또는 다른 에러 시 Hugging Face로 폴백
    if (response.status === 429 || response.status === 503) {
      console.log(`[사진 분석] Gemini 한도 초과 (${response.status}), Hugging Face로 폴백 시도`);
      throw new Error("GEMINI_QUOTA_EXCEEDED");
    }
    throw new Error(`Gemini Vision error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    return JSON.parse(text);
  } catch {
    return {
      tags: [],
      location: null,
      activity: "기타",
      people: [],
      caption: "",
      title: "",
      emotion: "평온",
    };
  }
}

// 통합 사진 분석 함수 (Gemini 실패 시 Hugging Face로 폴백)
async function analyzePhoto(imageBase64: string) {
  try {
    // 먼저 Gemini 시도
    return await analyzePhotoWithGemini(imageBase64);
  } catch (error: any) {
    // Gemini 한도 초과 또는 에러 시 Hugging Face로 폴백
    if (error.message === "GEMINI_QUOTA_EXCEEDED" || error.message.includes("429") || error.message.includes("503")) {
      console.log("[사진 분석] Gemini 한도 초과로 Hugging Face로 전환");
      try {
        return await analyzePhotoWithHuggingFace(imageBase64);
      } catch (hfError: any) {
        console.error("[사진 분석] Hugging Face도 실패, 기본값 반환:", hfError);
        // 둘 다 실패하면 기본값 반환
        return {
          tags: [],
          location: null,
          activity: "기타",
          people: [],
          caption: "사진 분석에 실패했습니다",
          title: "",
          emotion: "평온",
        };
      }
    }
    // 다른 에러는 그대로 throw
    throw error;
  }
}

async function extractFaceFeatures(imageBase64: string) {
  if (!GEMINI_API_KEY) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                text: [
                  "이 사진에 있는 사람들의 얼굴 특징을 정확하게 분석해서 다음 JSON 형식으로 응답해줘:",
                  "{",
                  '  "people": [',
                  '    {',
                  '      "gender": "남성/여성",',
                  '      "age": "성인/아이",',
                  '      "hasBeard": true/false,',
                  '      "hairColor": "검은색/갈색/기타",',
                  '      "hairStyle": "짧은머리/긴머리/앞머리있음/기타",',
                  '      "faceShape": "둥근형/긴형/각진형/기타",',
                  '      "eyeSize": "큰눈/작은눈/보통",',
                  '      "glasses": true/false,',
                  '      "description": "얼굴 특징 상세 설명 (예: 수염 있는 남성, 긴 머리의 여성, 짧은 머리의 남자 아이 등)"',
                  '    }',
                  '  ]',
                  "}",
                  "중요:",
                  "- 수염이 있으면 반드시 hasBeard: true로 표시",
                  "- 성인 여성은 gender: 여성, age: 성인",
                  "- 남자 아이는 gender: 남성, age: 아이",
                  "- 사진에 여러 사람이 있으면 모두 분석해줘",
                  "한국어로 응답하고, JSON만 출력해줘.",
                ].join("\n"),
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    let files = formData.getAll("files") as File[];
    const diaryId = formData.get("diaryId") as string | null;
    const timestamp = formData.get("timestamp") as string | null;

    console.log(`[API] 받은 파일 개수: ${files.length}`);
    if (files.length > 0) {
      files.forEach((file, idx) => {
        console.log(`[API] 파일 ${idx + 1}: ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
      });
    }

    if (!files || files.length === 0) {
      const singleFile = formData.get("file") as File | null;
      if (!singleFile) {
        return NextResponse.json({ error: "No file" }, { status: 400 });
      }
      files = [singleFile];
      console.log(`[API] 단일 파일 모드로 전환: ${singleFile.name}`);
    }

    console.log(`[API] 사진 업로드 시작: ${files.length}개 파일`);

    // 파일 크기 제한 (50MB - 서버에서 리사이징하므로 여유있게)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `파일 크기가 너무 큽니다: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)` },
          { status: 400 }
        );
      }
    }

    const results = [];
    const faceFeatures: Array<{features: any; photoUrl: string}> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) {
        console.warn(`[API] 파일 ${i + 1}/${files.length}: 파일이 null입니다.`);
        continue;
      }
      
      try {
        console.log(`[API] 처리 시작: ${i + 1}/${files.length} - ${file.name} (${(file.size / 1024).toFixed(2)}KB)`);
        const originalBuffer = Buffer.from(await file.arrayBuffer());
      
      // EXIF 메타데이터에서 날짜, 시간, GPS 좌표 추출
      let photoDate: string | null = null;
      let photoTime: string | null = null;
      let photoLocation: string | null = null;
      let photoLatitude: number | null = null;
      let photoLongitude: number | null = null;
      
      try {
        const metadata = await sharp(originalBuffer).metadata();
        if (metadata.exif) {
          // Sharp가 제공하는 EXIF 버퍼를 exif-reader로 파싱
          const exifData: any = exifReader(metadata.exif);
          
          // 날짜/시간 추출 (우선순위: DateTimeOriginal > DateTimeDigitized > DateTime)
          // EXIF 날짜는 UTC가 아닌 로컬 시간이므로 그대로 사용
          const exifDate: any =
            exifData?.Photo?.DateTimeOriginal ||
            exifData?.Photo?.DateTimeDigitized ||
            exifData?.Image?.DateTime;

          if (exifDate instanceof Date) {
            // Date 객체인 경우 로컬 시간 그대로 사용 (타임존 변환 없음)
            // UTC 변환을 하지 않고 로컬 시간 그대로 사용하여 날짜가 하루 차이나는 문제 방지
            const year = exifDate.getFullYear();
            const month = String(exifDate.getMonth() + 1).padStart(2, "0");
            const day = String(exifDate.getDate()).padStart(2, "0");
            const hours = String(exifDate.getHours()).padStart(2, "0");
            const minutes = String(exifDate.getMinutes()).padStart(2, "0");
            const seconds = String(exifDate.getSeconds()).padStart(2, "0");
            photoDate = `${year}-${month}-${day}`;
            photoTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
            console.log(`[EXIF] 날짜/시간 추출(날짜 객체): ${photoDate} ${photoTime} (로컬 시간, 타임존 변환 없음)`);
          } else if (typeof exifDate === "string") {
            // 문자열 형식 "YYYY:MM:DD HH:MM:SS" 또는 "YYYY-MM-DD HH:MM:SS" 처리
            // EXIF 표준 형식: "YYYY:MM:DD HH:MM:SS"
            let dateTimeMatch = exifDate.match(/(\d{4})[:/-](\d{2})[:/-](\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (dateTimeMatch) {
              const [, year, month, day, hours, minutes, seconds] = dateTimeMatch;
              photoDate = `${year}-${month}-${day}`;
              photoTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
              console.log(`[EXIF] 날짜/시간 추출(문자열): ${photoDate} ${photoTime}`);
            } else {
              // 날짜만 있는 경우 "YYYY:MM:DD" 또는 "YYYY-MM-DD"
              const dateMatch = exifDate.match(/(\d{4})[:/-](\d{2})[:/-](\d{2})/);
              if (dateMatch) {
                const [, year, month, day] = dateMatch;
                photoDate = `${year}-${month}-${day}`;
                console.log(`[EXIF] 날짜 추출(문자열, 시간 없음): ${photoDate}`);
              }
            }
          } else if (typeof exifDate === "number") {
            // Unix 타임스탬프인 경우
            const date = new Date(exifDate * 1000); // 초 단위면 1000 곱하기
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            photoDate = `${year}-${month}-${day}`;
            console.log(`[EXIF] 날짜 추출(타임스탬프): ${photoDate}`);
          }

          // GPS 좌표 추출
          const gps = exifData?.GPS;
          if (gps) {
            try {
              // GPS 좌표를 도(degree) 형식으로 변환
              const convertDMSToDD = (dms: any, ref: string): number | null => {
                if (!dms) return null;
                
                // 이미 숫자(도 형식)인 경우
                if (typeof dms === "number") {
                  return ref === "S" || ref === "W" ? -dms : dms;
                }
                
                // 배열 형식 (도/분/초)인 경우
                if (Array.isArray(dms) && dms.length >= 3) {
                  let dd = dms[0] + dms[1] / 60 + dms[2] / 3600;
                  if (ref === "S" || ref === "W") {
                    dd = -dd;
                  }
                  return dd;
                }
                
                return null;
              };

              if (gps.GPSLatitude && gps.GPSLatitudeRef && gps.GPSLongitude && gps.GPSLongitudeRef) {
                photoLatitude = convertDMSToDD(gps.GPSLatitude, gps.GPSLatitudeRef);
                photoLongitude = convertDMSToDD(gps.GPSLongitude, gps.GPSLongitudeRef);
                
                if (photoLatitude !== null && photoLongitude !== null) {
                  console.log(`[EXIF] GPS 좌표 추출: ${photoLatitude}, ${photoLongitude}`);

                  // 역지오코딩으로 위치 이름 가져오기
                  try {
                    const reverseGeocodeRes = await fetch(
                      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${photoLatitude}&lon=${photoLongitude}&accept-language=ko`,
                      {
                        headers: {
                          "User-Agent": "FamilyDiaryApp",
                          "Accept-Language": "ko",
                        },
                      }
                    );

                    if (reverseGeocodeRes.ok) {
                      const geoData = await reverseGeocodeRes.json();
                      const address = geoData?.address;
                      if (address) {
                        // 더 정확한 위치 정보 추출
                        // 우선순위: 유명한 장소명 > district(구) > city > town > municipality > village > state > country
                        const locationParts: string[] = [];
                        
                        // 유명한 장소명 (예: 호치민시, 방콕 등)
                        // 또는 district(구) 정보가 있으면 포함
                        const district = address.district || address.suburb || address.neighbourhood;
                        const cityName = address.city || address.town || address.municipality || address.village;
                        
                        // 도시명이 있으면 우선 사용
                        if (cityName) {
                          // 호치민 같은 경우 "Ho Chi Minh City"로 나올 수 있음
                          const cityDisplayName = cityName.replace(/ City$/, "").replace(/^Ho Chi Minh$/, "호치민");
                          locationParts.push(cityDisplayName);
                          
                          // 구(district) 정보가 있으면 함께 표시 (예: "호치민 1구")
                          if (district && district !== cityName) {
                            locationParts.push(district);
                          }
                        } else if (district) {
                          // 도시명이 없고 구만 있으면 구 사용
                          locationParts.push(district);
                        }
                        
                        // 국가 정보
                        const countryName = address.country;
                        if (countryName) {
                          // 한국어로 국가명 변환 (일부 주요 국가)
                          const countryMap: Record<string, string> = {
                            "Vietnam": "베트남",
                            "Thailand": "태국",
                            "Malaysia": "말레이시아",
                            "Singapore": "싱가포르",
                            "Indonesia": "인도네시아",
                            "Philippines": "필리핀",
                            "Japan": "일본",
                            "China": "중국",
                            "South Korea": "한국",
                            "United States": "미국",
                          };
                          const countryKorean = countryMap[countryName] || countryName;
                          // 도시명과 국가명이 다를 때만 추가
                          if (!cityName || cityName !== countryName) {
                            locationParts.push(countryKorean);
                          }
                        }
                        
                        photoLocation = locationParts.length > 0 ? locationParts.join(", ") : null;
                        
                        console.log(`[EXIF] 역지오코딩 결과: ${photoLocation} (${photoLatitude}, ${photoLongitude})`);
                        console.log(`[EXIF] 전체 주소 정보:`, JSON.stringify(address, null, 2));
                      }
                    }
                  } catch (geoError) {
                    console.warn("[EXIF] 역지오코딩 실패:", geoError);
                  }
                } else {
                  console.warn(`[EXIF] GPS 좌표 변환 실패: ${JSON.stringify(gps)}`);
                }
              }
            } catch (gpsError) {
              console.warn("[EXIF] GPS 좌표 처리 실패:", gpsError);
            }
          }
        }
        // 파일명에서 날짜 추출 시도 (IMG_20260120_xxx.jpg 형식)
        if (!photoDate && file.name) {
          const filenameMatch = file.name.match(/(\d{4})(\d{2})(\d{2})/);
          if (filenameMatch) {
            const [, year, month, day] = filenameMatch;
            photoDate = `${year}-${month}-${day}`;
            console.log(`[EXIF] 파일명에서 날짜 추출: ${photoDate}`);
          }
        }
      } catch (exifError) {
        console.warn("[EXIF] 메타데이터 추출 실패:", exifError);
      }
      
      // 서버 사이드에서 리사이징 (썸네일용: 800x800, 품질 80%)
      // EXIF orientation 정보를 자동으로 반영하여 올바른 방향으로 회전
      let resizedBuffer: Buffer;
      try {
        resizedBuffer = await sharp(originalBuffer)
          .rotate() // EXIF orientation 정보에 따라 자동 회전
          .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toBuffer();
        console.log(`리사이즈 완료: ${(originalBuffer.length / 1024).toFixed(2)}KB -> ${(resizedBuffer.length / 1024).toFixed(2)}KB`);
      } catch (resizeError) {
        console.error(`리사이즈 실패, 원본 사용:`, resizeError);
        resizedBuffer = originalBuffer;
      }
      
      const buffer = resizedBuffer;
      
      // 리사이즈된 이미지로 분석 (항상 작으므로 base64 변환 가능)
      const base64 = buffer.toString("base64");

      const [analysis, features] = await Promise.all([
        analyzePhoto(base64).catch((err) => {
          console.error(`사진 분석 실패 (${file.name}):`, err);
          // 분석 실패해도 기본값 반환 (일기 생성은 계속 진행)
          return {
            tags: [],
            location: null,
            activity: "기타",
            people: [],
            caption: "사진이 업로드되었습니다",
            title: "",
            emotion: "평온",
          };
        }),
        extractFaceFeatures(base64).catch((err) => {
          console.error(`얼굴 특징 추출 실패 (${file.name}):`, err);
          return null;
        }),
      ]);

      const photoId = randomUUID();
      let publicUrl: string;
      
      try {
        const bucket = adminStorage.bucket();
        if (!bucket) {
          throw new Error("Firebase Storage bucket not configured");
        }
        
        const fileName = `photos/${photoId}.jpg`;
        const fileRef = bucket.file(fileName);

        // 타임아웃 설정 (30초)
        const uploadPromise = fileRef.save(Buffer.from(buffer), {
          metadata: {
            contentType: file.type || "image/jpeg",
            metadata: {
              diaryId: diaryId || "",
              timestamp: timestamp || new Date().toISOString(),
              ...analysis,
            },
          },
        });

        await Promise.race([
          uploadPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Upload timeout")), 30000)
          )
        ]);

        await fileRef.makePublic();

        publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        console.log(`업로드 성공: ${file.name} -> ${publicUrl}`);
      } catch (storageError: any) {
        console.error(`Firebase Storage upload error (${file.name}):`, storageError);
        // Firebase Storage 실패 시 base64 데이터 URL 사용 (리사이즈된 이미지는 작으므로 항상 가능)
        publicUrl = `data:image/jpeg;base64,${base64}`;
        console.log(`Using base64 fallback for photo: ${photoId}`);
      }

      // 장소는 EXIF GPS 정보만 사용 (사진 분석 결과의 location은 무시)
      // EXIF에서 추출한 위치 정보가 있으면 그것만 사용, 없으면 null
      const finalLocation = photoLocation || null; // 사진 분석 location은 사용하지 않음
      
      console.log(`[API] 최종 위치 정보: EXIF=${photoLocation || "없음"}, 분석=${analysis?.location || "없음"}, 최종=${finalLocation || "없음"}`);
      
      results.push({
        id: photoId,
        url: publicUrl,
        analysis: {
          ...analysis,
          location: finalLocation, // EXIF GPS에서만 추출한 위치 사용 (사진 분석 location 무시)
          photoDate, // EXIF에서 추출한 날짜 추가
          photoTime, // EXIF에서 추출한 시간 추가 (ISO 8601 형식)
          photoLatitude, // GPS 위도 (디버깅용)
          photoLongitude, // GPS 경도 (디버깅용)
        },
      });

        if (features && features.people && features.people.length > 0) {
          faceFeatures.push({
            features: features.people,
            photoUrl: publicUrl,
          });
        }
        
        console.log(`[API] 처리 완료: ${i + 1}/${files.length} - ${file.name} (성공)`);
      } catch (fileError: any) {
        console.error(`[API] 파일 처리 실패: ${i + 1}/${files.length} - ${file.name}`, fileError);
        console.error(`[API] 에러 스택:`, fileError.stack);
        // 개별 파일 실패해도 다음 파일 계속 처리
        continue;
      }
    }

    console.log(`[API] 사진 업로드 완료: ${results.length}개 성공 (요청: ${files.length}개)`);
    
    if (results.length !== files.length) {
      console.warn(`[API] 경고: 요청한 파일 ${files.length}개 중 ${results.length}개만 처리됨`);
    }
    
    return NextResponse.json({
      photos: results,
      faceFeatures: faceFeatures.length > 0 ? faceFeatures : undefined,
    });
  } catch (error: any) {
    console.error("Photo upload error:", error);
    console.error("Error stack:", error.stack);
    
    // 클라이언트에 전달할 오류 메시지
    const errorMessage = error.message || "Upload failed";
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { 
        status: error.message?.includes("timeout") ? 504 : 500 
      },
    );
  }
}
