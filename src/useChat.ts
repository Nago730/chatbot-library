import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChatEngine } from './engine';
import { ChatNode, ChatMessage, StorageAdapter } from './types';

export function useChat(
  flow: Record<string, ChatNode>,
  userId: string,
  initialNodeId: string = 'start',
  adapter?: StorageAdapter
) {
  // 매번 엔진을 새로 생성하지 않도록 메모이제이션
  const engine = useMemo(() => new ChatEngine(flow), [flow]);

  const [stepId, setStepId] = useState(initialNodeId);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // flow나 initialNodeId가 변경되면 상태 초기화
  useEffect(() => {
    setStepId(initialNodeId);
    setAnswers({});
    setMessages([]);
  }, [flow, initialNodeId]);

  const submitAnswer = useCallback(async (value: any) => {
    try {
      const currentNode = engine.getCurrentNode(stepId);
      const nextStepId = engine.getNextStep(stepId, value);

      const newAnswers = { ...answers, [currentNode.id]: value };
      setAnswers(newAnswers);
      setStepId(nextStepId);

      // 메시지 히스토리에 기록
      const newMessage: ChatMessage = {
        nodeId: currentNode.id,
        question: currentNode.question,
        answer: value,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newMessage]);

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

  const submitInput = useCallback(async (inputValue: string) => {
    if (!inputValue.trim()) {
      return;
    }

    try {
      const currentNode = engine.getCurrentNode(stepId);
      const nextStepId = engine.getNextStep(stepId, inputValue);

      const newAnswers = { ...answers, [currentNode.id]: inputValue };
      setAnswers(newAnswers);
      setStepId(nextStepId);

      // 메시지 히스토리에 기록
      const newMessage: ChatMessage = {
        nodeId: currentNode.id,
        question: currentNode.question,
        answer: inputValue,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newMessage]);

      // 마지막 노드 도달 시 어댑터 실행
      const nextNode = flow[nextStepId];
      if (nextNode?.isEnd && adapter) {
        await adapter.save(userId, newAnswers);
      }
    } catch (error) {
      throw error;
    }
  }, [stepId, engine, answers, flow, userId, adapter]);

  return {
    node: engine.getCurrentNode(stepId),
    submitAnswer,
    submitInput,
    answers,
    messages,
    isEnd: !!flow[stepId]?.isEnd
  };
}