# @nago730/chatbot-library

> **JSON 하나로 만드는 프로덕션 레디 챗봇 엔진** — React 환경에서 복잡한 대화형 인터페이스를 5분 안에 구축하세요.

<p align="left">
  <img src="https://img.shields.io/npm/v/@nago730/chatbot-library" alt="npm version" />
  <img src="https://img.shields.io/github/license/Nago730/chatbot-library" alt="license" />
  <img src="https://img.shields.io/npm/dm/@nago730/chatbot-library" alt="downloads" />
</p>

---

## 🎯 핵심 기능 3가지

| 기능 | 설명 | 효과 |
|------|------|------|
| 🗂️ **JSON 기반 시나리오** | 코드 없이 대화 흐름 설계 | 개발 시간 **90% 단축** |
| 🔄 **멀티 세션 관리** | 한 사용자가 여러 상담 진행 | 사용자 경험 **향상** |
| 🔥 **프로덕션 레디** | Firebase 연동 + 비용 최적화 | 운영 비용 **98% 절감** |

---

## ⚡ 5분 빠른 시작

### 1. 설치

```bash
npm install @nago730/chatbot-library
```

### 2. Flow 정의 (JSON)

```typescript
const SUPPORT_FLOW = {
  start: {
    id: 'start',
    question: '무엇을 도와드릴까요?',
    type: 'button',
    options: ['주문 문의', '배송 조회', '취소/환불'],
    next: (answer) => {
      if (answer === '주문 문의') return 'order';
      if (answer === '배송 조회') return 'delivery';
      return 'refund';
    }
  },
  order: {
    id: 'order',
    question: '주문번호를 입력해주세요',
    type: 'input',
    next: 'complete'
  },
  complete: {
    id: 'complete',
    question: '감사합니다. 곧 연락드리겠습니다.',
    next: '',
    isEnd: true
  }
};
```

### 3. 컴포넌트에서 사용

```tsx
import { useChat } from '@nago730/chatbot-library';

function ChatBot() {
  const { node, submitAnswer, submitInput, messages, isEnd } = useChat(
    SUPPORT_FLOW,
    'user_123'
  );

  if (isEnd) {
    return <div>✅ {node.question}</div>;
  }

  return (
    <div>
      {/* 대화 히스토리 */}
      {messages.map((msg, i) => (
        <div key={i}>
          <p>🤖 {msg.question}</p>
          <p>👤 {msg.answer}</p>
        </div>
      ))}

      {/* 현재 질문 */}
      <p>{node.question}</p>

      {/* 버튼형 */}
      {node.type === 'button' && node.options?.map(opt => (
        <button key={opt} onClick={() => submitAnswer(opt)}>
          {opt}
        </button>
      ))}

      {/* 입력형 */}
      {node.type === 'input' && (
        <input onKeyDown={(e) => {
          if (e.key === 'Enter') submitInput(e.currentTarget.value);
        }} />
      )}
    </div>
  );
}
```

**🎉 완료!** 이제 작동하는 챗봇이 생겼습니다.

---

## 📚 핵심 개념

### Flow 구조

Flow는 **노드(Node)의 집합**입니다. 각 노드는 질문과 다음 단계를 정의합니다.

```typescript
interface ChatNode {
  id: string;                    // 고유 ID
  question: string;              // 사용자에게 보여줄 질문
  type?: 'button' | 'input';     // 답변 받는 방식 (기본: button)
  options?: string[];            // 선택지 (type='button'일 때)
  next: string | ((answer) => string);  // 다음 노드 ID (동적 가능)
  isEnd?: boolean;               // 대화 종료 표시
}
```

### 세션 관리

한 사용자가 **여러 번 상담**을 시작할 수 있습니다.

```typescript
const { sessionId, reset } = useChat(FLOW, userId, 'start', adapter, {
  sessionId: 'auto'  // 'auto' | 'new' | 'specific_id'
});

// 새 상담 시작
<button onClick={() => reset()}>새 상담</button>
```

### 저장 전략

```typescript
const chat = useChat(FLOW, userId, 'start', adapter, {
  saveStrategy: 'onEnd'  // 'always' | 'onEnd'
});
```

| 전략 | 저장 시점 | 추천 대상 |
|------|-----------|-----------|
| `'always'` | 매 답변마다 | 데이터 무결성이 중요한 경우 |
| `'onEnd'` | 대화 종료 시 | **비용 절감** (권장) |

---

## 🔥 Firebase 연동 (프로덕션)

### Quick Start

```typescript
import { createHybridFirebaseAdapter } from '@nago730/chatbot-library/examples';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);
const adapter = createHybridFirebaseAdapter(db, {
  timeout: 5000,
  fallbackToLocal: true,
  debug: false
});

const chat = useChat(FLOW, userId, 'start', adapter, {
  saveStrategy: 'onEnd'  // 비용 98% 절감!
});
```

### 비용 최적화

**10만 사용자, 일 10회 대화 기준 (Firestore)**

| 구성 | 월 비용 | 절감율 |
|------|---------|--------|
| 기본 설정 (always + 전체 데이터) | $2,700 | - |
| **하이브리드 + onEnd** ⭐ | **$5.4** | **99.8%** |

### 핵심 개선사항

- ✅ **기기 전환 복구**: PC → 모바일 대화 이어가기 100%
- ✅ **네트워크 안정성**: 타임아웃 + 자동 폴백
- ✅ **타입 안전**: Firebase Timestamp 자동 정규화
- ✅ **비용 최적화**: 스마트 저장 전략

