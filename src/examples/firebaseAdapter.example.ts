// Firebase Storage Adapter 예제 (프로덕션 레디)
// 이 파일은 사용자 프로젝트에서 참고할 수 있도록 제공되는 예제입니다.
// 실제 사용 시 Firebase SDK를 설치하고 초기화해야 합니다.

import { StorageAdapter, ChatState } from '@nago730/chatbot-library';
// import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
// import { db } from './firebaseConfig'; // 사용자의 Firebase 설정

// ========================================
// 타입 정의 및 유틸리티
// ========================================

/**
 * Firebase에 저장되는 메타데이터 구조
 */
interface FirebaseMetadata {
  currentStep: string;
  flowHash: string;
  updatedAt: number;
  answerCount: number;
  messageCount: number;
  lastSyncedAt?: any; // serverTimestamp() 결과
}

/**
 * Firebase에 저장되는 전체 상태 구조
 */
interface FirebaseFullState extends ChatState {
  lastSyncedAt?: any; // serverTimestamp() 결과
}

/**
 * Adapter 설정 옵션
 */
interface AdapterOptions {
  /**
   * Firebase 호출 타임아웃 (ms)
   * @default 5000
   */
  timeout?: number;

  /**
   * 에러 발생 시 로컬 데이터로 폴백할지 여부
   * @default true
   */
  fallbackToLocal?: boolean;

  /**
   * 디버그 로그 활성화
   * @default false
   */
  debug?: boolean;
}

/**
 * Firebase Timestamp를 number로 변환
 * (Issue #3: 데이터 직렬화/역직렬화 대응)
 */
const normalizeTimestamp = (value: any): number => {
  if (!value) return Date.now();

  // Firebase Timestamp 객체인 경우
  if (typeof value === 'object' && 'toMillis' in value) {
    return value.toMillis();
  }

  // 이미 number인 경우
  if (typeof value === 'number') {
    return value;
  }

  // Date 객체인 경우
  if (value instanceof Date) {
    return value.getTime();
  }

  // 기타 경우 현재 시간 반환
  return Date.now();
};

/**
 * ChatState의 타임스탬프를 정규화
 */
const normalizeChatState = (state: any): ChatState => {
  return {
    ...state,
    updatedAt: normalizeTimestamp(state.updatedAt),
    messages: state.messages?.map((msg: any) => ({
      ...msg,
      timestamp: normalizeTimestamp(msg.timestamp)
    })) || []
  };
};

/**
 * 타임아웃 기능이 있는 Promise 래퍼
 */
const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

// ========================================
// 하이브리드 Firebase Adapter (권장)
// ========================================

/**
 * 하이브리드 Firebase Adapter
 * 
 * 특징:
 * - 로컬스토리지: 모든 대화 내역을 빠르게 저장/불러오기
 * - Firebase: 메타데이터만 저장하여 비용 절감
 * - Guest 모드: 대화 종료 시점에만 서버 전송
 * 
 * 개선사항:
 * ✅ Issue #1: 로컬 데이터가 없을 때 서버에서 전체 데이터 가져오기
 * ✅ Issue #2: 에러 핸들링 및 타임아웃 처리
 * ✅ Issue #3: Firebase Timestamp 정규화
 * ✅ Issue #4: Guest/회원 모드 구분 및 비용 최적화
 */
