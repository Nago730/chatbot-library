# 🤖 Chatbot Library for Vibe Coders

<p align="left">
  <img src="https://img.shields.io/github/stars/Nago730/chatbot-library?style=social" />
  <img src="https://img.shields.io/github/license/Nago730/chatbot-library" />
</p>

> **"Built out of frustration while freelancing. Stop coding chatbots from scratch—just 'Vibe' it with JSON."**

[English](#english) | [한국어](#한국어)

---

<a name="english"></a>
## 🇺🇸 English

### 🚀 Vision
I got tired of rebuilding the same chatbot logic for every freelance client. This library is designed for **Vibe Coders (AI-Driven Developers)** to build chatbots effortlessly using just a single JSON object.

### ✨ Key Features
* **JSON-Driven Scenarios**: Design complex dialogue flows with one JSON. No more state management hell.
* **UI Presets**: Beautiful, ready-to-use themes. Pick one and match your service style.
* **AI-Ready Documentation**: Guides specifically optimized for AI agents (Cursor, GPT). Let the AI handle your Firebase/Supabase integration.

### ⭐ Why Star this?
Every **Star** motivates me to build the "AI-ready docs" and more UI themes faster. Help me make this the most AI-friendly library on GitHub!

---

<a name="한국어"></a>
## 🇰🇷 한국어

### 🚀 개발 동기
외주 프로젝트 챗봇 요청, 매번 바닥부터 짜기 귀찮아서 직접 만들었습니다. **바이브 코더(AI 어시스턴트 활용 개발자)**가 복잡한 설정 없이 **JSON 하나로 챗봇을 '딸깍' 생성**하는 것을 목표로 합니다.

### ✨ 주요 특징
* **JSON 기반 시나리오**: 복잡한 로직 없이 JSON 객체 하나로 대화 흐름 설계 끝.
* **테마 프리셋**: 여러 UI 테마 중 서비스에 맞는 디자인을 골라 쓰기.
* **AI 전용 가이드**: AI(Cursor 등)에 복붙하면 Firebase 연동까지 알아서 해주는 '바이브 코딩 전용 문서' 제공 예정.

### ⭐ 스타(Star)를 부탁드리는 이유
여러분의 **Star** 하나가 외주 노예(?)인 저를 밤새 코딩하게 만듭니다. 나중에 Cursor에서 이 라이브러리 이름을 바로 보게 해드릴게요! 😉


여기부터 기능설명! 

# 🤖 @nago730/chatbot-library

어떤 시나리오든 주입하여 즉시 실행 가능한 **범용 멀티 시나리오 챗봇 엔진**입니다. React 환경에서 유연한 대화형 인터페이스를 구축할 수 있도록 설계되었습니다.

## ✨ 주요 특징

* **시나리오 기반 엔진**: JSON 형태의 시나리오 데이터(`flow`)만으로 복잡한 대화 흐름을 제어합니다.
* **멀티 시나리오 지원**: 런타임에 시나리오를 동적으로 교체하며, 교체 시 상태가 자동으로 초기화됩니다.
* **대화 히스토리 추적**: `messages` 배열을 통해 전체 대화 내역을 타임라인 순으로 관리합니다.
* **플러그형 저장소 어댑터**: Firebase, LocalStorage 등 어떤 DB와도 쉽게 연결할 수 있는 `StorageAdapter`를 제공합니다.
* **저장 전략 옵션**: 매 답변마다 저장할지(`always`), 대화가 끝날 때만 저장할지(`onEnd`) 선택 가능합니다.

---

## 📦 설치

```bash
npm install @nago730/chatbot-library

```

---

## 🚀 빠른 시작 가이드

### 1. 시나리오 정의

`ChatNode` 인터페이스에 맞춰 대화 흐름을 구성합니다.

```typescript
const MY_FLOW = {
  start: {
    id: 'start',
    question: '안녕하세요! 어떤 도움이 필요하신가요?',
    type: 'button',
    options: ['서비스 문의', 'AS 신청'],
    next: 'choice_step'
  },
  // ... 다음 노드들
  complete: {
    id: 'complete',
    question: '감사합니다. 곧 연락드리겠습니다.',
    isEnd: true
  }
};

```

### 2. 컴포넌트에서 사용

`useChat` 훅을 사용하여 챗봇 로직을 연결합니다.

```tsx
import { useChat } from '@nago730/chatbot-library';

function ChatComponent() {
  const { node, messages, submitAnswer, isEnd } = useChat(MY_FLOW, "user_123");

  return (
    <div>
      {/* 대화 내역 렌더링 */}
      {messages.map((msg, i) => (
        <div key={i}>👤 {msg.answer} | 🤖 {msg.question}</div>
      ))}

      {/* 현재 질문 및 선택지 */}
      {!isEnd && (
        <>
          <p>{node.question}</p>
          {node.options?.map(opt => (
            <button key={opt} onClick={() => submitAnswer(opt)}>{opt}</button>
          ))}
        </>
      )}
    </div>
  );
}

```

---

## 💾 Firebase 연동 (StorageAdapter)

라이브러리는 DB 조작 로직을 직접 포함하지 않고, 개발자가 구현한 인터페이스를 실행합니다.

### 어댑터 구현 및 연결 예시

```typescript
// 1. Firebase API 구현 (firebaseService.ts)
const firebaseAdapter = {
  saveState: async (userId, state) => {
    await setDoc(doc(db, 'chat_sessions', userId), state);
  },
  loadState: async (userId) => {
    const snap = await getDoc(doc(db, 'chat_sessions', userId));
    return snap.exists() ? snap.data() : null;
  }
};

// 2. 훅에 연결 및 저장 전략 설정
const chat = useChat(flow, userId, 'start', firebaseAdapter, {
  saveStrategy: 'always' // 'always' (매회 저장) 또는 'onEnd' (종료 시만 저장)
});

```

---

## 📖 API 레퍼런스

### `useChat` Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `flow` | `Record<string, ChatNode>` | 시나리오 설계도 데이터 |
| `userId` | `string` | 사용자 식별자 (저장 및 로드 시 사용) |
| `initialNodeId` | `string` | 시작 노드 ID (기본값: 'start') |
| `adapter` | `StorageAdapter` | (Optional) 외부 DB 연동용 어댑터 |
| `options` | `ChatOptions` | (Optional) `saveStrategy` 설정 |

### `useChat` Return Values

* `node`: 현재 진행 중인 `ChatNode` 객체
* `submitAnswer`: 버튼 기반 답변 제출 함수
* `submitInput`: 주관식 텍스트 답변 제출 함수
* `answers`: 현재까지 수집된 키-값 형태의 결과 데이터
* `messages`: 전체 대화 히스토리 (ChatMessage 배열)
* `isEnd`: 시나리오 종료 여부

---

## 🛠 타입 정의 (Types)

```typescript
export interface ChatMessage {
  nodeId: string;
  question: string;
  answer: any;
  timestamp: number;
}

export interface ChatState {
  answers: Record<string, any>;
  currentStep: string;
  messages: ChatMessage[];
}

```

---

## 📄 라이선스

MIT License
