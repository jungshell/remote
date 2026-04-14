import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import './App.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

type ModuleKey =
  | 'meeting'
  | 'rag'
  | 'proofread'
  | 'docDraft'
  | 'hr'
  | 'budget'
  | 'board'
  | 'compliance'
  | 'org'
  | 'settings'

type CompStepDraft = {
  title: string
  body: string
  due_rule: 'none' | 'after' | 'before' | 'annual'
  offset_days: number
  annual_month: string
  annual_day: string
  document_id: string
}

function defaultCompStep(): CompStepDraft {
  return {
    title: '',
    body: '',
    due_rule: 'none',
    offset_days: 0,
    annual_month: '',
    annual_day: '',
    document_id: '',
  }
}

function stepDraftToApi(s: CompStepDraft) {
  return {
    title: s.title.trim(),
    body: s.body.trim(),
    due_rule: s.due_rule,
    offset_days: s.offset_days,
    annual_month: s.annual_month === '' ? null : Number(s.annual_month),
    annual_day: s.annual_day === '' ? null : Number(s.annual_day),
    document_id: s.document_id === '' ? null : Number(s.document_id),
  }
}

type RagCitation = {
  document_id?: number
  document_title?: string
  ref_hint?: string
  chunk_index?: number
  snippet?: string
}

type RagChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations?: RagCitation[]
}

type ApiOptions = {
  method?: string
  body?: unknown
  token?: string
}

/**
 * 개발(npm run dev): 기본은 127.0.0.1:8080 직접 호출(CORS 허용됨). Vite 프록시만 쓰면
 * 가끔 index.html(200)이 돌아와 JSON 파싱이 깨질 수 있어 기본값을 직접 호출로 둡니다.
 * `VITE_API_BASE`가 있으면 그걸 최우선.
 */
function apiBase(): string {
  const v = import.meta.env.VITE_API_BASE
  if (v != null && String(v).trim() !== '') {
    return String(v).replace(/\/$/, '')
  }
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:8080'
  }
  return ''
}

const RAG_JSON_BODY_MAX = 6 * 1024 * 1024

async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const base = apiBase()
  const url = `${base}${path}`
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const rawText = await response.text()
  let data: { error?: string } & Record<string, unknown> = {}
  try {
    data = rawText ? JSON.parse(rawText) : {}
  } catch {
    const sniff = rawText.slice(0, 120).replace(/\s+/g, ' ')
    const hint =
      sniff.includes('<!DOCTYPE') || sniff.toLowerCase().includes('<html')
        ? '(응답이 웹 페이지 HTML입니다. API 창에서 php -S … router.php 로 떠 있는지 확인하세요.)'
        : '(PHP 경고/오류 HTML일 수 있습니다.)'
    throw new Error(
      `서버가 JSON이 아닌 내용을 보냈습니다. (${response.status}) ${hint} 응답 앞부분: ${sniff.slice(0, 80)}…`,
    )
  }
  if (!response.ok) {
    const msg =
      typeof data.error === 'string' ? data.error : 'API 오류가 발생했습니다.'
    const apiErr = new Error(msg) as Error & {
      status: number
      body: Record<string, unknown>
    }
    apiErr.status = response.status
    apiErr.body = data as Record<string, unknown>
    throw apiErr
  }
  return data as T
}

type ApiThrown = Error & { status: number; body: Record<string, unknown> }

function isApiThrown(e: unknown): e is ApiThrown {
  return (
    e instanceof Error &&
    typeof (e as ApiThrown).status === 'number' &&
    typeof (e as ApiThrown).body === 'object' &&
    (e as ApiThrown).body !== null
  )
}

function parseRagCitations(raw: unknown): RagCitation[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { snippet: item }
    }
    if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>
      return {
        document_id: typeof o.document_id === 'number' ? o.document_id : undefined,
        document_title: typeof o.document_title === 'string' ? o.document_title : undefined,
        ref_hint: typeof o.ref_hint === 'string' ? o.ref_hint : undefined,
        chunk_index: typeof o.chunk_index === 'number' ? o.chunk_index : undefined,
        snippet: typeof o.snippet === 'string' ? o.snippet : undefined,
      }
    }
    return {}
  })
}