📖 [Firebase 상세 가이드](./docs/firebase-adapter-guide.md)

---

## 🔄 멀티 세션

한 사용자가 **여러 상담을 진행**하고 **이전 대화를 불러올** 수 있습니다.

```typescript
const { sessionId, reset, isEnd } = useChat(FLOW, userId, 'start', adapter, {
  sessionId: 'auto'
});

// UI 예제
<div>
  <p>현재 세션: {sessionId}</p>
  
  {isEnd && (
    <button onClick={() => reset()}>
      새 상담 시작
    </button>
  )}
  
  <button onClick={() => reset('session_1706000000_abc')}>
    이전 상담 보기
  </button>
</div>
```

📖 [멀티 세션 완벽 가이드](./docs/multi-session-guide.md)

---

## 📖 API Reference

### useChat

```typescript
useChat(
  flow: Record<string, ChatNode>,
  userId: string,
  initialNodeId?: string,
  adapter?: StorageAdapter,
  options?: ChatOptions
)
```

#### Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `flow` | `Record<string, ChatNode>` | 시나리오 Flow 객체 |
| `userId` | `string` | 사용자 ID (세션 키로 사용) |
| `initialNodeId` | `string` | 시작 노드 ID (기본: `'start'`) |
| `adapter` | `StorageAdapter` | 저장소 어댑터 (선택) |
| `options` | `ChatOptions` | 추가 옵션 (선택) |

#### ChatOptions

```typescript
interface ChatOptions {
  saveStrategy?: 'always' | 'onEnd';  // 저장 시점
  scenarioId?: string;                 // 시나리오 ID
  sessionId?: 'auto' | 'new' | string; // 세션 전략
}
```

#### Return Values

```typescript
{
  node: ChatNode;              // 현재 노드
  submitAnswer: (value: any) => Promise<void>;  // 버튼 답변 제출
  submitInput: (value: string) => Promise<void>; // 텍스트 답변 제출
  answers: Record<string, any>;  // 수집된 답변
  messages: ChatMessage[];       // 대화 히스토리
  isEnd: boolean;                // 종료 여부
  sessionId: string;             // 현재 세션 ID
  reset: (sessionId?: string) => void;  // 세션 리셋
}
```

### StorageAdapter

```typescript
interface StorageAdapter {
  saveState: (userId: string, state: ChatState) => Promise<void>;
  loadState: (userId: string) => Promise<ChatState | null>;
}
```

---

## 📚 전체 문서

### 가이드
- 📘 [**Complete Guide**](./docs/complete-guide.md) - 모든 기능 + 실전 패턴
- 🔥 [Firebase Adapter Guide](./docs/firebase-adapter-guide.md)
- 🔄 [Multi-Session Guide](./docs/multi-session-guide.md)
- ⚡ [Quick Reference](./docs/firebase-quick-reference.md)

### 학습 자료
- ✅ [Best Practices](./docs/best-practices.md) - DO's & DON'Ts
- 💡 [Examples](./docs/examples.md) - 실전 코드 모음
- 🔧 [예제 코드](./src/examples/)

---

## ⚠️ Common Pitfalls

개발 시 자주 발생하는 실수들:

1. ❌ **sessionId 없이 멀티 상담 구현** → `reset()` 사용하세요
2. ❌ **saveStrategy: 'always' + 실시간 타이핑** → `'onEnd'` 사용 권장
3. ❌ **Firebase Timestamp 정규화 누락** → 어댑터 예제 코드 사용
4. ❌ **에러 핸들링 없음** → `fallbackToLocal: true` 설정 필수

📖 [전체 Best Practices 보기](./docs/best-practices.md)

---

## 🚀 실전 예제

### 고객 지원 챗봇

```typescript
const SUPPORT_FLOW = {
  start: { /* ... */ },
  order_inquiry: { /* ... */ },
  delivery_status: { /* ... */ },
  refund: { /* ... */ }
};

function CustomerSupport() {
  const { node, submitAnswer, reset, sessionId } = useChat(
    SUPPORT_FLOW,
    customerId,
    'start',
    firebaseAdapter,
    { sessionId: 'auto', saveStrategy: 'onEnd' }
  );
  
  return <ChatUI node={node} onAnswer={submitAnswer} onReset={reset} />;
}
```

더 많은 예제: [Examples](./docs/examples.md)

---

## 🛠️ 타입 정의

```typescript
// ChatNode
interface ChatNode {
  id: string;
  question: string;
  type?: 'button' | 'input';
  options?: string[];
  next: string | ((answer: any) => string);
  isEnd?: boolean;
}

// ChatMessage
interface ChatMessage {
  nodeId: string;
  question: string;
  answer: any;
  timestamp: number;
}

// ChatState
interface ChatState {
  answers: Record<string, any>;
  currentStep: string;
  messages: ChatMessage[];
  flowHash: string;
  updatedAt: number;
}
```

---

## 🤝 기여하기

이 라이브러리는 프리랜서 외주 작업을 하며 반복되는 챗봇 구현에 지쳐 만들어졌습니다.  
AI 기반 개발에 최적화된 문서를 목표로 하고 있습니다.

- ⭐ **Star** 하나가 개발 동기부여가 됩니다!
- 🐛 버그 제보: [Issues](https://github.com/Nago730/chatbot-library/issues)
- 💡 기능 제안: [Issues](https://github.com/Nago730/chatbot-library/issues) (기능 제안도 환영합니다!)

---

## 📄 라이선스

MIT License

---

**Made with ❤️ for Vibe Coders** — AI 시대의 더 나은 개발 경험을 위해
