import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getEmbedding, cosineSimilarity } from './embeddingService';

import knowledgeBase from '../data/knowledge.json';
import { DEEP_LINKS } from '../data/productivity';

// 담당 부서 연계 (정확도 향상): 규정 해석 애매 시 안내용. 필요 시 수정.
export const CONTACT_DEPARTMENT = {
    default: '담당 부서(총무·인사·해당 업무 담당)',
    regulation: '제규정 담당',
    budget: '예산·회계 담당'
};

// 법령 DB 연동 스텁 (정확도 향상). 추후 국가법령정보센터 등 API 연동 시 여기서 조회해 context에 추가.
export const getExternalLawContext = async (_query) => {
    // TODO: 법령 API 연동 시 유효한 텍스트 반환
    return null;
};

// Initialize Gemini
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing! Check your .env file or server restart status.");
}
const genAI = new GoogleGenerativeAI(apiKey);

// Real-time Knowledge Base
let runtimeKnowledgeBase = [...knowledgeBase];
let unsubscribeKnowledge = null;

export const initKnowledgeSync = () => {
    if (!db) return;
    if (unsubscribeKnowledge) return;

    console.log("Initializing Knowledge Base Sync...");
    const colRef = collection(db, 'knowledge');
    unsubscribeKnowledge = onSnapshot(colRef, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (docs.length > 0) {
            console.log(`Synced ${docs.length} knowledge items from Firestore.`);
            runtimeKnowledgeBase = docs;
        }
    }, (error) => {
        console.error("Knowledge Sync Error:", error);
    });
};