export const createHybridFirebaseAdapter = (
  db: any,
  options: AdapterOptions = {}
): StorageAdapter => {
  const {
    timeout = 5000,
    fallbackToLocal = true,
    debug = false
  } = options;

  const log = (...args: any[]) => {
    if (debug) console.log('[HybridFirebaseAdapter]', ...args);
  };

  return {
    saveState: async (userId, state) => {
      try {
        // 1. 로컬스토리지에 전체 상태 저장 (이미 useChat에서 수행됨)
        // 이 함수는 주로 서버 저장을 담당

        // 2. Firebase에는 메타데이터만 저장 (비용 절감)
        const metadata: FirebaseMetadata = {
          currentStep: state.currentStep,
          flowHash: state.flowHash,
          updatedAt: state.updatedAt,
          answerCount: Object.keys(state.answers).length,
          messageCount: state.messages.length
        };

        // Firebase 저장 로직 (주석 해제 후 사용)
        /*
        const docRef = doc(db, 'chat_metadata', userId);
        await withTimeout(
          setDoc(docRef, {
            ...metadata,
            lastSyncedAt: serverTimestamp()
          }, { merge: true }),
          timeout,
          'Firebase save timeout'
        );
        */

        log('Saved metadata for user:', userId, metadata);
      } catch (error) {
        // Issue #2: 에러 발생 시에도 로컬 데이터는 유지됨
        console.error('[HybridFirebaseAdapter] Save failed:', error);
        if (!fallbackToLocal) {
          throw error; // 에러를 상위로 전파
        }
        // fallbackToLocal이 true면 조용히 실패 (로컬 데이터는 이미 저장됨)
      }
    },

    loadState: async (userId) => {
      try {
        // Issue #1 해결: 로컬 데이터 먼저 확인
        const storageKey = `_nago_chat_default_${userId}`; // scenarioId는 useChat에서 관리
        const localData = typeof window !== 'undefined'
          ? localStorage.getItem(storageKey)
          : null;
        const localState: ChatState | null = localData ? JSON.parse(localData) : null;

        // Firebase에서 메타데이터 확인
        // Firebase 로드 로직 (주석 해제 후 사용)
        /*
        const docRef = doc(db, 'chat_metadata', userId);
        const docSnap = await withTimeout(
          getDoc(docRef),
          timeout,
          'Firebase load timeout'
        );
        
        if (!docSnap.exists()) {
          log('No server data found for user:', userId);
          return null; // useChat이 로컬 데이터를 사용
        }

        const serverMeta = docSnap.data() as FirebaseMetadata;
        log('Server metadata found:', serverMeta);
        
        // Issue #1: 로컬에 데이터가 없다면 서버에서 전체 데이터 가져오기
        if (!localState) {
          log('No local data, fetching full state from server...');
          const fullDocRef = doc(db, 'chat_full_backup', userId);
          const fullDocSnap = await withTimeout(
            getDoc(fullDocRef),
            timeout,
            'Firebase full state load timeout'
          );
          
          if (fullDocSnap.exists()) {
            const fullState = fullDocSnap.data() as FirebaseFullState;
            // Issue #3: Timestamp 정규화
            const normalized = normalizeChatState(fullState);
            log('Restored full state from server');
            return normalized;
          }
          
          log('No full backup found on server');
          return null;
        }
        
        // 로컬 데이터가 있다면 서버 메타데이터는 검증용으로만 사용
        // (실제 동기화는 useChat의 loadSavedState에서 처리)
        */

        return null; // useChat이 로컬/서버 비교를 처리
      } catch (error) {
        // Issue #2: 에러 발생 시 로컬 데이터로 폴백
        console.error('[HybridFirebaseAdapter] Load failed:', error);
        if (fallbackToLocal) {
          log('Falling back to local data only');
          return null; // useChat이 로컬스토리지를 읽음
        }
        throw error;
      }
    }
  };
};

// ========================================
// 완전한 Firebase 동기화 Adapter (고급)
// ========================================

/**
 * 완전한 Firebase 동기화 Adapter
 * 
 * 모든 데이터를 서버에 저장하고 불러옵니다.
 * 비용이 더 들지만 기기 간 완벽한 동기화가 필요할 때 사용하세요.
 * 
 * 개선사항:
 * ✅ Issue #2: 에러 핸들링 및 타임아웃
 * ✅ Issue #3: Timestamp 정규화
 * ✅ Issue #4: 비용 최적화 가이드 주석 추가
 */