/** 동일 제목이면 409 → confirm 후 덮어쓰기 */
async function postRegulationDocumentWithDuplicatePrompt(
  token: string,
  payload: { title: string; content: string },
): Promise<'ok' | 'skipped'> {
  try {
    await api('/api/rag/documents', {
      method: 'POST',
      token,
      body: { ...payload, overwrite: false },
    })
    return 'ok'
  } catch (e) {
    if (!isApiThrown(e)) {
      throw e
    }
    if (e.status === 409 && e.body?.code === 'duplicate_title') {
      const detail =
        typeof e.body.error === 'string'
          ? e.body.error
          : '이미 같은 제목의 문서가 있습니다.'
      if (
        window.confirm(
          `${detail}\n\n덮어쓰시겠습니까?\n· 예: 기존 본문·검색 조각이 모두 새 내용으로 바뀝니다.\n· 아니오: 이번 등록은 건너뜁니다.`,
        )
      ) {
        await api('/api/rag/documents', {
          method: 'POST',
          token,
          body: { ...payload, overwrite: true },
        })
        return 'ok'
      }
      return 'skipped'
    }
    throw e
  }
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }
  return pages.join('\n')
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('cnci_token') ?? '')
  const [module, setModule] = useState<ModuleKey>('meeting')
  const [email, setEmail] = useState('admin@cnci.local')
  const [password, setPassword] = useState('admin1234')
  const [loginError, setLoginError] = useState('')
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)

  const [meetingTitle, setMeetingTitle] = useState('주간 업무회의')
  const [meetingTranscript, setMeetingTranscript] = useState('')
  const [meetingResult, setMeetingResult] = useState('')
  const [meetingLogs, setMeetingLogs] = useState<Array<{ id: number; title: string; summary: string; created_at: string }>>([])

  const [ragTitle, setRagTitle] = useState('')
  const [ragContent, setRagContent] = useState('')
  const [ragMessages, setRagMessages] = useState<RagChatMessage[]>([])
  const [ragChatInput, setRagChatInput] = useState('')
  const [ragChatLoading, setRagChatLoading] = useState(false)
  const [ragImportStatus, setRagImportStatus] = useState('')
  const [ragDocs, setRagDocs] = useState<Array<{ id: number; title: string; created_at: string }>>([])
  const [ragAdminOpen, setRagAdminOpen] = useState(false)

  const [proofreadTone, setProofreadTone] = useState('공문')
  const [proofreadText, setProofreadText] = useState('')
  const [proofreadResult, setProofreadResult] = useState('')

  const [templateText, setTemplateText] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [docDraftResult, setDocDraftResult] = useState('')

  const [employees, setEmployees] = useState<Array<Record<string, string | number>>>([])
  const [alerts, setAlerts] = useState<Array<Record<string, string | number>>>([])
  const [empName, setEmpName] = useState('')
  const [empPhone, setEmpPhone] = useState('')
  const [empContractEnd, setEmpContractEnd] = useState('')
  const [empPromotionDue, setEmpPromotionDue] = useState('')
  const [empNotes, setEmpNotes] = useState('')

  const [budgetItems, setBudgetItems] = useState<Array<Record<string, string | number>>>([])
  const [budgetSummary, setBudgetSummary] = useState({ income: 0, expense: 0, balance: 0 })
  const [budgetType, setBudgetType] = useState<'income' | 'expense'>('expense')
  const [budgetCategory, setBudgetCategory] = useState('')
  const [budgetTitle, setBudgetTitle] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetDate, setBudgetDate] = useState('')
  const [budgetNotes, setBudgetNotes] = useState('')

  const [boardItems, setBoardItems] = useState<Array<Record<string, string | number>>>([])
  const [boardTitle, setBoardTitle] = useState('')
  const [boardStatus, setBoardStatus] = useState('todo')
  const [boardDue, setBoardDue] = useState('')
  const [boardNotes, setBoardNotes] = useState('')

  const [compWorkflows, setCompWorkflows] = useState<Array<Record<string, string | number>>>([])
  const [compRuns, setCompRuns] = useState<Array<Record<string, string | number>>>([])
  const [compDash, setCompDash] = useState<{
    items: Array<Record<string, string | number | null>>
    today: string
    windowEnd: string
  }>({ items: [], today: '', windowEnd: '' })
  const [compDashDays, setCompDashDays] = useState(14)
  const [compNewWfName, setCompNewWfName] = useState('')
  const [compNewWfCat, setCompNewWfCat] = useState('')
  const [compNewWfDesc, setCompNewWfDesc] = useState('')
  const [compSelWfId, setCompSelWfId] = useState('')
  const [compSteps, setCompSteps] = useState<CompStepDraft[]>([])
  const [compRunWfId, setCompRunWfId] = useState('')
  const [compRunAnchor, setCompRunAnchor] = useState('')
  const [compRunLabel, setCompRunLabel] = useState('')
  const [compSuggestDocId, setCompSuggestDocId] = useState('')

  const [orgNodes, setOrgNodes] = useState<Array<Record<string, string | number | null>>>([])
  const [orgName, setOrgName] = useState('')
  const [orgRole, setOrgRole] = useState('')
  const [orgPhone, setOrgPhone] = useState('')
  const [orgParentId, setOrgParentId] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')

  const modules = useMemo(
    () => [
      { key: 'meeting' as const, label: '회의/STT' },
      { key: 'rag' as const, label: '규정 Q&A' },
      { key: 'proofread' as const, label: '문구 교정' },
      { key: 'docDraft' as const, label: 'PDF 초안' },
      { key: 'hr' as const, label: '인사/알림' },
      { key: 'budget' as const, label: '예산' },
      { key: 'board' as const, label: '도의회 보드' },
      { key: 'compliance' as const, label: '절차/일정' },
      { key: 'org' as const, label: '조직도' },
      { key: 'settings' as const, label: '설정/백업' },
    ],
    [],
  )

  const refreshCollections = useCallback(async () => {
    if (!token) {
      return
    }
    const [meeting, docs, hrList, hrAlerts, budgetList, budgetInfo, boardList, compWf, compRn, compDb, orgList] =
      await Promise.all([
        api<{ logs: Array<{ id: number; title: string; summary: string; created_at: string }> }>('/api/meeting/logs', { token }),
        api<{ documents: Array<{ id: number; title: string; created_at: string }> }>('/api/rag/documents', { token }),
        api<{ employees: Array<Record<string, string | number>> }>('/api/hr/employees', { token }),
        api<{ alerts: Array<Record<string, string | number>> }>('/api/hr/alerts', { token }),
        api<{ items: Array<Record<string, string | number>> }>('/api/budget/items', { token }),
        api<{ income: number; expense: number; balance: number }>('/api/budget/summary', { token }),
        api<{ items: Array<Record<string, string | number>> }>('/api/board/items', { token }),
        api<{ workflows: Array<Record<string, string | number>> }>('/api/compliance/workflows', { token }),
        api<{ runs: Array<Record<string, string | number>> }>('/api/compliance/runs', { token }),
        api<{
          items: Array<Record<string, string | number | null>>
          today: string
          windowEnd: string
        }>(`/api/compliance/dashboard?days=${compDashDays}`, { token }),
        api<{ nodes: Array<Record<string, string | number | null>> }>('/api/org/nodes', { token }),
      ])
    setMeetingLogs(meeting.logs)
    setRagDocs(docs.documents)
    setEmployees(hrList.employees)
    setAlerts(hrAlerts.alerts)
    setBudgetItems(budgetList.items)
    setBudgetSummary(budgetInfo)
    setBoardItems(boardList.items)
    setCompWorkflows(compWf.workflows)
    setCompRuns(compRn.runs)
    setCompDash({ items: compDb.items, today: compDb.today, windowEnd: compDb.windowEnd })
    setOrgNodes(orgList.nodes)
  }, [token, compDashDays])

  useEffect(() => {
    refreshCollections().catch((error: unknown) => {
      if (error instanceof Error) {
        setGlobalError(error.message)
      }
    })
  }, [refreshCollections])

  const ragChatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (module !== 'rag') {
      return
    }
    ragChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [module, ragMessages, ragChatLoading])

  const sendRagChat = useCallback(async () => {
    if (ragChatLoading) {
      return
    }
    const q = ragChatInput.trim()
    if (!q) {
      return
    }
    const userMsg: RagChatMessage = { id: crypto.randomUUID(), role: 'user', text: q }
    setRagMessages((m) => [...m, userMsg])
    setRagChatInput('')
    setRagChatLoading(true)
    setGlobalError('')
    try {
      const data = await api<{ answer: string; citations?: unknown }>('/api/rag/ask', {
        method: 'POST',
        token,
        body: { question: q },
      })
      const citations = parseRagCitations(data.citations)
      setRagMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: 'assistant', text: data.answer, citations },
      ])
    } catch (e) {
      const msg = e instanceof Error ? e.message : '질의 오류'
      setGlobalError(msg)
      setRagMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `답변을 가져오지 못했습니다.\n\n${msg}`,
        },
      ])
    } finally {
      setRagChatLoading(false)
    }
  }, [token, ragChatInput, ragChatLoading])

  useEffect(() => {
    if (!token || compSelWfId === '') {
      setCompSteps([])
      return
    }
    let cancelled = false
    api<{ steps: Array<Record<string, unknown>> }>(`/api/compliance/workflows/${compSelWfId}`, { token })
      .then((data) => {
        if (cancelled) {
          return
        }
        const steps = (data.steps ?? []).map((row) => ({
          title: String(row.title ?? ''),
          body: String(row.body ?? ''),
          due_rule: (['none', 'after', 'before', 'annual'].includes(String(row.due_rule))
            ? String(row.due_rule)
            : 'none') as CompStepDraft['due_rule'],
          offset_days: Number(row.offset_days ?? 0),
          annual_month:
            row.annual_month !== undefined && row.annual_month !== null && row.annual_month !== ''
              ? String(row.annual_month)
              : '',
          annual_day:
            row.annual_day !== undefined && row.annual_day !== null && row.annual_day !== ''
              ? String(row.annual_day)
              : '',
          document_id:
            row.document_id !== undefined && row.document_id !== null && row.document_id !== ''
              ? String(row.document_id)
              : '',
        }))
        setCompSteps(steps.length > 0 ? steps : [defaultCompStep()])
      })
      .catch(() => {
        if (!cancelled) {
          setCompSteps([defaultCompStep()])
        }
      })
    return () => {
      cancelled = true
    }
  }, [token, compSelWfId])

  async function login() {
    setLoginError('')
    try {
      const data = await api<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      localStorage.setItem('cnci_token', data.token)
      setToken(data.token)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '로그인 오류')
    }
  }

  if (!token) {
    return (
      <main className="portal">
        <section className="panel loginPanel">
          <h1>CNCI 업무포털 로그인</h1>
          <p className="hint">초기 계정: admin@cnci.local / admin1234</p>
          <label>
            이메일
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            비밀번호
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button onClick={login}>로그인</button>
          {loginError && <p className="error">{loginError}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="portal">
      <header className="hero">
        <p className="eyebrow">CNCI Work Portal</p>
        <h1>로컬·웹 겸용 업무 자동화 포털</h1>
        <p className="heroText">선택된 전체 TODO 기능을 한 화면에서 운영할 수 있도록 구성했습니다.</p>
      </header>

      <section className="panel">
        <div className="tabs moduleTabs">
          {modules.map((item) => (
            <button
              key={item.key}
              className={module === item.key ? 'tab active' : 'tab'}
              onClick={() => setModule(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {globalError && <p className="error">{globalError}</p>}

        {module === 'meeting' && (
          <div className="grid2">
            <label>
              회의 제목
              <input value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} />
            </label>
            <label>
              음성 파일 업로드(STT)
              <input
                type="file"
                accept="audio/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  setLoading(true)
                  setGlobalError('')
                  try {
                    const formData = new FormData()
                    formData.append('audio', file)
                    const response = await fetch(`${apiBase()}/api/meeting/transcribe`, {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    })
                    const data = await response.json()
                    if (!response.ok) throw new Error(data.error ?? 'STT 실패')
                    setMeetingTranscript(data.transcript ?? '')
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : 'STT 처리 오류')
                  } finally {
                    setLoading(false)
                  }
                }}
              />
            </label>
            <label className="span2">
              회의 대화록
              <textarea rows={10} value={meetingTranscript} onChange={(e) => setMeetingTranscript(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                disabled={loading}
                onClick={async () => {
                  setLoading(true)
                  setGlobalError('')
                  try {
                    const data = await api<{ summary: string }>('/api/meeting/summarize', {
                      method: 'POST',
                      token,
                      body: { title: meetingTitle, transcript: meetingTranscript },
                    })
                    setMeetingResult(data.summary)
                    await refreshCollections()
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '요약 오류')
                  } finally {
                    setLoading(false)
                  }
                }}
              >
                회의록 생성
              </button>
            </div>
            <pre className="span2">{meetingResult || '생성 결과가 여기에 표시됩니다.'}</pre>
            <div className="span2">
              <h3>최근 회의록</h3>
              {meetingLogs.map((log) => (
                <article className="card" key={log.id}>
                  <strong>{String(log.title)}</strong>
                  <p>{String(log.created_at)}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {module === 'rag' && (
          <div className="grid2 ragLayout">
            <div className="span2 ragBanner">
              <div className="ragBannerTop">
                <span className="ragBannerMeta">
                  등록된 규정 <strong>{ragDocs.length}</strong>건
                  <span className="ragBannerSep">·</span>
                  API <code>http://127.0.0.1:8080</code>
                </span>
                <div className="ragBannerActions">
                  <button
                    type="button"
                    className="ragBannerSecondary"
                    onClick={() => setRagMessages([])}
                  >
                    대화 비우기
                  </button>
                  <button
                    type="button"
                    className="ragBannerToggle"
                    onClick={() => setRagAdminOpen((v) => !v)}
                  >
                    {ragAdminOpen ? '문서 등록·관리 접기' : '문서 등록·관리 펼치기'}
                  </button>
                </div>
              </div>
              {ragImportStatus ? (
                <p className={`ragBannerStatus ${/실패/.test(ragImportStatus) ? 'error' : 'success'}`}>
                  {ragImportStatus}
                </p>
              ) : (
                !ragAdminOpen && (
                  <p className="ragBannerHint">
                    보통은 아래 채팅으로 질문만 하면 됩니다. PDF·원문 등록은 오른쪽 위를 펼치세요.
                  </p>
                )
              )}
            </div>

            <div className="span2 ragChatShell">
              <div className="ragChatStream">
                {ragMessages.length === 0 && !ragChatLoading && (
                  <p className="ragChatPlaceholder">
                    질문을 입력하면 등록된 규정을 검색해 답합니다. Gemini 를 쓰려면 API 창이 키를 읽도록
                    실행하기.bat 또는 <code>gemini_key.txt</code> 를 설정하세요.
                  </p>
                )}
                {ragMessages.map((msg) => (
                  <div key={msg.id} className={`ragChatTurn ${msg.role}`}>
                    <div className="ragChatMeta">{msg.role === 'user' ? '질문' : '답변'}</div>
                    <div className="ragChatBubble">
                      <pre className="ragChatBubbleText">{msg.text}</pre>
                    </div>
                    {msg.role === 'assistant' &&
                      msg.citations &&
                      msg.citations.length > 0 && (
                        <details className="ragChatCitations">
                          <summary>검색 근거 · 인용 후보 ({msg.citations.length})</summary>
                          <p className="hint ragChatCiteHint">
                            모델 답변과 대조하세요. 제○조 표시는 원문에 해당 줄이 있을 때만 자동입니다.
                          </p>
                          <div className="citationList">
                            {msg.citations.map((c, i) => (
                              <article
                                className="card citationCard"
                                key={`${msg.id}-${c.document_id ?? ''}-${c.chunk_index ?? i}`}
                              >
                                <strong>
                                  {c.document_title ?? '문서'}
                                  {c.ref_hint ? ` · ${c.ref_hint}` : ''}
                                  {c.chunk_index !== undefined ? ` (청크 ${c.chunk_index})` : ''}
                                </strong>
                                <pre className="citationSnippet">{c.snippet ?? ''}</pre>
                              </article>
                            ))}
                          </div>
                        </details>
                      )}
                  </div>
                ))}
                {ragChatLoading && (
                  <div className="ragChatTurn assistant">
                    <div className="ragChatMeta">답변</div>
                    <div className="ragChatBubble ragChatTyping">답변 생성 중…</div>
                  </div>
                )}
                <div ref={ragChatEndRef} className="ragChatEnd" />
              </div>
              <div className="ragChatComposer">
                <textarea
                  className="ragChatInput"
                  rows={3}
                  value={ragChatInput}
                  onChange={(e) => setRagChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void sendRagChat()
                    }
                  }}
                  placeholder="규정에 대해 물어보세요. (Enter 보내기 · Shift+Enter 줄바꿈)"
                  disabled={ragChatLoading}
                />
                <button
                  type="button"
                  className="ragChatSend"
                  disabled={ragChatLoading || !ragChatInput.trim()}
                  onClick={() => void sendRagChat()}
                >
                  보내기
                </button>
              </div>
            </div>

            {ragAdminOpen && (
              <div className="span2 ragAdminPanel">
                <p className="hint ragAdminHint">
                  PDF는 여러 개를 한 번에 선택하면 파일마다 개별 문서로 등록됩니다. 화면 주소(
                  <code>localhost:5188</code>)와 API(<code>127.0.0.1:8080</code>)는 다릅니다. CNCI-API 창이
                  켜져 있어야 합니다. 스캔 PDF는 글자 추출이 안 될 수 있습니다. 한 편으로 합치려면「한 개만
                  편집 영역」또는 원문 붙여넣기 후「문서 등록」을 쓰세요.
                </p>
                <div className="grid2 ragAdminGrid">
                  <label>
                    문서명
                    <input
                      value={ragTitle}
                      onChange={(e) => setRagTitle(e.target.value)}
                      placeholder="예: 2025 예산편성 지침"
                    />
                  </label>
                  <label>
                    PDF 여러 개 등록
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={async (event) => {
                        const list = event.target.files
                        if (!list?.length) return
                        setLoading(true)
                        setGlobalError('')
                        setRagImportStatus('')
                        const failures: string[] = []
                        let ok = 0
                        let skipped = 0
                        try {
                          for (let i = 0; i < list.length; i += 1) {
                            const file = list[i]
                            if (!file.name.toLowerCase().endsWith('.pdf')) {
                              failures.push(`${file.name}(PDF 아님)`)
                              continue
                            }
                            try {
                              const text = await extractPdfText(file)
                              if (!text.trim()) {
                                failures.push(
                                  `${file.name}(텍스트 없음·스캔 PDF 가능. OCR 후 붙여넣기)`,
                                )
                                continue
                              }
                              const title = file.name.replace(/\.pdf$/i, '').trim() || '무제 PDF'
                              const payload = { title, content: text }
                              const approxSize = new Blob([JSON.stringify(payload)]).size
                              if (approxSize > RAG_JSON_BODY_MAX) {
                                failures.push(
                                  `${file.name}(본문 약 ${Math.round(approxSize / 1024 / 1024)}MB·PHP post_max_size 초과 가능)`,
                                )
                                continue
                              }
                              const result = await postRegulationDocumentWithDuplicatePrompt(
                                token,
                                payload,
                              )
                              if (result === 'ok') {
                                ok += 1
                              } else {
                                skipped += 1
                              }
                            } catch (err) {
                              const msg = err instanceof Error ? err.message : '요청 실패'
                              failures.push(`${file.name}(${msg})`)
                            }
                          }
                          await refreshCollections()
                          if (failures.length === 0 && skipped === 0) {
                            setRagImportStatus(`PDF ${ok}개를 등록했습니다.`)
                          } else {
                            setRagImportStatus(
                              `등록 ${ok}개 · 건너뜀(동일 제목·취소) ${skipped}개 · 실패 ${failures.length}개${failures.length ? ` — ${failures.join(', ')}` : ''}`,
                            )
                          }
                        } finally {
                          setLoading(false)
                          event.target.value = ''
                        }
                      }}
                    />
                  </label>
                  <label className="span2">
                    PDF 한 개만 편집 영역에 넣기
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={async (event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setLoading(true)
                        setGlobalError('')
                        setRagImportStatus('')
                        try {
                          const text = await extractPdfText(file)
                          setRagContent((prev) =>
                            prev.trim() === '' ? text : `${prev.trim()}\n\n${text}`,
                          )
                          setRagTitle((prev) =>
                            prev.trim() === '' ? file.name.replace(/\.pdf$/i, '') : prev,
                          )
                        } catch {
                          setGlobalError('PDF 텍스트 추출에 실패했습니다.')
                        } finally {
                          setLoading(false)
                          event.target.value = ''
                        }
                      }}
                    />
                  </label>
                  <label className="span2">
                    규정 원문
                    <textarea rows={8} value={ragContent} onChange={(e) => setRagContent(e.target.value)} />
                  </label>
                  <div className="actions span2 ragAdminActions">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        try {
                          setGlobalError('')
                          const r = await postRegulationDocumentWithDuplicatePrompt(token, {
                            title: ragTitle,
                            content: ragContent,
                          })
                          if (r === 'ok') {
                            setRagTitle('')
                            setRagContent('')
                            await refreshCollections()
                          }
                        } catch (error) {
                          setGlobalError(error instanceof Error ? error.message : '문서 등록 오류')
                        }
                      }}
                    >
                      문서 등록
                    </button>
                    <button
                      type="button"
                      className="ragDedupeBtn"
                      disabled={loading}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            '문서 제목이 같은 규정은 가장 먼저 등록한 1건만 남기고 나머지를 삭제합니다. (절차 문서 연결은 끊길 수 있습니다.)\n계속할까요?',
                          )
                        ) {
                          return
                        }
                        try {
                          setLoading(true)
                          setGlobalError('')
                          const data = await api<{ removed: number; unique_titles: number }>(
                            '/api/rag/documents/dedupe',
                            { method: 'POST', token },
                          )
                          await refreshCollections()
                          setRagImportStatus(
                            `중복 정리: ${data.removed}건 삭제 · 고유 제목 ${data.unique_titles}건`,
                          )
                        } catch (error) {
                          setGlobalError(error instanceof Error ? error.message : '중복 정리 오류')
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      제목 중복 정리 (1건만 유지)
                    </button>
                  </div>
                </div>
                <div className="ragDocList">
                  <h3>등록 문서</h3>
                  {ragDocs.length === 0 ? (
                    <p className="hint">아직 등록된 문서가 없습니다.</p>
                  ) : (
                    ragDocs.map((doc) => (
                      <article className="card" key={doc.id}>
                        <strong>{doc.title}</strong>
                        <p>{doc.created_at}</p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {module === 'proofread' && (
          <div className="grid2">
            <label>
              톤
              <select value={proofreadTone} onChange={(e) => setProofreadTone(e.target.value)}>
                <option value="공문">공문</option>
                <option value="대외협력">대외협력</option>
                <option value="정중한 문자">정중한 문자</option>
                <option value="간결 보고">간결 보고</option>
              </select>
            </label>
            <div />
            <label className="span2">
              원문
              <textarea rows={10} value={proofreadText} onChange={(e) => setProofreadText(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                onClick={async () => {
                  try {
                    const data = await api<{ result: string }>('/api/ai/proofread', {
                      method: 'POST',
                      token,
                      body: { text: proofreadText, tone: proofreadTone },
                    })
                    setProofreadResult(data.result)
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '교정 오류')
                  }
                }}
              >
                교정하기
              </button>
            </div>
            <pre className="span2">{proofreadResult || '교정 결과가 여기에 표시됩니다.'}</pre>
          </div>
        )}

        {module === 'docDraft' && (
          <div className="grid2">
            <label>
              PDF 파일
              <input
                type="file"
                accept="application/pdf"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  setLoading(true)
                  try {
                    const text = await extractPdfText(file)
                    setSourceText(text)
                  } catch {
                    setGlobalError('PDF 텍스트 추출에 실패했습니다.')
                  } finally {
                    setLoading(false)
                  }
                }}
              />
            </label>
            <div />
            <label className="span2">
              올해 양식 템플릿
              <textarea rows={8} value={templateText} onChange={(e) => setTemplateText(e.target.value)} />
            </label>
            <label className="span2">
              PDF 추출 텍스트
              <textarea rows={10} value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                onClick={async () => {
                  try {
                    const data = await api<{ result: string }>('/api/ai/doc-draft', {
                      method: 'POST',
                      token,
                      body: { sourceText, template: templateText },
                    })
                    setDocDraftResult(data.result)
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '초안 생성 오류')
                  }
                }}
              >
                초안 생성
              </button>
            </div>
            <pre className="span2">{docDraftResult || '문서 초안 결과가 여기에 표시됩니다.'}</pre>
          </div>
        )}

        {module === 'hr' && (
          <div className="grid2">
            <label>
              이름
              <input value={empName} onChange={(e) => setEmpName(e.target.value)} />
            </label>
            <label>
              연락처
              <input value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} />
            </label>
            <label>
              계약 종료일
              <input type="date" value={empContractEnd} onChange={(e) => setEmpContractEnd(e.target.value)} />
            </label>
            <label>
              승급 예정일
              <input type="date" value={empPromotionDue} onChange={(e) => setEmpPromotionDue(e.target.value)} />
            </label>
            <label className="span2">
              비고
              <input value={empNotes} onChange={(e) => setEmpNotes(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                onClick={async () => {
                  await api('/api/hr/employees', {
                    method: 'POST',
                    token,
                    body: {
                      name: empName,
                      phone: empPhone,
                      contract_end: empContractEnd,
                      promotion_due: empPromotionDue,
                      notes: empNotes,
                    },
                  })
                  setEmpName('')
                  setEmpPhone('')
                  setEmpContractEnd('')
                  setEmpPromotionDue('')
                  setEmpNotes('')
                  await refreshCollections()
                }}
              >
                임직원 등록
              </button>
            </div>
            <div className="span2">
              <h3>만료/승급 알림(30일 이내)</h3>
              {alerts.map((item, index) => (
                <article className="card" key={index}>
                  <strong>{String(item.name)}</strong>
                  <p>계약종료: {String(item.contract_end)} / 승급예정: {String(item.promotion_due)}</p>
                </article>
              ))}
            </div>
            <div className="span2">
              <h3>임직원 목록</h3>
              {employees.map((employee, index) => (
                <article className="card" key={index}>
                  <strong>{String(employee.name)}</strong>
                  <p>{String(employee.phone)}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {module === 'budget' && (
          <div className="grid2">
            <label>
              구분
              <select value={budgetType} onChange={(e) => setBudgetType(e.target.value as 'income' | 'expense')}>
                <option value="income">세입</option>
                <option value="expense">세출</option>
              </select>
            </label>
            <label>
              카테고리
              <input value={budgetCategory} onChange={(e) => setBudgetCategory(e.target.value)} />
            </label>
            <label>
              항목명
              <input value={budgetTitle} onChange={(e) => setBudgetTitle(e.target.value)} />
            </label>
            <label>
              금액
              <input value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} />
            </label>
            <label>
              이사회 일자
              <input type="date" value={budgetDate} onChange={(e) => setBudgetDate(e.target.value)} />
            </label>
            <label>
              비고
              <input value={budgetNotes} onChange={(e) => setBudgetNotes(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                onClick={async () => {
                  await api('/api/budget/items', {
                    method: 'POST',
                    token,
                    body: {
                      type: budgetType,
                      category: budgetCategory,
                      title: budgetTitle,
                      amount: Number(budgetAmount),
                      meeting_date: budgetDate,
                      notes: budgetNotes,
                    },
                  })
                  await refreshCollections()
                }}
              >
                예산 항목 등록
              </button>
            </div>
            <div className="span2">
              <h3>요약</h3>
              <p>세입: {budgetSummary.income.toLocaleString()} / 세출: {budgetSummary.expense.toLocaleString()} / 잔액: {budgetSummary.balance.toLocaleString()}</p>
            </div>
            <div className="span2">
              {budgetItems.map((item, index) => (
                <article className="card" key={index}>
                  <strong>{String(item.title)}</strong>
                  <p>{String(item.type)} / {Number(item.amount).toLocaleString()}원</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {module === 'compliance' && (
          <div className="grid2">
            <div className="span2">
              <h3>대시보드 (미완료 · 마감 임박)</h3>
              <p className="hint">
                기준일: {compDash.today || '—'} ~ {compDash.windowEnd || '—'} ({compDashDays}일 이내 또는 기한 없음)
              </p>
              <label>
                일정 창(일)
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={compDashDays}
                  onChange={(e) => setCompDashDays(Number(e.target.value) || 7)}
                />
              </label>
            </div>
            <div className="span2">
              {compDash.items.map((item) => {
                const st = String(item.status ?? '')
                const cardClass = st === 'overdue' ? 'card overdue' : st === 'due_today' ? 'card dueToday' : 'card'
                return (
                  <article className={cardClass} key={String(item.id)}>
                    <strong>{String(item.title_snapshot)}</strong>
                    <p>
                      {String(item.workflow_name)} · 실행 #{String(item.run_id)}{' '}
                      {item.run_label ? `(${String(item.run_label)})` : ''}
                    </p>
                    <p>
                      앵커: {String(item.anchor_date)} / 마감: {item.due_date != null ? String(item.due_date) : '없음'} ·{' '}
                      {st === 'overdue' ? '지연' : st === 'due_today' ? '오늘' : '예정'}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api(`/api/compliance/run-steps/${String(item.id)}`, {
                            method: 'PATCH',
                            token,
                            body: { completed: true },
                          })
                          await refreshCollections()
                        } catch (error) {
                          setGlobalError(error instanceof Error ? error.message : '처리 오류')
                        }
                      }}
                    >
                      완료 처리
                    </button>
                  </article>
                )
              })}
              {compDash.items.length === 0 && <p className="hint">표시할 항목이 없습니다.</p>}
            </div>

            <div className="span2">
              <h3>절차 템플릿</h3>
            </div>
            <label>
              새 템플릿 이름
              <input value={compNewWfName} onChange={(e) => setCompNewWfName(e.target.value)} />
            </label>
            <label>
              카테고리
              <input value={compNewWfCat} onChange={(e) => setCompNewWfCat(e.target.value)} placeholder="예: 정기회" />
            </label>
            <label className="span2">
              설명
              <input value={compNewWfDesc} onChange={(e) => setCompNewWfDesc(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api('/api/compliance/workflows', {
                      method: 'POST',
                      token,
                      body: {
                        name: compNewWfName,
                        category: compNewWfCat,
                        description: compNewWfDesc,
                        steps: [],
                      },
                    })
                    setCompNewWfName('')
                    setCompNewWfCat('')
                    setCompNewWfDesc('')
                    await refreshCollections()
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '저장 오류')
                  }
                }}
              >
                템플릿 만들기
              </button>
            </div>

            <label className="span2">
              편집할 템플릿
              <select
                value={compSelWfId}
                onChange={(e) => setCompSelWfId(e.target.value)}
              >
                <option value="">선택</option>
                {compWorkflows.map((w) => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {String(w.name)} ({String(w.step_count ?? 0)}단계)
                  </option>
                ))}
              </select>
            </label>

            {compSelWfId !== '' && (
              <>
                <div className="span2">
                  <h4>단계 목록 (저장 시 전체 덮어쓰기)</h4>
                  <p className="hint">
                    기한: 없음 / 앵커 이후 N일 / 앵커 이전 N일 / 앵커 연도의 월·일(연간). 규정 문서는 규정 Q&A에 등록한 문서를 선택할 수
                    있습니다.
                  </p>
                  <label>
                    AI 초안 — 규정 문서
                    <select
                      value={compSuggestDocId}
                      onChange={(e) => setCompSuggestDocId(e.target.value)}
                    >
                      <option value="">선택</option>
                      {ragDocs.map((doc) => (
                        <option key={doc.id} value={String(doc.id)}>
                          {doc.title} (id {doc.id})
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="actions">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!compSuggestDocId) {
                          setGlobalError('규정 문서를 선택하세요.')
                          return
                        }
                        setGlobalError('')
                        setLoading(true)
                        try {
                          const data = await api<{ steps: CompStepDraft[] }>('/api/compliance/suggest-steps', {
                            method: 'POST',
                            token,
                            body: { document_id: Number(compSuggestDocId) },
                          })
                          const mapped = (data.steps ?? []).map((row) => ({
                            title: String(row.title ?? ''),
                            body: String(row.body ?? ''),
                            due_rule: (['none', 'after', 'before', 'annual'].includes(String(row.due_rule))
                              ? String(row.due_rule)
                              : 'none') as CompStepDraft['due_rule'],
                            offset_days: Number(row.offset_days ?? 0),
                            annual_month:
                              row.annual_month !== undefined && row.annual_month !== null
                                ? String(row.annual_month)
                                : '',
                            annual_day:
                              row.annual_day !== undefined && row.annual_day !== null
                                ? String(row.annual_day)
                                : '',
                            document_id:
                              row.document_id !== undefined && row.document_id !== null
                                ? String(row.document_id)
                                : compSuggestDocId,
                          }))
                          setCompSteps((prev) => (prev.length === 1 && prev[0]?.title === '' ? [] : prev).concat(mapped))
                        } catch (error) {
                          setGlobalError(error instanceof Error ? error.message : 'AI 제안 오류')
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      제안 단계 붙이기
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompSteps((rows) => rows.concat(defaultCompStep()))}
                    >
                      빈 단계 추가
                    </button>
                  </div>
                </div>
                {compSteps.map((row, idx) => (
                  <div className="span2 card" key={`step-${idx}`}>
                    <label>
                      단계 제목
                      <input
                        value={row.title}
                        onChange={(e) => {
                          const next = [...compSteps]
                          next[idx] = { ...row, title: e.target.value }
                          setCompSteps(next)
                        }}
                      />
                    </label>
                    <label className="span2">
                      설명
                      <input
                        value={row.body}
                        onChange={(e) => {
                          const next = [...compSteps]
                          next[idx] = { ...row, body: e.target.value }
                          setCompSteps(next)
                        }}
                      />
                    </label>
                    <label>
                      기한 규칙
                      <select
                        value={row.due_rule}
                        onChange={(e) => {
                          const next = [...compSteps]
                          next[idx] = { ...row, due_rule: e.target.value as CompStepDraft['due_rule'] }
                          setCompSteps(next)
                        }}
                      >
                        <option value="none">없음</option>
                        <option value="after">앵커 후 N일</option>
                        <option value="before">앵커 전 N일</option>
                        <option value="annual">연간(앵커 연도의 월/일)</option>
                      </select>
                    </label>
                    <label>
                      N일
                      <input
                        type="number"
                        min={0}
                        value={row.offset_days}
                        onChange={(e) => {
                          const next = [...compSteps]
                          next[idx] = { ...row, offset_days: Number(e.target.value) || 0 }
                          setCompSteps(next)
                        }}
                      />
                    </label>
                    <label>
                      월(연간)
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={row.annual_month}
                        onChange={(e) => {
                          const next = [...compSteps]
                          next[idx] = { ...row, annual_month: e.target.value }
                          setCompSteps(next)
                        }}
                      />
                    </label>
                    <label>
                      일(연간)
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={row.annual_day}
                        onChange={(e) => {
                          const next = [...compSteps]
                          next[idx] = { ...row, annual_day: e.target.value }
                          setCompSteps(next)
                        }}
                      />
                    </label>
                    <label className="span2">
                      근거 규정 문서 ID
                      <select
                        value={row.document_id}
                        onChange={(e) => {
                          const next = [...compSteps]
                          next[idx] = { ...row, document_id: e.target.value }
                          setCompSteps(next)
                        }}
                      >
                        <option value="">없음</option>
                        {ragDocs.map((doc) => (
                          <option key={doc.id} value={String(doc.id)}>
                            {doc.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="actions span2">
                      <button
                        type="button"
                        onClick={() =>
                          setCompSteps((prev) => prev.filter((_, j) => j !== idx))
                        }
                      >
                        이 단계 삭제
                      </button>
                    </div>
                  </div>
                ))}
                <div className="actions span2">
                  <button
                    type="button"
                    onClick={async () => {
                      const payload = compSteps.map(stepDraftToApi).filter((s) => s.title !== '')
                      if (payload.length === 0) {
                        setGlobalError('저장할 단계 제목이 없습니다.')
                        return
                      }
                      try {
                        await api(`/api/compliance/workflows/${compSelWfId}/steps`, {
                          method: 'POST',
                          token,
                          body: { steps: payload },
                        })
                        await refreshCollections()
                      } catch (error) {
                        setGlobalError(error instanceof Error ? error.message : '저장 오류')
                      }
                    }}
                  >
                    단계 저장
                  </button>
                </div>
              </>
            )}

            <div className="span2">
              <h3>실행 만들기 (앵커일 기준 마감 계산)</h3>
            </div>
            <label>
              템플릿
              <select value={compRunWfId} onChange={(e) => setCompRunWfId(e.target.value)}>
                <option value="">선택</option>
                {compWorkflows.map((w) => (
                  <option key={String(w.id)} value={String(w.id)}>
                    {String(w.name)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              앵커일
              <input type="date" value={compRunAnchor} onChange={(e) => setCompRunAnchor(e.target.value)} />
            </label>
            <label className="span2">
              실행 메모(회기명 등)
              <input value={compRunLabel} onChange={(e) => setCompRunLabel(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api('/api/compliance/runs', {
                      method: 'POST',
                      token,
                      body: {
                        workflow_id: Number(compRunWfId),
                        anchor_date: compRunAnchor,
                        run_label: compRunLabel,
                      },
                    })
                    setCompRunAnchor('')
                    setCompRunLabel('')
                    await refreshCollections()
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '실행 생성 오류')
                  }
                }}
              >
                실행 생성
              </button>
            </div>

            <div className="span2">
              <h3>최근 실행</h3>
              {compRuns.map((r) => (
                <article className="card" key={String(r.id)}>
                  <strong>{String(r.workflow_name)}</strong>
                  <p>
                    앵커 {String(r.anchor_date)} · {String(r.run_label || '—')} · {String(r.created_at)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        {module === 'board' && (
          <div className="grid2">
            <label>
              협력 과제명
              <input value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} />
            </label>
            <label>
              상태
              <select value={boardStatus} onChange={(e) => setBoardStatus(e.target.value)}>
                <option value="todo">예정</option>
                <option value="doing">진행중</option>
                <option value="done">완료</option>
              </select>
            </label>
            <label>
              기한
              <input type="date" value={boardDue} onChange={(e) => setBoardDue(e.target.value)} />
            </label>
            <label>
              메모
              <input value={boardNotes} onChange={(e) => setBoardNotes(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                onClick={async () => {
                  await api('/api/board/items', {
                    method: 'POST',
                    token,
                    body: { title: boardTitle, status: boardStatus, due_date: boardDue, notes: boardNotes },
                  })
                  await refreshCollections()
                }}
              >
                과제 등록
              </button>
            </div>
            <div className="span2">
              {boardItems.map((item, index) => (
                <article className="card" key={index}>
                  <strong>{String(item.title)}</strong>
                  <p>{String(item.status)} / 마감: {String(item.due_date)}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {module === 'org' && (
          <div className="grid2">
            <label>
              이름
              <input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </label>
            <label>
              직책
              <input value={orgRole} onChange={(e) => setOrgRole(e.target.value)} />
            </label>
            <label>
              연락처
              <input value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} />
            </label>
            <label>
              상위 노드 ID(선택)
              <input value={orgParentId} onChange={(e) => setOrgParentId(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                onClick={async () => {
                  await api('/api/org/nodes', {
                    method: 'POST',
                    token,
                    body: { name: orgName, role: orgRole, phone: orgPhone, parent_id: orgParentId || null },
                  })
                  await refreshCollections()
                }}
              >
                노드 등록
              </button>
            </div>
            <div className="span2">
              {orgNodes.map((item, index) => (
                <article className="card" key={index}>
                  <strong>{String(item.name)} ({String(item.role)})</strong>
                  <p>상위: {String(item.parent_id ?? '없음')} / 연락처: {String(item.phone)}</p>
                </article>
              ))}
            </div>
          </div>
        )}

        {module === 'settings' && (
          <div className="grid2">
            <div className="span2">
              <h3>무료 AI 설정 안내</h3>
              <p>기본값은 무료 로컬 AI(Ollama)입니다. API 서버에서 `AI_PROVIDER=ollama`, `OLLAMA_MODEL=llama3.1:8b`를 사용합니다.</p>
            </div>
            <label>
              현재 비밀번호
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </label>
            <label>
              새 비밀번호(8자 이상)
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <div className="actions span2">
              <button
                onClick={async () => {
                  try {
                    await api('/api/auth/change-password', {
                      method: 'POST',
                      token,
                      body: { currentPassword, newPassword },
                    })
                    setCurrentPassword('')
                    setNewPassword('')
                    setSettingsMessage('비밀번호가 변경되었습니다.')
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '비밀번호 변경 실패')
                  }
                }}
              >
                비밀번호 변경
              </button>
            </div>

            <div className="span2 actions">
              <button
                onClick={async () => {
                  try {
                    const data = await api<{ backup: unknown }>('/api/system/backup', { token })
                    const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `cnci-backup-${new Date().toISOString().slice(0, 10)}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                    setSettingsMessage('백업 파일 다운로드가 시작되었습니다.')
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '백업 실패')
                  }
                }}
              >
                백업 다운로드
              </button>
            </div>

            <label className="span2">
              백업 파일 복구(JSON)
              <input
                type="file"
                accept="application/json"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  try {
                    const text = await file.text()
                    const parsed = JSON.parse(text)
                    await api('/api/system/restore', {
                      method: 'POST',
                      token,
                      body: parsed,
                    })
                    await refreshCollections()
                    setSettingsMessage('복구가 완료되었습니다.')
                  } catch (error) {
                    setGlobalError(error instanceof Error ? error.message : '복구 실패')
                  }
                }}
              />
            </label>
            {settingsMessage && <p className="span2 success">{settingsMessage}</p>}
          </div>
        )}
      </section>

      <footer className="footerActions">
        <button
          className="logout"
          onClick={() => {
            localStorage.removeItem('cnci_token')
            setToken('')
          }}
        >
          로그아웃
        </button>
      </footer>
    </main>
  )
}

export default App