const findRelevantContext = async (query, categoryPreference = 'all') => {
    const keywords = query.split(/\s+/).filter(w => w.length > 1);

    // 진흥원 규정 선택 시 제규정만 검색 (e나라도움 등 다른 문서 참조 방지). UI는 '규정', 레거시 'ctia' 통일.
    const effectiveCategory = (categoryPreference === 'ctia' || categoryPreference === '규정') ? '규정' : categoryPreference;

    // 1. Get Query Embedding
    let queryEmbedding = [];
    try {
        queryEmbedding = await getEmbedding(query);
    } catch (e) {
        console.warn("Embedding generation failed, falling back to keyword search", e);
    }
    const useVector = queryEmbedding && queryEmbedding.length > 0;

    // Filter by category (제규정 선택 시 해당 카테고리만 사용)
    const base = effectiveCategory === 'all'
        ? runtimeKnowledgeBase
        : runtimeKnowledgeBase.filter(chunk => chunk.category === effectiveCategory);
    
    const scores = base.map(chunk => {
        // Keyword Score
        let keywordScore = 0;
        keywords.forEach(keyword => {
            if (chunk.content.includes(keyword)) keywordScore += 1;
        });
        
        // Vector Score
        let vectorScore = 0;
        if (useVector && chunk.embedding && chunk.embedding.length > 0) {
            vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
        }
        
        // Combined Score
        let finalScore = 0;
        if (useVector && chunk.embedding) {
            // Vector similarity is -1 to 1. Usually 0.7+ is relevant.
            // Keywords are integers.
            // Hybrid Formula: (Vector * 3) + Keyword
            finalScore = (vectorScore * 3.0) + keywordScore;
        } else {
            // Fallback for items without embedding
            finalScore = keywordScore;
        }

        return { ...chunk, score: finalScore, vectorScore, keywordScore };
    });

    // 상위 10개 청크 사용(조문 단위 검색 시 해당 조문이 누락되지 않도록), 최소 유사도로 허용
    const MIN_VECTOR_SCORE = 0.25; // 유사도가 너무 낮은 청크는 제외(단, 키워드 일치 시 조문 검색 허용)
    const results = scores
        .filter(chunk => {
            const passScore = chunk.score > 0.5 || chunk.keywordScore > 0;
            const passVector = !useVector || chunk.vectorScore >= MIN_VECTOR_SCORE || chunk.keywordScore > 0;
            return passScore && passVector;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    return {
        text: results.map(r => r.content).join("\n\n"),
        metadata: results.map(r => ({
            source: r.source,
            page: r.page,
            excerpt: r.content ? String(r.content).substring(0, 1200) : '',
            fileUrl: r.fileUrl || null
        }))
    };
};

const SYSTEM_INSTRUCTION = {
    employee: `당신은 '충콘지니'입니다. 🧞‍♂️
    충남콘텐츠진흥원 전용 AI 비서로서, 사용자의 질문에 답합니다.

    [지식 범주 필터]
    사용자가 특정 범주(예: e나라도움, 진흥원 규정)를 선택한 경우, 해당 문서 위주로 답변하세요.

    [답변 원칙]
    1. **요약**: 첫 줄은 질문에 대한 핵심 요약을 1문장으로 작성합니다. (이모지 포함)
    2. **내용**: 세부 내용은 불렛포인트(•)와 줄바꿈으로 **한 줄에 하나의 조각**씩 제공합니다.
    3. **경로**: 시스템 이용법일 경우 '경로:'를 별도 줄에 표기합니다.

    [규정·절차·양식 질문일 때 - 반드시 준수]
    질문이 규정, 절차, 서식, 양식, 지침, 공고 등과 관련되면 **상세히** 답변하세요.
    • **절차**: 단계별로 필요한 절차를 빠짐없이 나열합니다. (1단계 → 2단계 → …)
    • **양식**: 필요한 서식·양식 이름, 작성 항목, 제출처, 제출 기한 등이 있으면 모두 밝힙니다.
    • **조문 표기(제규정·법령 공통)**: 규정이나 법령을 인용할 때는 **반드시 조문을 함께** 밝힙니다.
      - **제규정**: 참고 문서에 **실제 조문(제○조, 제○항 등)** 이 나오면 **그대로** 인용하고, "(예시)"를 붙이지 마세요. 문서에 규정명·조·항이 있으면 그대로 적습니다. 조문이 문서에 전혀 없을 때만 "해당 규정 확인 필요" 등으로 표기합니다.
      - **법령**: 법령명 + "제○조(제○항)" + **개정일자**(예: 2024. 1. 16. 법률 제20123호 일부개정).
      - 답변 말미 **「관련 조문」** 항목을 두고, **(1) 제규정** (규정명·조문), **(2) 관련 법령** (법령명·조문·개정일자)를 구분해 정리합니다.
    • 참고 문서에 조문 번호가 없으면, "○○ 규정에 따르면", "등록된 지식 기준" 등 출처를 구분해 표기합니다.

    [제규정(부서/진흥원 규정) 관련 문의 시 - 반드시 준수]
    우리 부서·진흥원의 제규정(내부 규정)에 대한 문의일 경우:
    • **제규정**: 인용 시 **반드시 조문(제○조, 제○항)** 을 함께 표기합니다.
    • **상위·포괄 법령**: 해당 제규정의 근거가 되거나 그 위에 있는 **법률·시행령·시행규칙·훈령·지침**이 있으면 함께 설명하고, **법령도 반드시 조문(제○조, 제○항)과 개정일자**를 밝힙니다.
    • 답변 말미 **「관련 조문」** 에 (1) 제규정 조문, (2) 관련 법령(법령명·조문·개정일자)를 구분해 적습니다.

    [제규정 관련 답변 구조 - 1차 제규정 우선, 상충 시에만 종합의견]
    규정·법령 관련 질문에 답할 때는 **반드시 아래 순서와 구조**를 따릅니다.
    1. **상단: 제규정 기준 의견**
       - 먼저 **회사 제규정(진흥원 규정)** 만을 검토하여, 제규정에 따른 의견·절차·조문을 **상단에** 정리해 제시합니다.
    2. **상위 법령과의 관계**
       - 참고 문서에 상위·포괄 법령이 있으면, 제규정과의 관계를 간단히 서술합니다.
    3. **하단 정리 (둘 중 하나만)**
       - **상위 법령과 상충되는 경우**: 답변 **하단**에 **「종합의견」** 항목을 두고, 제규정과 상위 법령의 충돌 내용과 그에 대한 종합적인 의견(우선 적용 기준, 담당 부서 확인 권고 등)을 요약합니다.
       - **상위 법령과 상응하는 경우(충돌 없음)**: **종합의견을 별도로 쓰지 않고**, 상단의 제규정 기준 의견만으로 답을 마무리합니다. (법령은 관련 조문에서만 인용)

    [담당 부서 연계]
    • 참고 문서에 **없는 내용**이거나, 규정·법령 **해석이 애매한 경우**에는 추측하지 말고, "해당 내용은 **담당 부서(총무·인사·해당 업무 담당)**에 확인하시기 바랍니다."라고 명시합니다.
    • 필요 시 "정확한 해석은 ○○ 담당(내선 ○○○○) 확인 필요" 형식으로 안내할 수 있습니다.

    [정확도·정합성]
    • 참고 문서에 **없는 내용은 추측하지 말고**, "해당 내용은 등록된 문서에 없습니다. 담당 부서에 확인해 주세요." 등으로 답합니다.
    • 인용한 내용은 반드시 참고 문서 또는 널리 알려진 법령에 근거한 것만 적습니다.

    [일반 질문]
    단순 안내(예: 메뉴 위치, 회원가입 방법)는 'A하려면 → B 클릭' 수준으로 간결하게 답변하세요.
    
    [예시 - 규정 관련]
    질문: 출장비 지급 절차 알려줘
    답변:
    출장비는 여비규정에 따라 신청·결재 후 지급됩니다. 💼
    • 1단계: 출장 신청서 작성 및 결재선 올리기
    • 2단계: 출장 후 여비 정산서 제출 (영수증 등 증빙 첨부)
    • 3단계: 담당 부서 검토 후 지급
    **관련 조문**
    (1) 제규정: ○○ 여비 규정 제○조, 제○조 (출장의 정의 및 지급 절차)
    (2) 관련 법령: 공공기관의 운영에 관한 법률 제○조 제○항 (2024. 1. 16. 법률 제○○호 일부개정) (해당 시)`,

    character: `당신은 귀여운 '충콘지니'에유! 🧞‍♂️✨
    길게 말하는 거 딱 질색! 아주 핵심만 사투리로 콕 집어서 알려주서유.

    [답변 규칙]
    1. **무조건 짧게**: 한 줄에 하나씩만 말해유! 
    2. **줄바꿈 폭탄**: 엔터키를 자주 쳐서 세로로 길게 보이게 해주서유. 
    3. **이모지 팍팍**: 귀엽고 재밌게 이모지 많이 써주서유! 🌈
    4. **사투리**: "그거 있잖유~" 식으로 다정하게 사투리 써주세유!`
};

const logQuestion = async (question, answer, category) => {
    if (!db) return;
    try {
        await addDoc(collection(db, 'question_logs'), {
            question,
            answer: answer.substring(0, 500), // Limit answer length to save space
            category: category || 'general',
            timestamp: serverTimestamp()
        });
    } catch (e) {
        console.error("Failed to log question:", e);
    }
};

const getAnswerTargetInstruction = (answerTarget) => {
    if (answerTarget === 'officer') {
        return `\n[답변 대상: 담당자용]
담당자(업무 수행자)에게 필요한 수준으로 답변합니다.
• 절차·양식·조문·담당 부서를 상세히 제시하고, 제규정·상위 법령을 구분해 인용합니다.
• 서식명, 제출처, 기한, 관련 조문(제○조, 제○항)을 빠짐없이 밝힙니다.`;
    }
    return `\n[답변 대상: 일반 사용자용]
일반 사용자에게 맞춘 안내입니다. 핵심만 쉽게 전달하고, 전문 용어는 풀어서 설명합니다.`;
};

export const generateResponse = async (userQuery, mode = 'employee', imageBase64 = null, category = 'all', answerTarget = 'general') => {
    try {
        const systemInstruction = SYSTEM_INSTRUCTION[mode] + getAnswerTargetInstruction(answerTarget);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction,
            generationConfig: {
                temperature: 0.35,  // 낮을수록 사실 중심·일관된 답변 (정확도·정합성)
                topP: 0.9,
                topK: 40
            }
        });

        // Retrieve context with category filter (제규정 선택 시 '규정'만 검색)
        const effectiveCategory = (category === 'ctia' || category === '규정') ? '규정' : category;
        const { text: contextText, metadata } = await findRelevantContext(userQuery, effectiveCategory);

        // 법령 DB 연동 스텁: 추후 API 연동 시 상위 법령 문맥 보강
        let externalLawText = null;
        if (effectiveCategory === '규정' || effectiveCategory === 'all') {
            externalLawText = await getExternalLawContext(userQuery);
        }

        let promptParts = [];

        if (contextText) {
            if (externalLawText) {
                promptParts.push(`[외부 법령 참고]\n${externalLawText}\n\n`);
            }
            const regulationNote = (effectiveCategory === '규정' || effectiveCategory === 'all')
                ? `\n• [제규정 답변 구조] 상단에 **제규정 기준 의견**을 먼저 제시하고, 상위 법령과 **상충될 때만** 하단에 **종합의견**을 붙이세요. 상응하면 제규정만으로 의견 마무리.\n`
                : '';
            promptParts.push(`[참고 문서 내용]\n${contextText}\n\n[인용 시 준수사항 - 반드시 준수]\n• **아래 [참고 문서 내용]에 실제로 적혀 있는 조문·내용만** 인용하세요. 문서에 없는 조번(제○조)이나 항은 절대 만들지 마세요.\n• 참고 문서에 해당 조문이 없으면 "해당 조문은 등록된 문서에서 찾을 수 없습니다. 담당 부서에 확인하세요."라고만 답하세요.\n• 규정·지침·절차를 설명할 때는 위 문서에 나온 규정명·조·항을 **관련 조문**으로 반드시 밝혀 주세요.\n• **제규정** 인용 시: 반드시 **조문(제○조, 제○항)** 을 함께 표기하세요.\n• **법령** 인용 시: 법령명 + **조문(제○조, 제○항)** + **개정일자**(예: 2024. 1. 16. 법률 제○○호 일부개정)까지 표기하세요. 우리 기관 제규정 관련 질문이면 상위·포괄 법령이 있으면 함께 인용하세요.${regulationNote}\n`);
        }

        if (imageBase64) {
            promptParts.push({
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/png"
                }
            });
            promptParts.push("\n이 이미지(영수증/문서)의 내용을 분석하여 핵심 정보를 표 형식으로 정리해주세요. ");
        }

        promptParts.push(userQuery || (imageBase64 ? "이미지 분석해줘" : ""));

        const result = await model.generateContent(promptParts);
        const response = await result.response;
        const responseText = response.text();

        // Append Deep Links if keywords found
        let linksToAppend = [];
        Object.keys(DEEP_LINKS).forEach(keyword => {
            if ((userQuery + responseText).includes(keyword)) {
                linksToAppend.push(`🔗 [e나라도움 ${keyword} 바로가기](${DEEP_LINKS[keyword]})`);
            }
        });

        let finalResponseText = linksToAppend.length > 0
            ? `${responseText}\n\n---\n**관련 바로가기:**\n${linksToAppend.join('\n')}`
            : responseText;

        // 참고 출처는 메시지 metadata로 전달되어 ChatDisplay에서 클릭 가능하게 표시됨 (중복 텍스트는 붙이지 않음)

        // Log the question asynchronously (fire and forget to not block UI)
        logQuestion(userQuery, finalResponseText, category);

        return {
            text: finalResponseText,
            metadata: metadata.length > 0 ? metadata : null
        };
    } catch (error) {
        console.error("Gemini API Error Details:", error);

        let errorMessage = error.message || "알 수 없는 오류가 발생했습니다.";

        // 1. Quota / Rate Limit (429)
        if (errorMessage.includes("429") || errorMessage.includes("quota")) {
            if (errorMessage.includes("limit: 0")) {
                errorMessage = "현재 구글 계정 또는 프로젝트의 API 사용 한도가 '0'으로 제한되어 있습니다. 구글 AI Studio의 'Plan' 페이지에서 무료 티어가 활성화되어 있는지, 혹은 다른 새 프로젝트를 생성하여 키를 다시 발급받아 보세요. (간혹 결제 수단 등록이 필요한 프로젝트일 수 있습니다.) 🛠️";
            } else {
                errorMessage = "오늘 사용 가능한 무료 크레딧을 모두 소모했거나, 단시간 내 요청이 너무 많습니다. 1분 후 다시 시도해 보시고, 계속 안 된다면 내일 다시 찾아주세요! ⏳";
            }
        }
        // 2. Model Not Found (404)
        else if (errorMessage.includes("404") || errorMessage.includes("not found")) {
            errorMessage = "선택한 AI 모델을 찾을 수 없습니다. 현재 서비스 설정이 업데이트 중일 수 있으니 잠시 후 다시 시도해 주세요. 🛠️";
        }
        // 3. Network/Internet Issues
        else if (errorMessage.toLowerCase().includes("fetch") || errorMessage.toLowerCase().includes("network") || errorMessage.toLowerCase().includes("failed to fetch") || errorMessage.includes("ERR_INTERNET_DISCONNECTED")) {
            errorMessage = "인터넷 연결이 불안정하거나 끊겼습니다. 네트워크 상태를 확인하고 다시 시도해 주세요! 🌐";
        }

        return {
            text: `죄송합니다. ${errorMessage}`,
            metadata: null
        };
    }
};

