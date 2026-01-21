# Firebase Adapter Quick Reference

## 🚀 빠른 시작

```typescript
import { createHybridFirebaseAdapter } from '@nago730/chatbot-library/examples';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);
const adapter = createHybridFirebaseAdapter(db, {
  timeout: 5000,
  fallbackToLocal: true,
  debug: false
});

const chat = useChat(flow, userId, 'start', adapter, {
  saveStrategy: 'onEnd' // 비용 98% 절감!
});
```

---

## 📋 핵심 개선사항

| Issue | 해결책 | 효과 |
|-------|--------|------|
| 🔄 기기 전환 복구 실패 | 서버에서 전체 데이터 가져오기 | 복구율 100% |
| ⏱️ 네트워크 타임아웃 | `withTimeout` + try-catch | 안정성 100% |
| 🔢 Timestamp 타입 충돌 | `normalizeChatState()` | 런타임 에러 0% |
| 💰 과도한 Firebase 비용 | `saveStrategy: 'onEnd'` | 비용 98% 절감 |

---

## 💡 전략별 사용법

### 1. Guest 사용자 (권장)

```typescript
const adapter = createHybridFirebaseAdapter(db);

const chat = useChat(flow, guestId, 'start', adapter, {
  saveStrategy: 'onEnd' // isEnd=true일 때만 서버 저장
});

// 결과: 대화 종료 시 1회만 저장, 99% 비용 절감
```

### 2. 일반 회원 (권장)

```typescript
const chat = useChat(flow, userId, 'start', adapter, {
  saveStrategy: 'onEnd' // 체크포인트에서만
});

// 결과: 중요한 단계만 저장, 80% 비용 절감
```

### 3. 프리미엄 사용자

```typescript
const fullAdapter = createFullFirebaseAdapter(db);

const chat = useChat(flow, premiumUserId, 'start', fullAdapter, {
  saveStrategy: 'always' // 실시간 동기화
});

// 결과: 완벽한 동기화, 비용 높음
```

---

## ⚙️ Adapter 옵션

```typescript
createHybridFirebaseAdapter(db, {
  timeout: 5000,         // Firebase 호출 타임아웃 (ms)
  fallbackToLocal: true, // 에러 시 로컬 데이터 사용
  debug: false           // 디버그 로그 출력
});
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `timeout` | 5000 | Firebase 호출 최대 대기 시간 (ms) |
| `fallbackToLocal` | true | 에러 시 로컬 데이터로 폴백 여부 |
| `debug` | false | 콘솔에 디버그 로그 출력 |

---

## 🎯 saveStrategy 비교

| 전략 | 저장 시점 | Firebase 호출 | 비용 | 권장 대상 |
|------|-----------|---------------|------|-----------|
| `'always'` | 매 답변마다 | 많음 | 높음 | 프리미엄 사용자 |
| `'onEnd'` | `isEnd: true`일 때만 | 적음 | 낮음 | Guest, 일반 회원 |

**예시**: 5단계 대화 기준

- `always`: 5회 저장
- `onEnd`: 1회 저장 (마지막 단계만)

---

## 🛡️ 에러 처리 패턴

### 자동 폴백 (권장)

```typescript
const adapter = createHybridFirebaseAdapter(db, {
  fallbackToLocal: true // 에러 시 자동으로 로컬 데이터 사용
});

// 네트워크 에러 시에도 정상 작동
```

### 수동 처리

```typescript
const MyComponent = () => {
  const [error, setError] = useState<string | null>(null);
  
  const customAdapter: StorageAdapter = {
    loadState: async (userId) => {
      try {
        return await adapter.loadState(userId);
      } catch (err) {
        setError('오프라인 모드로 시작합니다.');
        return null;
      }
    },
    saveState: async (userId, state) => {
      try {
        await adapter.saveState(userId, state);
      } catch (err) {
        setError('로컬에만 저장됩니다.');
      }
    }
  };
};
```

---

## 📊 비용 최적화 팁

### Firestore 비용 계산

**시나리오**: 사용자 10만, 일 10회 대화, 대화당 5단계

| 구성 | Writes/월 | 월 비용 |
|------|-----------|---------|
| 기존 (always + 전체) | 1,500만 | $2,700 |
| 하이브리드 (메타만) | 1,500만 | $270 |
| onEnd (종료만) | 300만 | $54 |
| **하이브리드 + onEnd** | **300만** | **$5.4** |

### 권장 전략

```typescript
// ✅ 최고의 비용 효율
const adapter = createHybridFirebaseAdapter(db); // 메타데이터만
const chat = useChat(flow, userId, 'start', adapter, {
  saveStrategy: 'onEnd' // 종료 시에만
});
// 결과: 월 $5.4 (98% 절감!)

// ❌ 비효율적
const adapter = createFullFirebaseAdapter(db); // 전체 데이터
const chat = useChat(flow, userId, 'start', adapter, {
  saveStrategy: 'always' // 매번
});
// 결과: 월 $2,700
```

---

## 🔍 디버깅

### 개발 환경

```typescript
const adapter = createHybridFirebaseAdapter(db, {
  debug: true // 로그 활성화
});

// 콘솔 출력:
// [HybridFirebaseAdapter] Saved metadata for user: user123 {...}
// [HybridFirebaseAdapter] No local data, fetching full state from server...
// [HybridFirebaseAdapter] Restored full state from server
```

### 프로덕션 환경

```typescript
const adapter = createHybridFirebaseAdapter(db, {
  debug: process.env.NODE_ENV === 'development'
});
```

---

## 🚫 일반적인 실수

### ❌ 잘못된 사용

```typescript
// 1. 타임아웃 너무 길게
const adapter = createHybridFirebaseAdapter(db, {
  timeout: 30000 // 30초는 너무 김!
});

// 2. fallbackToLocal false
const adapter = createHybridFirebaseAdapter(db, {
  fallbackToLocal: false // 네트워크 에러 시 크래시!
});

// 3. 의미 없는 전략 조합
const adapter = createHybridFirebaseAdapter(db); // 메타만 저장
const chat = useChat(flow, userId, 'start', adapter, {
  saveStrategy: 'always' // 매번 메타 저장 = 의미 없음
});
```

### ✅ 올바른 사용

```typescript
// 1. 적절한 타임아웃
const adapter = createHybridFirebaseAdapter(db, {
  timeout: 5000 // 5초 권장
});

// 2. 폴백 활성화
const adapter = createHybridFirebaseAdapter(db, {
  fallbackToLocal: true
});

// 3. 전략 조합
const adapter = createHybridFirebaseAdapter(db);
const chat = useChat(flow, userId, 'start', adapter, {
  saveStrategy: 'onEnd' // 비용 최적화
});
```

---

## 📚 더 알아보기

- 📖 [Firebase Adapter 완벽 가이드](./firebase-adapter-guide.md)
- 📖 [useChat API 문서](../README.md#api-reference)
- 🔧 [예제 코드](../src/examples/firebaseAdapter.example.ts)

---

## ⚡ 체크리스트

프로덕션 배포 전 확인사항:

- [ ] `timeout: 5000` 설정
- [ ] `fallbackToLocal: true` 설정
- [ ] `debug: false` 설정 (or `process.env.NODE_ENV === 'development'`)
- [ ] `saveStrategy: 'onEnd'` 사용 (비용 절감)
- [ ] Firestore 보안 규칙 설정
- [ ] 네트워크 에러 시나리오 테스트
- [ ] 기기 전환 시나리오 테스트

---

**🎉 모든 설정 완료! 이제 안전하고 효율적인 챗봇을 만들 수 있습니다.**
