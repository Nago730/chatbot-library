# Quick Reference (Cheat Sheet)

## 📌 기본 설정

```bash
npm install @nago730/chatbot-library
```

```typescript
import { useChat } from '@nago730/chatbot-library';

const chat = useChat(FLOW, userId, 'start', adapter, {
  saveStrategy: 'onEnd',
  sessionId: 'auto'
});
```

---

## 🔄 멀티 세션 관리

| 옵션 | 설명 | 예시 |
|------|------|------|
| `auto` | 마지막 세션 복구 or 신규 | `sessionId: 'auto'` |
| `new` | 항상 신규 세션 | `sessionId: 'new'` |
| `string` | 특정 세션 복구 | `sessionId: 'session_123'` |

```typescript
const { reset, sessionId } = useChat(...);

// 새 상담 시작
reset();

// 특정 상담 로드
reset('session_123');
```

---

## 🔥 Firebase Adapter

```typescript
import { createHybridFirebaseAdapter } from '@nago730/chatbot-library/examples';

const adapter = createHybridFirebaseAdapter(db, {
  timeout: 5000,
  fallbackToLocal: true
});
```

### 비용 최적화 전략

| 전략 | 저장 시점 | 월 비용 (10만명) |
|------|-----------|------------------|
| `'always'` | 매 답변 | $2,700 ❌ |
| `'onEnd'` | 종료 시 | **$5.4** ✅ |

---

## 🏗️ Flow 구조 (JSON)

```typescript
const FLOW = {
  [nodeId]: {
    id: string,
    question: string | (answers) => string,
    type: 'button' | 'input',
    options: string[],
    next: string | (answer) => string,
    isEnd: boolean
  }
}
```

---

## ✅ Best Practices 체크리스트

- [ ] `saveStrategy: 'onEnd'` 설정했는가?
- [ ] `fallbackToLocal: true` 설정했는가?
- [ ] `isEnd: true` 노드가 명확한가?
- [ ] `sessionId`를 적절히 관리하는가?
- [ ] 에러 발생 시 Fallback 노드가 있는가?

---

## 📚 문서 링크

- [Complete Guide](./complete-guide.md)
- [Best Practices](./best-practices.md)
- [Examples](./examples.md)