export const createFullFirebaseAdapter = (
  db: any,
  options: AdapterOptions = {}
): StorageAdapter => {
  const {
    timeout = 5000,
    fallbackToLocal = true,
    debug = false
  } = options;

  const log = (...args: any[]) => {
    if (debug) console.log('[FullFirebaseAdapter]', ...args);
  };

  return {
    saveState: async (userId, state) => {
      try {
        // Issue #4: 비용 최적화 팁
        // - Guest 사용자는 useChat에서 isEnd=true일 때만 호출됨
        // - 회원 사용자도 saveStrategy: 'onEnd'를 사용하면 비용 절감 가능

        /*
        const docRef = doc(db, 'chat_sessions', userId);
        await withTimeout(
          setDoc(docRef, {
            ...state,
            lastSyncedAt: serverTimestamp()
          }),
          timeout,
          'Firebase save timeout'
        );
        */

        log('Saved full state for user:', userId);
      } catch (error) {
        console.error('[FullFirebaseAdapter] Save failed:', error);
        if (!fallbackToLocal) {
          throw error;
        }
      }
    },

    loadState: async (userId) => {
      try {
        /*
        const docRef = doc(db, 'chat_sessions', userId);
        const docSnap = await withTimeout(
          getDoc(docRef),
          timeout,
          'Firebase load timeout'
        );
        
        if (!docSnap.exists()) {
          log('No saved state found for user:', userId);
          return null;
        }

        const rawState = docSnap.data() as FirebaseFullState;
        
        // Issue #3: Timestamp 정규화 (중요!)
        const normalizedState = normalizeChatState(rawState);
        
        log('Loaded and normalized state for user:', userId);
        return normalizedState;
        */

        return null;
      } catch (error) {
        console.error('[FullFirebaseAdapter] Load failed:', error);
        if (fallbackToLocal) {
          log('Falling back to local data');
          return null;
        }
        throw error;
      }
    }
  };
};

// ========================================
// 로컬 전용 Adapter (테스트/개발용)
// ========================================

/**
 * 로컬 전용 Adapter
 * 
 * 서버 없이 LocalStorage만 사용하는 간단한 구현입니다.
 * 테스트 및 개발 단계에서 사용하기 좋습니다.
 */
export const localOnlyAdapter: StorageAdapter = {
  saveState: async (userId, state) => {
    // useChat이 이미 로컬에 저장하므로 아무것도 안 함
    console.log('[LocalAdapter] State saved locally for user:', userId);
  },

  loadState: async (userId) => {
    // useChat이 로컬스토리지를 직접 읽으므로 null 반환
    return null;
  }
};

// ========================================
// 사용 예제
// ========================================

/**
 * 사용 예제 1: 하이브리드 어댑터 (권장)
 * 
 * import { initializeApp } from 'firebase/app';
 * import { getFirestore } from 'firebase/firestore';
 * import { createHybridFirebaseAdapter } from '@nago730/chatbot-library/examples';
 * 
 * const app = initializeApp(firebaseConfig);
 * const db = getFirestore(app);
 * 
 * const adapter = createHybridFirebaseAdapter(db, {
 *   timeout: 5000,
 *   fallbackToLocal: true,
 *   debug: process.env.NODE_ENV === 'development'
 * });
 * 
 * // useChat에서 사용
 * const chat = useChat(flow, userId, 'start', adapter, {
 *   saveStrategy: 'onEnd' // 비용 절감을 위해 종료 시에만 저장
 * });
 */

/**
 * 사용 예제 2: 전체 동기화 어댑터
 * 
 * const adapter = createFullFirebaseAdapter(db, {
 *   timeout: 10000, // 전체 데이터는 더 긴 타임아웃
 *   fallbackToLocal: true
 * });
 * 
 * const chat = useChat(flow, userId, 'start', adapter, {
 *   saveStrategy: 'always' // 매번 저장 (완벽한 동기화)
 * });
 */

/**
 * 비용 최적화 전략 가이드:
 * 
 * 1. Guest 사용자 (비로그인)
 *    - 하이브리드 어댑터 사용
 *    - useChat은 자동으로 isEnd=true일 때만 서버에 저장
 *    - 로컬스토리지가 주 저장소, 서버는 백업용
 * 
 * 2. 회원 사용자 (로그인)
 *    - saveStrategy: 'onEnd' 사용 권장
 *    - 중요한 체크포인트(isEnd=true)에서만 서버 저장
 *    - 비용 절감 + 충분한 데이터 보호
 * 
 * 3. 프리미엄/엔터프라이즈
 *    - saveStrategy: 'always' 사용
 *    - 완전한 Firebase 어댑터
 *    - 모든 입력마다 실시간 동기화 (비용 높음)
 */
