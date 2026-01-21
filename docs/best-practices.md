# Best Practices & Anti-Patterns

안정적이고 효율적인 챗봇 구현을 위한 권장 사항과 피해야 할 패턴을 정리했습니다.

---

## ✅ DO's (권장 사항)

### Flow 설계
- **단일 책임 노드**: 각 노드는 하나의 질문과 응답 처리만 담당하세요. 복잡한 로직은 여러 노드로 분리합니다.
- **명확한 종료**: `isEnd: true`와 `next: ''`를 사용하여 대화의 끝을 명시적으로 표시하세요.
- **에러 Fallback**: API 호출 실패 등에 대비한 에러 처리 노드를 준비하세요.

### 세션 관리
- **의미 있는 Session ID**: 디버깅을 위해 랜덤 문자열 대신 `type_userId_timestamp` 형식을 권장합니다.
- **세션 정리**: 오래된 세션 데이터는 `localStorage` 용량 확보를 위해 주기적으로 삭제하세요.
- **사용자 확인**: 진행 중인 대화가 있을 때 `reset()`을 호출하려면 사용자에게 팝업으로 먼저 물어보세요.

### 저장소 및 비용
- **OnEnd 전략**: 대부분의 경우 `saveStrategy: 'onEnd'`로 충분하며 비용을 98% 절감할 수 있습니다.
- **타임아웃 설정**: 네트워크 요청에는 항상 5초 내외의 타임아웃을 설정하여 무한 대기를 방지하세요.
- **에러 핸들링**: `fallbackToLocal: true`를 설정하여 서버 장애 시 로컬 데이터로 자동 전환되게 하세요.

---

## ❌ DON'Ts (피해야 할 패턴)

### 1. Session ID 없이 멀티 상담 구현하려는 시도
```typescript
// ❌ Bad: userId를 변경하여 편법으로 구현
const chat = useChat(flow, userId + '_new');

// ✅ Good: 공식 API 지원 사용
const chat = useChat(flow, userId, 'start', adapter, { 
  sessionId: 'new' 
});
```

### 2. 'always' 저장 전략과 실시간 타이핑의 조합
```typescript
// ❌ Bad: 글자마다 저장되어 타이핑 지연 및 비용 폭탄
<input onChange={(e) => submitInput(e.target.value)} />

// ✅ Good: 엔터 키나 버튼 클릭 시에만 제출
<input onKeyDown={(e) => e.key === 'Enter' && submitInput(e.currentTarget.value)} />
```

### 3. Firebase Timestamp 직접 사용
```typescript
// ❌ Bad: 직렬화 문제 발생 (Cannot read property 'toFixed' of undefined)
state.updatedAt = serverTimestamp(); 

// ✅ Good: 어댑터 내부에서 변환 로직 처리
// 라이브러리가 제공하는 createHybridFirebaseAdapter 사용 시 자동 처리됨
```

### 4. 로컬 스토리지 직접 조작
```typescript
// ❌ Bad: 라이브러리와 상태 불일치 발생 위험
localStorage.setItem('_nago_chat_...', JSON.stringify(data));

// ✅ Good: useChat 훅을 통해서만 상태 변경
submitAnswer(...)
reset(...)
```

### 5. Flow 객체 런타임 변형
```typescript
// ❌ Bad: 렌더링마다 객체가 새로 생성되어 불필요한 리셋 발생
const MyComponent = () => {
  const flow = { ... }; // 매번 새로운 참조
  useChat(flow, ...);
}

// ✅ Good: 컴포넌트 외부 선언 또는 useMemo 사용
const FLOW = { ... };
const MyComponent = () => {
  useChat(FLOW, ...); // 또는 useMemo(() => ({...}), [])
}
```

### 6. 비동기 next 함수
```typescript
// ❌ Bad: next 함수는 동기적으로만 동작해야 함
next: async (ans) => {
  const res = await api.check(ans); // 동작 안 함!
  return res ? 'a' : 'b';
}

// ✅ Good: 'processing' 노드를 거쳐서 useEffect에서 처리
next: 'processing'
// ...
// processing 노드 렌더링 시 API 호출 후 submitAnswer로 자동 진행
```

---

## 🏗️ 아키텍처 패턴

### Presentation / Container 분리
UI(퍼블리싱)와 로직(Chatbot Library)을 분리하여 관리하세요.

```typescript
// Container: 로직 담당
function ChatContainer() {
  const chat = useChat(FLOW, USER_ID);
  return <ChatView {...chat} />;
}

// Presentation: UI 담당 (라이브러리 의존성 없음)
function ChatView({ messages, node, onAnswer }) {
  return (
    <div className="chat-layout">
      <MessageList messages={messages} />
      <InputArea node={node} onSubmit={onAnswer} />
    </div>
  );
}
```
