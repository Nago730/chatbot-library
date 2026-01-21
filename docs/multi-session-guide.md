# 멀티 세션 기능 가이드

## 🎯 개요

`@nago730/chatbot-library`는 한 사용자가 **여러 번 상담을 시작**할 수 있도록 **세션 기반 상태 관리**를 지원합니다.

---

## ✨ 주요 기능

### 1. 세션 기반 데이터 격리
각 상담은 독립적인 세션 ID를 가지며, 세션별로 대화 내역이 분리 저장됩니다.

```typescript
// 저장 키 구조
localStorage: {
  "_nago_chat_support_user123_session_1706000000_abc123": { /* 첫 번째 상담 */ },
  "_nago_chat_support_user123_session_1706100000_def456": { /* 두 번째 상담 */ },
  "_nago_chat_last_session_support_user123": "session_1706100000_def456"
}
```

### 2. 스마트 로딩 전략
새로고침 시 어떤 세션을 불러올지 자동으로 결정합니다.

**우선순위**:
1. URL 파라미터나 `options.sessionId`에 특정 세션 ID → 해당 세션 복구
2. 로컬에 '마지막 세션 ID' 기록 → 이어가기
3. 둘 다 없음 → 신규 세션 생성

### 3. reset() 함수
UI에서 "새 상담 시작" 버튼을 쉽게 구현할 수 있습니다.

```typescript
const { reset, sessionId } = useChat(flow, userId);

// 새 상담 시작
<button onClick={() => reset()}>새 상담</button>

// 특정 상담 불러오기
<button onClick={() => reset('session_1706000000_abc123')}>이전 상담 보기</button>
```

---

## 📖 API 레퍼런스

### useChat 옵션

```typescript
const chat = useChat(flow, userId, 'start', adapter, {
  scenarioId: 'customer-support',
  sessionId: 'auto' | 'new' | 'specific_session_id'
});
```

| 옵션 | 타입 | 설명 |
|------|------|------|
| `sessionId` | `'auto'` | (기본값) 마지막 세션 복구 또는 새 세션 생성 |
| `sessionId` | `'new'` | 항상 새로운 세션 시작 |
| `sessionId` | `string` | 특정 세션 ID로 복구 또는 생성 |

### useChat 반환값

```typescript
const {
  node,           // 현재 노드
  submitAnswer,   // 답변 제출
  submitInput,    // 텍스트 입력
  answers,        // 수집된 답변
  messages,       // 대화 히스토리
  isEnd,          // 종료 여부
  sessionId,      // ⭐ 현재 세션 ID
  reset           // ⭐ 세션 리셋 함수
} = useChat(...);
```

### reset 함수

```typescript
reset(newSessionId?: string): void
```

- **인자 없이 호출**: 완전히 새로운 빈 상담 시작
- **특정 ID 입력**: 과거 상담 내역 불러오기

---

## 🚀 사용 예제

### 예제 1: 기본 사용 (자동 세션 관리)

```typescript
import { useChat } from '@nago730/chatbot-library';

function ChatComponent() {
  const { node, submitAnswer, sessionId, reset } = useChat(
    SUPPORT_FLOW,
    'user_123',
    'start',
    undefined,
    { sessionId: 'auto' } // 마지막 세션 이어가기
  );

  return (
    <div>
      <p>현재 세션: {sessionId}</p>
      <button onClick={() => reset()}>새 상담 시작</button>
      
      {/* 챗봇 UI */}
      <div>{node.question}</div>
      {node.options?.map(opt => (
        <button onClick={() => submitAnswer(opt)}>{opt}</button>
      ))}
    </div>
  );
}
```

### 예제 2: 항상 새 상담으로 시작

```typescript
const chat = useChat(FLOW, userId, 'start', adapter, {
  sessionId: 'new' // 매번 새 세션
});

// 사용 사례: 설문조사, 일회성 상담
```

### 예제 3: 이전 상담 목록 보기

```typescript
function ChatHistory() {
  const [sessions, setSessions] = useState<string[]>([]);
  const { reset } = useChat(FLOW, userId);

  useEffect(() => {
    // 로컬스토리지에서 모든 세션 ID 추출
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key => 
      key.startsWith(`_nago_chat_support_${userId}_session_`)
    );
    
    const sessionIds = sessionKeys.map(key => {
      const match = key.match(/session_\d+_\w+/);
      return match ? match[0] : null;
    }).filter(Boolean) as string[];
    
    setSessions(sessionIds);
  }, [userId]);

  return (
    <div>
      <h3>이전 상담 내역</h3>
      <ul>
        {sessions.map(sessionId => (
          <li key={sessionId}>
            <button onClick={() => reset(sessionId)}>
              {sessionId} 불러오기
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 예제 4: 상담 종료 후 자동으로 새 세션 준비

```typescript
function SmartChatComponent() {
  const { node, isEnd, sessionId, reset } = useChat(FLOW, userId);

  // 상담이 끝나면 자동으로 '새 상담' 버튼 표시
  if (isEnd) {
    return (
      <div>
        <p>✅ 상담이 완료되었습니다. (세션: {sessionId})</p>
        <button onClick={() => reset()}>
          새 상담 시작하기
        </button>
      </div>
    );
  }

  return <div>{/* 챗봇 UI */}</div>;
}
```

### 예제 5: URL 파라미터로 세션 복구

```typescript
import { useSearchParams } from 'react-router-dom';

function RoutedChat() {
  const [searchParams] = useSearchParams();
  const urlSessionId = searchParams.get('sessionId');

  const chat = useChat(FLOW, userId, 'start', adapter, {
    sessionId: urlSessionId || 'auto'
  });

  return <ChatUI {...chat} />;
}

