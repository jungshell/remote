import { GoogleGenerativeAI } from "@google/generative-ai";
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Fetches recent question logs and analyzes them to suggest new KB items.
 * @returns {Promise<{success: boolean, suggestions: Array, error?: string}>}
 */
export const analyzeLogsAndSuggest = async () => {
    if (!db) return { success: false, error: "Database not initialized" };

    try {
        // 1. Fetch recent 50 logs
        const logsRef = collection(db, 'question_logs');
        const q = query(logsRef, orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            return { success: true, suggestions: [] };
        }

        const logs = snapshot.docs.map(d => d.data());
        const questionsText = logs.map(l => `- ${l.question} (Category: ${l.category})`).join('\n');

        // 2. Fetch current KB titles/summary (limit to save tokens, or just sample)
        // For a large KB, we can't feed everything. We assume the LLM knows general knowledge
        // but we want to find GAPS. 
        // Strategy: Ask LLM to identify clusters of questions that seem unanswered or repetitive.
        // For simplicity, we send just the questions and ask to generate "FAQ candidates".

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
당신은 '충남콘텐츠진흥원'의 지식 베이스(Knowledge Base) 관리자입니다.
최근 사용자들이 물어본 질문 로그를 분석하여, 지식 베이스에 추가하면 좋을 **새로운 Q&A 항목(FAQ)**을 제안해주세요.

[분석 지침]
1. 중복되거나 유사한 질문들을 그룹화하세요.
2. 질문의 빈도가 높거나 중요해 보이는 주제를 선정하세요.
3. 기존에 명확한 답변이 나갔더라도, 정제된 형태로 KB에 등록할 가치가 있다면 제안하세요.
4. 답변 내용은 당신의 일반적인 지식이나 로그에 있는 답변을 참고하여 작성하되, **"정확한 내용은 담당 부서 확인 필요"** 같은 문구를 괄호 안에 넣어주세요. (나중에 관리자가 수정할 수 있음)
5. 결과는 반드시 **JSON 배열 형식**으로만 출력하세요.

[입력 데이터: 최근 질문 로그]
${questionsText}

[출력 형식 예시]
[
  {
    "category": "e나라도움",
    "question": "집행 잔액 반납은 어떻게 하나요?",
    "answer": "집행 잔액 반납은 상단 메뉴의 [집행 정산] > [반납 관리]에서 가능합니다. (상세 절차 확인 필요)",
    "reason": "최근 3회 이상 유사 질문 발생"
  }
]
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON
        let suggestions = [];
        try {
            // Remove markdown code blocks if present
            const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            suggestions = JSON.parse(jsonText);
        } catch (e) {
            console.error("Failed to parse Gemini response as JSON:", text, e);
            return { success: false, error: "AI 응답 분석 실패" };
        }

        // Add IDs to suggestions
        suggestions = suggestions.map((s, idx) => ({
            id: `suggest_${Date.now()}_${idx}`,
            ...s,
            status: 'pending' // pending, approved, rejected
        }));

        return { success: true, suggestions };

    } catch (error) {
        console.error("Auto KB Analysis Error:", error);
        return { success: false, error: error.message };
    }
};