export const transformTone = async (text, targetStyle) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `다음 텍스트를 '${targetStyle}' 스타일로 변환해줘. 문맥을 유지하면서 톤앤매너만 바꿔줘:\n\n"${text}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Tone Transformation Error:", error);
        return text; // Return original text on error
    }
};

export const generateFormExample = async (formText, userInstruction) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
당신은 '충남콘텐츠진흥원'의 행정 서식 작성 전문가입니다.
사용자가 제공한 [서식 내용]을 바탕으로, [작성 상황]에 맞는 **모범 작성 예시**를 만들어주세요.

[작성 상황]
${userInstruction}

[서식 내용]
${formText.substring(0, 20000)}

[요청사항]
1. 서식의 빈칸이나 항목에 들어갈 구체적이고 현실적인 내용을 채워주세요.
2. 마크다운(Markdown) 형식을 사용하여 가독성 있게 작성해주세요. (표, 리스트 등 활용)
3. "이 부분에는 ~를 씁니다" 같은 설명보다는, **실제 작성된 예시 텍스트**를 보여주는 것이 좋습니다.
4. 필요하다면 [가상의 데이터](예: (주)충남크리에이티브, 홍길동, 2024-05-20 등)를 사용하여 완성도 높은 예시를 만들어주세요.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Form Example Generation Error:", error);
        return "죄송합니다. 서식 예시를 생성하는 중 오류가 발생했습니다. 다시 시도해 주세요.";
    }
};

export const checkCompliance = async (docText) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // Retrieve relevant regulations using the document text as a query
        // We force the category to '규정' (assuming such category exists or we search generally)
        // If we don't have '규정' category, we might use 'all' but emphasize regulations in prompt.
        // Let's try to find context with '규정' preference if possible, or just search.
        // Since findRelevantContext takes (query, category), let's use:
        const { text: regulationContext } = await findRelevantContext("지출 여비 규정 사업비 집행", '규정');

        const prompt = `
당신은 '충남콘텐츠진흥원'의 내부 감사(Audit) 및 규정 검토 전문가입니다.
사용자가 제출한 [문서 내용]을 정밀 분석하여, [관련 규정]에 위배되는 사항이 있는지 점검해주세요.

[관련 규정 참고]
${regulationContext}

[문서 내용]
${docText.substring(0, 20000)}

[검토 요청사항]
1. **규정 위반 여부**: 예산 한도 초과, 필수 항목 누락, 날짜 오류, 부적절한 집행 내역 등을 확인해주세요.
2. **결과 리포트**: 
   - 🔴 **위반 의심**: 명확히 규정에 어긋나거나 의심되는 항목
   - 🟡 **주의 필요**: 규정 위반은 아니나 소명이 필요한 항목
   - ✅ **적정**: 문제 없음
3. 위반/주의 항목에 대해서는 구체적인 이유와 개선 방향을 제시해주세요.
4. 규정 데이터가 부족하다면, 통상적인 '공공기관 예산 집행 지침'을 기준으로 판단하되, 그 사실을 명시해주세요.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Compliance Check Error:", error);
        return "규정 검토 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
};
