import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChatEngine } from './engine';
import { ChatNode, ChatMessage, ChatState, ChatOptions, StorageAdapter } from './types';

// 재귀적으로 객체 키를 정렬하여 결정론적 직렬화
const sortObjectKeys = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortObjectKeys);

  const sorted: any = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = sortObjectKeys(obj[key]);
  });
  return sorted;
};

// 콘텐츠 해시 생성 (키 순서에 무관)
const getFlowHash = (flow: any): string => {
  const sortedFlow = sortObjectKeys(flow);
  const str = JSON.stringify(sortedFlow);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
};

// UUID 생성 (crypto API 폴백 포함)
const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Guest 사용자 체크
const isGuest = (userId: string): boolean => {
  return userId.startsWith('guest_') ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
};

export function useChat(
  flow: Record<string, ChatNode>,
  userId: string,
  initialNodeId: string = 'start',
  adapter?: StorageAdapter,
  options?: ChatOptions
) {
  const isBrowser = typeof window !== 'undefined';
  const scenarioId = options?.scenarioId || 'default';
  const flowHash = useMemo(() => getFlowHash(flow), [flow]);

  // Guest ID 처리 (SSR 안전)
  const effectiveUserId = useMemo(() => {
    if (userId) return userId;
    if (!isBrowser) return 'ssr_placeholder';

    let guestId = localStorage.getItem('_nago_chatbot_guest_id');
    if (!guestId) {
      guestId = `guest_${generateUUID()}`;
      localStorage.setItem('_nago_chatbot_guest_id', guestId);
    }
    return guestId;
  }, [userId, isBrowser]);

  // ⭐ 세션 ID 초기화 로직 (Smart Loading)
  const initializeSessionId = useCallback((): string => {
    if (!isBrowser) return 'ssr_placeholder';

    const requestedSessionId = options?.sessionId;
    const lastSessionKey = `_nago_chat_last_session_${scenarioId}_${effectiveUserId}`;

    // 1. 옵션에 'new'가 지정되면 항상 새 세션 생성
    if (requestedSessionId === 'new') {
      const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(lastSessionKey, newId);
      return newId;
    }

    // 2. 특정 세션 ID가 지정되면 해당 세션 사용
    if (requestedSessionId && requestedSessionId !== 'auto') {
      localStorage.setItem(lastSessionKey, requestedSessionId);
      return requestedSessionId;
    }

    // 3. 'auto' 또는 미지정: 마지막 세션 복구 또는 새로 생성
    const lastSessionId = localStorage.getItem(lastSessionKey);
    if (lastSessionId) {
      return lastSessionId;
    }

    // 4. 마지막 세션도 없으면 새로 생성
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(lastSessionKey, newId);
    return newId;
  }, [isBrowser, options?.sessionId, scenarioId, effectiveUserId]);

  // ⭐ 세션 ID 상태 관리
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => initializeSessionId());

  // ⭐ 세션 기반 스토리지 키 생성
  const getStorageKey = useCallback((sessionId: string) => {
    return `_nago_chat_${scenarioId}_${effectiveUserId}_${sessionId}`;
  }, [scenarioId, effectiveUserId]);

  const engine = useMemo(() => new ChatEngine(flow), [flow]);

  // 🔴 CRITICAL: Hydration 안전 - 초기 상태는 항상 동일
  const [stepId, setStepId] = useState(initialNodeId);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // flow나 initialNodeId 변경 시 상태 초기화
  useEffect(() => {
    setStepId(initialNodeId);
    setAnswers({});
    setMessages([]);
    setIsLoaded(false);
  }, [flow, initialNodeId]);

  // 🔴 CRITICAL: 상태 복구는 100% useEffect에서만 (클라이언트 전용)
  useEffect(() => {
    if (!isBrowser || isLoaded) return;

    const loadSavedState = async () => {
      const storageKey = getStorageKey(currentSessionId); // ⭐ 세션 기반 키 사용
      const guestMode = isGuest(effectiveUserId);

      try {
        // 1. 서버 데이터 로드 (Guest가 아닐 때만)
        let serverState: ChatState | null = null;
        if (!guestMode && adapter?.loadState) {
          // ⭐ 어댑터에 세션 ID도 전달 (향후 확장 가능)
          serverState = await adapter.loadState(effectiveUserId);
        }

        // 2. 로컬 데이터 로드 (세션별)
        const localData = localStorage.getItem(storageKey);
        const localState: ChatState | null = localData ? JSON.parse(localData) : null;

        // 3. 시나리오 해시 검증 (서버/로컬 모두 체크)
        const activeState = serverState || localState;
        if (activeState && activeState.flowHash !== flowHash) {
          console.log('[useChat] Scenario updated. Clearing old state.');
          localStorage.removeItem(storageKey);
          setIsLoaded(true);
          return;
        }

        // 4. 서버 vs 로컬 우선순위 결정 (최신 데이터 선택)
        let targetState: ChatState | null = null;
        if (serverState && localState) {
          targetState = serverState.updatedAt >= localState.updatedAt ? serverState : localState;
        } else {
          targetState = serverState || localState;
        }

        // 5. 상태 복구
        if (targetState) {
          setStepId(targetState.currentStep);
          setAnswers(targetState.answers);
          setMessages(targetState.messages);
        }
      } catch (error) {
        console.error('[useChat] Failed to load saved state:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadSavedState();
  }, [isBrowser, effectiveUserId, flowHash, scenarioId, adapter, isLoaded, currentSessionId, getStorageKey]);

  // 저장 로직 헬퍼
  const saveIfNeeded = useCallback(async (
    nextStepId: string,
    newAnswers: Record<string, any>,
    newMessages: ChatMessage[]
  ) => {
    if (!isBrowser) return;

    const saveStrategy = options?.saveStrategy || 'always';
    const nextNode = flow[nextStepId];
    const guestMode = isGuest(effectiveUserId);

    // saveStrategy에 따라 저장 여부 결정
    const shouldSave = saveStrategy === 'always' || (saveStrategy === 'onEnd' && nextNode?.isEnd);
    if (!shouldSave) return;

    const state: ChatState = {
      answers: newAnswers,
      currentStep: nextStepId,
      messages: newMessages,
      flowHash,
      updatedAt: Date.now()
    };

    // 로컬 저장 (세션별 키 사용)
    const storageKey = getStorageKey(currentSessionId); // ⭐ 세션 기반 키
    localStorage.setItem(storageKey, JSON.stringify(state));

    // 서버 저장 조건: 
    // - Guest가 아니면 항상 저장
    // - Guest이면 대화 종료 시점(isEnd)에만 저장
    const shouldSaveToServer = !guestMode || nextNode?.isEnd;

    if (shouldSaveToServer && adapter?.saveState) {
      try {
        await adapter.saveState(effectiveUserId, state);
      } catch (error) {
        console.error('[useChat] Failed to save to server:', error);
      }
    }
  }, [isBrowser, adapter, options, flow, flowHash, effectiveUserId, currentSessionId, getStorageKey]);

  const submitAnswer = useCallback(async (value: any) => {
    try {
      const currentNode = engine.getCurrentNode(stepId);
      const nextStepId = engine.getNextStep(stepId, value);

      const newAnswers = { ...answers, [currentNode.id]: value };

      // 메시지 히스토리에 기록
      const newMessage: ChatMessage = {
        nodeId: currentNode.id,
        question: currentNode.question,
        answer: value,
        timestamp: Date.now()
      };
      const newMessages = [...messages, newMessage];

      setAnswers(newAnswers);
      setStepId(nextStepId);
      setMessages(newMessages);

      // 저장 로직 (전략에 따라 실행)
      await saveIfNeeded(nextStepId, newAnswers, newMessages);
    } catch (error) {
      // 라이브러리 사용자가 에러를 처리할 수 있도록 다시 던지거나, 
      // 필요에 따라 상태에 에러를 저장할 수 있습니다.
      throw error;
    }
  }, [stepId, engine, answers, messages, saveIfNeeded]);

  const submitInput = useCallback(async (inputValue: string) => {
    if (!inputValue.trim()) {
      return;
    }

    try {
      const currentNode = engine.getCurrentNode(stepId);
      const nextStepId = engine.getNextStep(stepId, inputValue);

      const newAnswers = { ...answers, [currentNode.id]: inputValue };

      // 메시지 히스토리에 기록
      const newMessage: ChatMessage = {
        nodeId: currentNode.id,
        question: currentNode.question,
        answer: inputValue,
        timestamp: Date.now()
      };
      const newMessages = [...messages, newMessage];

      setAnswers(newAnswers);
      setStepId(nextStepId);
      setMessages(newMessages);

      // 저장 로직 (전략에 따라 실행)
      await saveIfNeeded(nextStepId, newAnswers, newMessages);
    } catch (error) {
      throw error;
    }
  }, [stepId, engine, answers, messages, saveIfNeeded]);

  // ⭐ 세션 리셋 함수 (새 상담 시작 또는 특정 세션 불러오기)
  const reset = useCallback((newSessionId?: string) => {
    if (!isBrowser) return;

    // 1. 새 세션 ID 결정
    const targetSessionId = newSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 2. 마지막 세션 업데이트
    const lastSessionKey = `_nago_chat_last_session_${scenarioId}_${effectiveUserId}`;
    localStorage.setItem(lastSessionKey, targetSessionId);

    // 3. 세션 ID 변경
    setCurrentSessionId(targetSessionId);

    // 4. 특정 세션을 불러오는 경우
    if (newSessionId) {
      const storageKey = getStorageKey(targetSessionId);
      const sessionData = localStorage.getItem(storageKey);

      if (sessionData) {
        try {
          const savedState: ChatState = JSON.parse(sessionData);

          // 시나리오 해시 검증
          if (savedState.flowHash === flowHash) {
            setStepId(savedState.currentStep);
            setAnswers(savedState.answers);
            setMessages(savedState.messages);
            console.log('[useChat] Session restored:', targetSessionId);
            return;
          } else {
            console.log('[useChat] Session flowHash mismatch. Starting fresh.');
          }
        } catch (error) {
          console.error('[useChat] Failed to restore session:', error);
        }
      }
    }

    // 5. 새 세션 또는 복구 실패 시 초기화
    setStepId(initialNodeId);
    setAnswers({});
    setMessages([]);
    console.log('[useChat] New session started:', targetSessionId);
  }, [isBrowser, scenarioId, effectiveUserId, flowHash, initialNodeId, getStorageKey]);

  return {
    node: engine.getCurrentNode(stepId),
    submitAnswer,
    submitInput,
    answers,
    messages,
    isEnd: !!flow[stepId]?.isEnd,
    sessionId: currentSessionId, // ⭐ 현재 세션 ID
    reset                        // ⭐ 세션 리셋 함수
  };
}