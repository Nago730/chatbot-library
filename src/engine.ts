import { ChatNode } from './types';

export class ChatEngine {
  constructor(private flow: Record<string, ChatNode>) {}

  getCurrentNode(stepId: string): ChatNode {
    const node = this.flow[stepId];
    if (!node) {
      throw new Error(`ChatEngineError: Node with id "${stepId}" not found in flow.`);
    }
    return node;
  }

  getNextStep(currentStepId: string, answer: any): string {
    const node = this.flow[currentStepId];
    if (!node) {
      throw new Error(`ChatEngineError: Cannot calculate next step from missing node "${currentStepId}".`);
    }

    if (typeof node.next === 'function') {
      return node.next(answer);
    }
    return node.next;
  }
}