// URL: /chat?sessionId=session_1706000000_abc123
// → 해당 세션 자동 복구
```

---

## 🎨 UI 패턴

### 패턴 1: 탭 형식 (진행 중 / 완료된 상담)

```typescript
function TabbedChat() {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const { sessionId, reset, isEnd } = useChat(FLOW, userId);

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab('current')}>진행 중</button>
        <button onClick={() => setActiveTab('history')}>이전 상담</button>
      </nav>

      {activeTab === 'current' ? (
        <CurrentChat sessionId={sessionId} isEnd={isEnd} reset={reset} />
      ) : (
        <ChatHistory onSelectSession={reset} />
      )}
    </div>
  );
}
```

### 패턴 2: 모달 형식 (새 상담 확인)

```typescript
function ConfirmNewChatModal({ onConfirm, onCancel }) {
  return (
    <div className="modal">
      <h3>새 상담을 시작하시겠습니까?</h3>
      <p>현재 진행 중인 상담은 저장됩니다.</p>
      <button onClick={onConfirm}>시작</button>
      <button onClick={onCancel}>취소</button>
    </div>
  );
}

function ChatWithModal() {
  const [showModal, setShowModal] = useState(false);
  const { reset } = useChat(FLOW, userId);

  const handleNewChat = () => {
    reset();
    setShowModal(false);
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>새 상담</button>
      {showModal && (
        <ConfirmNewChatModal
          onConfirm={handleNewChat}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

---

## 🔧 내부 동작 원리

### 1. 세션 초기화 과정

```
사용자가 useChat 호출
 ↓
options.sessionId 확인
 ├─ 'new' → 새 세션 ID 생성
 ├─ 특정 ID → 해당 ID 사용
 └─ 'auto' 또는 미지정
     ↓
     localStorage에서 마지막 세션 ID 확인
     ├─ 있음 → 해당 세션 복구
     └─ 없음 → 새 세션 ID 생성
```

### 2. 저장 키 구조

```typescript
// 세션 데이터
`_nago_chat_${scenarioId}_${userId}_${sessionId}`
// 예: "_nago_chat_support_user123_session_1706000000_abc123"

// 마지막 세션 추적
`_nago_chat_last_session_${scenarioId}_${userId}`
// 예: "_nago_chat_last_session_support_user123"
```

### 3. reset() 동작 흐름

```typescript
reset(newSessionId?)
 ↓
1. 세션 ID 결정 (인자 있으면 사용, 없으면 생성)
 ↓
2. 마지막 세션 기록 업데이트
 ↓
3. currentSessionId 상태 변경
 ↓
4-A. 인자가 있었다면 (과거 세션 복구)
    ↓
    localStorage에서 해당 세션 데이터 로드
    ↓
    flowHash 검증
    ↓
    상태 복구 (stepId, answers, messages)
 ↓
4-B. 인자가 없었다면 (새 세션)
    ↓
    상태 초기화 (빈 answers, messages)
```

---

## ⚠️ 주의사항

### 1. 서버 동기화
현재 버전에서는 **세션 데이터를 로컬스토리지에만 저장**합니다.  
Firebase 등 서버와 동기화하려면 어댑터를 확장해야 합니다.

```typescript
// 향후 확장 예정
interface StorageAdapter {
  saveState: (userId: string, state: ChatState, sessionId: string) => Promise<void>;
  loadState: (userId: string, sessionId: string) => Promise<ChatState | null>;
  listSessions: (userId: string) => Promise<string[]>; // 신규
}
```

### 2. 세션 ID 형식
자동 생성되는 세션 ID 형식:
```
session_${timestamp}_${randomString}
// 예: "session_1706023123456_k3j2n1m9a"
```

이 형식을 유지하면 시간순 정렬이 가능합니다.

### 3. 브라우저 제한
- 로컬스토리지 용량 제한: 약 5-10MB
- 오래된 세션은 주기적으로 삭제하는 로직 권장

```typescript
// 예: 30일 이상된 세션 정리
const cleanOldSessions = (userId: string, daysOld: number = 30) => {
  const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  Object.keys(localStorage).forEach(key => {
    if (key.includes(`_${userId}_session_`)) {
      const match = key.match(/session_(\d+)_/);
      if (match) {
        const timestamp = parseInt(match[1]);
        if (timestamp < cutoff) {
          localStorage.removeItem(key);
        }
      }
    }
  });
};
```

---

## 🎯 실전 활용 사례

### 1. 고객 지원 챗봇
- 고객이 여러 문의를 할 수 있음
- 이전 문의 내역 조회 가능
- 각 문의는 별도 세션으로 관리

### 2. 설문조사 플랫폼
- 같은 사용자가 여러 설문 응답
- 각 설문은 독립적인 세션
- 중간 저장 후 나중에 이어하기 가능

### 3. 의료 상담 서비스
- 환자가 증상별로 상담 진행
- 과거 상담 기록 보관 및 조회
- HIPAA 준수를 위한 데이터 격리

### 4. 교육 플랫폼
- 학생이 여러 퀴즈/과제 수행
- 각 퀴즈는 별도 세션
- 성적 추적 및 재응시 지원

---

## 📚 더 알아보기

- 📖 [useChat API 문서](../README.md#api-reference)
- 🔥 [Firebase 동기화 가이드](./firebase-adapter-guide.md)
- ⚡ [Quick Reference](./firebase-quick-reference.md)

---

**🎉 이제 사용자가 원하는 만큼 상담을 시작하고 관리할 수 있습니다!**
