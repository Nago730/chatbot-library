// Firebase Hybrid Storage Adapter 예제
// 이 파일은 사용자 프로젝트에서 참고할 수 있도록 제공되는 예제입니다.
// 실제 사용 시 Firebase SDK를 설치하고 초기화해야 합니다.

import { StorageAdapter, ChatState } from '@nago730/chatbot-library';
// import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
// import { db } from './firebaseConfig'; // 사용자의 Firebase 설정

/**
 * 하이브리드 Firebase Adapter
 * 
 * 특징:
 * - 로컬스토리지: 모든 대화 내역을 빠르게 저장/불러오기
 * - Firebase: 메타데이터와 버전 정보만 저장하여 비용 절감
 * - Guest 모드: 대화 종료 시점에만 서버 전송
 */
export const createHybridFirebaseAdapter = (db: any): StorageAdapter => ({
  saveState: async (userId, state) => {
    // 1. 로컬스토리지에 전체 상태 저장 (이미 useChat에서 수행됨)
    // 이 함수는 주로 서버 저장을 담당

    // 2. Firebase에는 메타데이터만 저장 (비용 절감)
    const metadata = {
      currentStep: state.currentStep,
      flowHash: state.flowHash,
      updatedAt: state.updatedAt,
      answerCount: Object.keys(state.answers).length,
      messageCount: state.messages.length
    };

    // Firebase 저장 로직 (주석 해제 후 사용)
    /*
    const docRef = doc(db, 'chat_metadata', userId);
    await setDoc(docRef, {
      ...metadata,
      lastSyncedAt: serverTimestamp()
    }, { merge: true });
    */

    console.log('[FirebaseAdapter] Saved metadata for user:', userId, metadata);
  },

  loadState: async (userId) => {
    // 1. 로컬스토리지에서 먼저 시도 (빠름)
    // (useChat에서 이미 처리하므로 여기서는 서버만 체크)

    // 2. Firebase에서 메타데이터 확인
    // Firebase 로드 로직 (주석 해제 후 사용)
    /*
    const docRef = doc(db, 'chat_metadata', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    const serverMeta = docSnap.data();
    
    // 서버에는 메타데이터만 있으므로, 실제 데이터는 로컬에서 가져와야 함
    // 여기서는 검증용으로만 사용
    return null; // useChat이 로컬 데이터를 사용하도록
    */

    return null; // 기본 구현은 로컬 전용
  }
});

/**
 * 완전한 Firebase 동기화 Adapter (고급)
 * 
 * 모든 데이터를 서버에 저장하고 불러옵니다.
 * 비용이 더 들지만 기기 간 완벽한 동기화가 필요할 때 사용하세요.
 */
export const createFullFirebaseAdapter = (db: any): StorageAdapter => ({
  saveState: async (userId, state) => {
    /*
    const docRef = doc(db, 'chat_sessions', userId);
    await setDoc(docRef, {
      ...state,
      updatedAt: serverTimestamp()
    });
    */
    console.log('[FullFirebaseAdapter] Saved full state for user:', userId);
  },

  loadState: async (userId) => {
    /*
    const docRef = doc(db, 'chat_sessions', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return docSnap.data() as ChatState;
    */
    return null;
  }
});

/**
 * 로컬 전용 Adapter (테스트/개발용)
 * 
 * 서버 없이 LocalStorage만 사용하는 간단한 구현입니다.
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
