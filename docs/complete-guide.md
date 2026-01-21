# Complete Guide

> **@nago730/chatbot-library 완벽 가이드** — 설치부터 프로덕션 배포까지 모든 것

---

## 📑 목차

- [Part 1: 기초](#part-1-기초)
- [Part 2: 핵심 기능](#part-2-핵심-기능)
- [Part 3: 고급 기능](#part-3-고급-기능)
- [Part 4: 프로덕션 배포](#part-4-프로덕션-배포)
- [Part 5: Best Practices](#part-5-best-practices)
- [Part 6: 실전 예제](#part-6-실전-예제)

---

## Part 1: 기초

### 1.1 설치 및 설정

```bash
npm install @nago730/chatbot-library
```

**필수 의존성**:
- React 16.8+ (Hooks 지원)
- TypeScript 4.0+ (권장)

### 1.2 첫 번째 챗봇 만들기

```typescript
import { useChat } from '@nago730/chatbot-library';

// 1. Flow 정의
const SIMPLE_FLOW = {
  start: {
    id: 'start',
    question: '이름을 알려주세요',
    type: 'input',
    next: 'greeting'
  },
  greeting: {
    id: 'greeting',
    question: '반갑습니다!',
    isEnd: true
  }
};

// 2. 컴포넌트에서 사용
function MyFirstChatbot() {
  const { node, submitInput, answers } = useChat(SIMPLE_FLOW, 'user_1');
  
  if (node.isEnd) {
    return <div>안녕하세요, {answers.start}님!</div>;
  }
  
  return (
    <div>
      <p>{node.question}</p>
      <input onKeyDown={(e) => {
        if (e.key === 'Enter') {
          submitInput(e.currentTarget.value);
        }
      }} />
    </div>
  );
}
```

### 1.3 Flow 설계 패턴

#### 기본 구조

```typescript
const FLOW = {
  [nodeId]: {
    id: string;              // 노드 고유 ID (key와 동일해야 함)
    question: string;        // 사용자에게 보여줄 메시지
    type?: 'button' | 'input'; // 답변 받는 방식 (기본: 'button')
    options?: string[];      // type='button'일 때 선택지  
    next: string | Function; // 다음 노드 (정적/동적)
    isEnd?: boolean;         // 대화 종료 표시
  }
};
```

#### 선택지 분기

```typescript
const FLOW = {
  start: {
    id: 'start',
    question: '커피 또는 차?',
    type: 'button',
    options: ['커피', '차'],
    next: (answer) => answer === '커피' ? 'coffee' : 'tea'
  },
  coffee: {
    id: 'coffee',
    question: '아메리카노 준비 중...',
    isEnd: true
  },
  tea: {
    id: 'tea',
    question: '녹차 준비 중...',
    isEnd: true
  }
};
```

#### 중첩된 질문

```typescript
const ORDER_FLOW = {
  start: {
    id: 'start',
    question: '음료를 선택하세요',
    type: 'button',
    options: ['커피', '차'],
    next: 'size'
  },
  size: {
    id: 'size',
    question: '사이즈는?',
    type: 'button',
    options: ['Small', 'Medium', 'Large'],
    next: 'complete'
  },
  complete: {
    id: 'complete',
    question: '주문 완료!',
    isEnd: true
  }
};
```

---

## Part 2: 핵심 기능

### 2.1 멀티 세션 관리

한 사용자가 여러 상담을 진행할 수 있습니다.

#### sessionId 전략

```typescript
// 1. 자동 모드 (기본): 마지막 세션 이어가기
const chat = useChat(FLOW, userId, 'start', adapter, {
  sessionId: 'auto'
});

// 2. 항상 새 세션
const chat = useChat(FLOW, userId, 'start', adapter, {
  sessionId: 'new'
});

// 3. 특정 세션 복구
const chat = useChat(FLOW, userId, 'start', adapter, {
  sessionId: 'session_1706000000_abc123'
});
```

#### reset() 활용

```typescript
const { sessionId, reset, isEnd } = useChat(FLOW, userId);

// 새 상담 시작
function startNewChat() {
  reset(); // 새 세션 ID 자동 생성
}

// 특정 상담 불러오기
function loadSession(id: string) {
  reset(id);
}

// UI 예제
return (
  <div>
    <p>현재 세션: {sessionId}</p>
    
    {isEnd && (
      <button onClick={startNewChat}>새 상담</button>
    )}
    
    <SessionHistory onSelect={loadSession} />
  </div>
);
```

#### 세션 목록 UI 패턴

```typescript
function SessionHistory({ userId, onSelect }) {
  const [sessions, setSessions] = useState<string[]>([]);
  
  useEffect(() => {
    // 로컬스토리지에서 세션 추출
    const keys = Object.keys(localStorage);
    const sessionIds = keys
      .filter(key => key.includes(`_${userId}_session_`))
      .map(key => {
        const match = key.match(/session_\d+_\w+/);
        return match ? match[0] : null;
      })
      .filter(Boolean);
    
    setSessions(sessionIds);
  }, [userId]);
  
  return (
    <ul>
      {sessions.map(sid => (
        <li key={sid}>
          <button onClick={() => onSelect(sid)}>
            {new Date(parseInt(sid.split('_')[1])).toLocaleString()}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### 2.2 저장소 연동

#### 2.2.1 LocalStorage (기본)

어댑터를 제공하지 않으면 자동으로 LocalStorage에 저장됩니다.

```typescript
const chat = useChat(FLOW, userId);
// 자동으로 localStorage에 저장/불러오기
```

#### 2.2.2 Firebase Adapter

```typescript
import { createHybridFirebaseAdapter } from '@nago730/chatbot-library/examples';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);
const adapter = createHybridFirebaseAdapter(db, {
  timeout: 5000,
  fallbackToLocal: true,
  debug: false
});

const chat = useChat(FLOW, userId, 'start', adapter);
```

**핵심 개선사항**:
- ✅ 타임아웃 처리 (5초)
- ✅ 에러 시 로컬 폴백
- ✅ Timestamp 자동 정규화
- ✅ 비용 최적화 (메타데이터만 저장)

#### 2.2.3 Custom Adapter 만들기

```typescript
import { StorageAdapter, ChatState } from '@nago730/chatbot-library';

const myAdapter: StorageAdapter = {
  saveState: async (userId, state) => {
    // 원하는 DB에 저장
    await fetch('/api/chat/save', {
      method: 'POST',
      body: JSON.stringify({ userId, state })
    });
  },
  
  loadState: async (userId) => {
    // 원하는 DB에서 불러오기
    const res = await fetch(`/api/chat/load?userId=${userId}`);
    if (!res.ok) return null;
    return await res.json();
  }
};

const chat = useChat(FLOW, userId, 'start', myAdapter);
```

### 2.3 저장 전략

#### always vs onEnd

```typescript
// 전략 1: 매 답변마다 저장
const chat = useChat(FLOW, userId, 'start', adapter, {
  saveStrategy: 'always'
});
// 장점: 데이터 손실 최소화
// 단점: Firebase 비용 높음

// 전략 2: 대화 종료 시에만 저장 (권장)
const chat = useChat(FLOW, userId, 'start', adapter, {
  saveStrategy: 'onEnd'
});
// 장점: 비용 98% 절감
// 단점: 중간에 나가면 저장 안 됨
```

#### 비용 비교 (10만 사용자 기준)

| 전략 | Firebase Writes/월 | 월 비용 |
|------|---------------------|---------|
| `'always'` + 전체 데이터 | 1,500만 | $2,700 |
| `'always'` + 하이브리드 | 1,500만 | $270 |
| `'onEnd'` + 하이브리드 | 300만 | **$5.4** ⭐ |

---

## Part 3: 고급 기능

### 3.1 동적 Next Step (함수형)

```typescript
const SURVEY_FLOW = {
  age: {
    id: 'age',
    question: '나이를 입력하세요',
    type: 'input',
    next: (answer) => {
      const age = parseInt(answer);
      if (age < 20) return 'teen';
      if (age < 40) return 'adult';
      return 'senior';
    }
  },
  teen: {
    id: 'teen',
    question: '젊으시네요!',
    isEnd: true
  },
  adult: {
    id: 'adult',
    question: '한창 때시네요!',
    isEnd: true
  },
  senior: {
    id: 'senior',
    question: '연륜이 느껴집니다!',
    isEnd: true
  }
};
```

### 3.2 조건부 분기

#### 이전 답변 기반 분기

```typescript
const BOOKING_FLOW = {
  start: {
    id: 'start',
    question: '예약하시겠습니까?',
    type: 'button',
    options: ['예', '아니오'],
    next: (answer) => answer === '예' ? 'datetime' : 'cancel'
  },
  datetime: {
    id: 'datetime',
    question: '날짜를 선택하세요',
    type: 'input',
    next: 'confirm'
  },
  confirm: {
    id: 'confirm',
    question: (answers) => `${answers.datetime}에 예약하시겠습니까?`,
    type: 'button',
    options: ['확인', '취소'],
    next: (answer) => answer === '확인' ? 'complete' : 'datetime'
  },
  complete: {
    id: 'complete',
    question: '예약완료!',
    isEnd: true
  },
  cancel: {
    id: 'cancel',
    question: '취소되었습니다',
    isEnd: true
  }
};
```

### 3.3 복잡한 Flow 설계

#### 재사용 가능한 노드 패턴

```typescript
// 공통 에러 노드
const ERROR_NODE = {
  id: 'error',
  question: '오류가 발생했습니다. 다시 시도해주세요.',
  type: 'button',
  options: ['처음부터'],
  next: 'start'
};

// 공통 취소 노드
const CANCEL_NODE = {
  id: 'cancel',
  question: '취소되었습니다.',
  type: 'button',
  options: ['처음으로'],
  next: 'start'
};

const COMPLEX_FLOW = {
  start: { /* ... */ },
  // ... 여러 노드들
  error: ERROR_NODE,
  cancel: CANCEL_NODE
};
```

#### 유효성 검사

```typescript
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const EMAIL_FLOW = {
  email: {
    id: 'email',
    question: '이메일을 입력하세요',
    type: 'input',
    next: (answer) => {
      return isValidEmail(answer) ? 'confirm' : 'invalid_email';
    }
  },
  invalid_email: {
    id: 'invalid_email',
    question: '올바른 이메일을 입력하세요',
    type: 'input',
    next: (answer) => isValidEmail(answer) ? 'confirm' : 'invalid_email'
  },
  confirm: {
    id: 'confirm',
    question: '확인되었습니다',
    isEnd: true
  }
};
```

---

## Part 4: 프로덕션 배포

### 4.1 Firebase 최적화

#### 하이브리드 전략

```typescript
const adapter = createHybridFirebaseAdapter(db, {
  timeout: 5000,         // 5초 타임아웃
  fallbackToLocal: true, // 에러 시 로컬 사용
  debug: false           // 프로덕션에서는 false
});

const chat = useChat(FLOW, userId, 'start', adapter, {
  saveStrategy: 'onEnd',  // 비용 절감
  sessionId: 'auto'
});
```

#### Guest vs 회원 구분

라이브러리가 자동으로 처리합니다:

```typescript
// Guest 사용자: isEnd=true일 때만 서버 저장
const guestChat = useChat(FLOW, guestId);

// 회원 사용자: save Strategy에 따라 저장
const userChat = useChat(FLOW, memberId, 'start', adapter, {
  saveStrategy: 'onEnd'
});
```

### 4.2 에러 핸들링

#### 어댑터 레벨

```typescript
const safeAdapter: StorageAdapter = {
  saveState: async (userId, state) => {
    try {
      await adapter.saveState(userId, state);
    } catch (error) {
      console.error('[Adapter] Save failed:', error);
      // 로컬은 이미 저장되었으므로 조용히 실패
    }
  },
  
  loadState: async (userId) => {
    try {
      return await adapter.loadState(userId);
    } catch (error) {
      console.error('[Adapter] Load failed:', error);
      return null; // 로컬 데이터 사용
    }
  }
};
```

#### UI 레벨

```typescript
function ChatWithErrorBoundary() {
  const [error, setError] = useState<string | null>(null);
  
  const chat = useChat(FLOW, userId, 'start', adapter);
  
  if (error) {
    return <ErrorFallback error={error} onRetry={() => setError(null)} />;
  }
  
  return <ChatUI {...chat} onError={setError} />;
}
```

### 4.3 타임아웃 및 폴백

Firebase 어댑터에 내장되어 있습니다:

```typescript
const adapter = createHybridFirebaseAdapter(db, {
  timeout: 5000,          // 5초 후 타임아웃
  fallbackToLocal: true   // 실패 시 로컬 데이터 사용
});
```

### 4.4 비용 절감 전략

#### 1단계: saveStrategy 최적화

```typescript
const chat = useChat(FLOW, userId, 'start', adapter, {
  saveStrategy: 'onEnd'  // 80% 비용 절감
});
```

#### 2단계: 하이브리드 어댑터 사용

```typescript
const adapter = createHybridFirebaseAdapter(db);
// 메타데이터만 저장 → 90% 추가 절감
```

#### 3단계: 세션 정리

```typescript
// 30일 이상 된 세션 삭제
function cleanOldSessions(userId: string) {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  Object.keys(localStorage).forEach(key => {
    if (key.includes(`_${userId}_session_`)) {
      const match = key.match(/session_(\d+)_/);
      if (match && parseInt(match[1]) < cutoff) {
        localStorage.removeItem(key);
      }
    }
  });
}
```

---

## Part 5: Best Practices

### 5.1 ✅ DO's

#### Flow 설계
- ✅ 각 노드는 **단일 책임**
- ✅ `isEnd`를 명확히 표시
- ✅ 에러 케이스 fallback 노드 준비

```typescript
// ✅ 좋은 예
const GOOD_FLOW = {
  start: { /* 시작만 담당 */ },
  email: { /* 이메일 입력만 담당 */ },
  verify: { /* 검증만 담당 */ },
  error: { /* 에러 처리 */ },
  complete: { isEnd: true }
};
```

#### 세션 관리
- ✅ sessionId는 의미 있는 네이밍

```typescript
// ✅ 좋은 예
const sessionId = `inquiry_${inquiryType}_${Date.now()}`;
```

- ✅ 오래된 세션 정기적으로 정리
- ✅ 세션 전환 시 사용자 확인

#### 저장소
- ✅ `saveStrategy: 'onEnd'` 사용 (비용 절감)
- ✅ 에러 핸들링 항상 포함
- ✅ 타임아웃 설정 (5초 권장)

### 5.2 ❌ DON'Ts

#### 흔한 실수 10가지

1. ❌ **sessionId 없이 멀티 상담 구현**
   ```typescript
   // ❌ 나쁜 예
   const chat = useChat(FLOW, userId);
   // 사용자가 여러 상담 불가능
   
   // ✅ 좋은 예
   const chat = useChat(FLOW, userId, 'start', adapter, {
     sessionId: 'auto'
   });
   ```

2. ❌ **saveStrategy: 'always' + 실시간 타이핑**
   ```typescript
   // ❌ 나쁜 예: 타이핑마다 저장
   <input onChange={(e) => submitInput(e.target.value)} />
   
   // ✅ 좋은 예: Enter 키 또는 버튼으로 제출
   <input onKeyDown={(e) => {
     if (e.key === 'Enter') submitInput(e.currentTarget.value);
   }} />
   ```

3. ❌ **Firebase Timestamp 정규화 누락**
   ```typescript
   // ❌ 나쁜 예: 직접 구현
   const customAdapter = { /* 정규화 없음 */ };
   
   // ✅ 좋은 예: 라이브러리 어댑터 사용
   const adapter = createHybridFirebaseAdapter(db);
   ```

4. ❌ **flow 해시 검증 생략**
   - 라이브러리가 자동 처리하므로 신경 쓰지 않아도 됨

5. ❌ **에러 발생 시 fallback 없음**
   ```typescript
   // ❌ 나쁜 예
   const adapter = createHybridFirebaseAdapter(db, {
     fallbackToLocal: false  // 에러 시 크래시
   });
   
   // ✅ 좋은 예
   const adapter = createHybridFirebaseAdapter(db, {
     fallbackToLocal: true
   });
   ```

6. ❌ **모든 상태를 answers에 저장**
   ```typescript
   // ❌ 나쁜 예: UI 상태까지 저장
   const [uiState, setUiState] = useState({});
   // answers에 저장하지 말 것
   
   // ✅ 좋은 예: 챗봇 답변만 저장
   const { answers } = useChat(...);
   ```

7. ❌ **localStorage를 수동으로 직접 조작**
   ```typescript
   // ❌ 나쁜 예
   localStorage.setItem('chat_data', JSON.stringify(data));
   
   // ✅ 좋은 예
   // useChat이 자동으로 처리
   ```

8. ❌ **세션 ID를 userId에 포함**
   ```typescript
   // ❌ 나쁜 예
   const sessionUserId = `${userId}_${Date.now()}`;
   const chat = useChat(FLOW, sessionUserId);
   
   // ✅ 좋은 예
   const chat = useChat(FLOW, userId, 'start', adapter, {
     sessionId: `session_${Date.now()}`
   });
   ```

9. ❌ **isEnd 없이 대화 종료**
   ```typescript
   // ❌ 나쁜 예
   const FLOW = {
     complete: {
       id: 'complete',
       question: '끝'
       // isEnd 없음
     }
   };
   
   // ✅ 좋은 예
   const FLOW = {
     complete: {
       id: 'complete',
       question: '끝',
       isEnd: true  // 명시적으로 표시
     }
   };
   ```

10. ❌ **next 함수에서 비동기 처리**
    ```typescript
    // ❌ 나쁜 예
    next: async (answer) => {
      const result = await api.call();
      return result;
    }
    
    // ✅ 좋은 예
    // 별도 노드에서 처리
    next: 'loading',
    loading: {
      // useEffect에서 비동기 처리
    }
    ```

---

## Part 6: 실전 예제

### 6.1 고객 지원 챗봇

```typescript
const SUPPORT_FLOW = {
  start: {
    id: 'start',
    question: '무엇을 도와드릴까요?',
    type: 'button',
    options: ['주문 문의', '배송 조회', '취소/환불', '기타'],
    next: (answer) => {
      const map = {
        '주문 문의': 'order',
        '배송 조회': 'delivery',
        '취소/환불': 'refund',
        '기타': 'other'
      };
      return map[answer] || 'other';
    }
  },
  
  order: {
    id: 'order',
    question: '주문번호를 입력해주세요',
    type: 'input',
    next: 'order_confirm'
  },
  
  order_confirm: {
    id: 'order_confirm',
    question: (answers) => `주문번호 ${answers.order}를 확인했습니다.`,
    type: 'button',
    options: ['상담원 연결', '완료'],
    next: (answer) => answer === '상담원 연결' ? 'agent' : 'complete'
  },
  
  delivery: {
    id: 'delivery',
    question: '송장번호를 입력하세요',
    type: 'input',
    next: 'delivery_status'
  },
  
  delivery_status: {
    id: 'delivery_status',
    question: '배송 중입니다.',
    isEnd: true
  },
  
  refund: {
    id: 'refund',
    question: '환불 사유를 입력하세요',
    type: 'input',
    next: 'refund_process'
  },
  
  refund_process: {
    id: 'refund_process',
    question: '환불 접수되었습니다. 3-5일 소요됩니다.',
    isEnd: true
  },
  
  other: {
    id: 'other',
    question: '문의 내용을 입력하세요',
    type: 'input',
    next: 'complete'
  },
  
  agent: {
    id: 'agent',
    question: '상담원 연결 중입니다...',
    isEnd: true
  },
  
  complete: {
    id: 'complete',
    question: '감사합니다!',
    isEnd: true
  }
};

function CustomerSupport() {
  const { node, submitAnswer, submitInput, sessionId, reset } = useChat(
    SUPPORT_FLOW,
    customerId,
    'start',
    firebaseAdapter,
    { sessionId: 'auto', saveStrategy: 'onEnd' }
  );
  
  return <ChatUI {...{ node, submitAnswer, submitInput, sessionId, reset }} />;
}
```

### 6.2 설문조사 시스템

```typescript
const SURVEY_FLOW = {
  intro: {
    id: 'intro',
    question: '만족도 조사에 참여해주세요',
    type: 'button',
    options: ['시작'],
    next: 'q1'
  },
  
  q1: {
    id: 'q1',
    question: '서비스 만족도는? (1-5)',
    type: 'button',
    options: ['1', '2', '3', '4', '5'],
    next: 'q2'
  },
  
  q2: {
    id: 'q2',
    question: '재방문 의향은?',
    type: 'button',
    options: ['매우 높음', '높음', '보통', '낮음'],
    next: 'q3'
  },
  
  q3: {
    id: 'q3',
    question: '개선 의견을 남겨주세요',
    type: 'input',
    next: 'complete'
  },
  
  complete: {
    id: 'complete',
    question: '감사합니다!',
    isEnd: true
  }
};
```

### 6.3 의료 상담 앱

```typescript
const MEDICAL_FLOW = {
  start: {
    id: 'start',
    question: '증상을 선택하세요',
    type: 'button',
    options: ['두통', '복통', '발열', '기침'],
    next: 'symptom_detail'
  },
  
  symptom_detail: {
    id: 'symptom_detail',
    question: '언제부터 증상이 있었나요?',
    type: 'button',
    options: ['오늘', '어제', '2-3일 전', '일주일 이상'],
    next: 'severity'
  },
  
  severity: {
    id: 'severity',
    question: '통증 정도는? (1-10)',
    type: 'button',
    options: ['1-3 (경미)', '4-6 (중간)', '7-10 (심각)'],
    next: (answer) => {
      return answer === '7-10 (심각)' ? 'emergency' : 'recommendation';
    }
  },
  
  emergency: {
    id: 'emergency',
    question: '즉시 병원 방문을 권장합니다.',
    type: 'button',
    options: ['119 연결', '완료'],
    next: 'complete'
  },
  
  recommendation: {
    id: 'recommendation',
    question: '약국 방문을 권장합니다.',
    isEnd: true
  },
  
  complete: {
    id: 'complete',
    question: '건강하세요!',
    isEnd: true
  }
};
```

---

## Appendix

### A. 전체 API Reference

[README의 API Reference 참조](../README.md#api-reference)

### B. 트러블슈팅

**Q: "Cannot read property 'question' of undefined"**
- A: Flow에 해당 노드가 없습니다. `next`가 올바른 노드 ID를 반환하는지 확인하세요.

**Q: 세션이 복구되지 않습니다**
- A: `sessionId` 옵션을 확인하세요. `'new'`는 항상 새 세션을 생성합니다.

**Q: Firebase 비용이 너무 높습니다**
- A: `saveStrategy: 'onEnd'`와 하이브리드 어댑터를 사용하세요.

### C. FAQ

**Q: SSR(Next.js)에서 사용 가능한가요?**
- A: 네, 라이브러리가 자동으로 처리합니다. 클라이언트에서만 상태가 복구됩니다.

**Q: Flow를 런타임에 변경할 수 있나요?**
- A: 네, Flow를 props로 전달하면 자동으로 상태가 초기화됩니다.

**Q: 비동기 로직을 어디서 처리해야 하나요?**
- A: `useEffect` 또는 별도 노드에서 처리하세요. `next` 함수는 동기만 지원합니다.

---

**🎉 모든 준비가 끝났습니다! 이제 프로덕션에 배포하세요.**
