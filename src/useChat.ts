import { useState, useCallback, useMemo } from 'react';
import { ChatEngine } from './engine';
import { ChatNode, StorageAdapter } from './types';

export function useChat(flow: Record<string, ChatNode>, userId: string, adapter?: StorageAdapter) {
  // 매번 엔진을 새로 생성하지 않도록 메모이제이션
  const engine = useMemo(() => new ChatEngine(flow), [flow]);
  
  const [stepId, setStepId] = useState('start');
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const submitAnswer = useCallback(async (value: any) => {
    try {
      const currentNode = engine.getCurrentNode(stepId);
      const nextStepId = engine.getNextStep(stepId, value);
      
      const newAnswers = { ...answers, [currentNode.id]: value };
      setAnswers(newAnswers);
      setStepId(nextStepId);

      // 마지막 노드 도달 시 어댑터 실행
      const nextNode = flow[nextStepId];
      if (nextNode?.isEnd && adapter) {
        await adapter.save(userId, newAnswers);
      }
    } catch (error) {
      // 라이브러리 사용자가 에러를 처리할 수 있도록 다시 던지거나, 
      // 필요에 따라 상태에 에러를 저장할 수 있습니다.
      throw error;
    }
  }, [stepId, engine, answers, flow, userId, adapter]);

  return {
    node: engine.getCurrentNode(stepId),
    submitAnswer,
    answers,
    isEnd: !!flow[stepId]?.isEnd
  };
}