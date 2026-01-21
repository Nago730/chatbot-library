# 실전 예제 모음 (Examples)

바로 복사해서 사용할 수 있는 실전 시나리오 예제들입니다.

---

## 1. 고객 지원 챗봇 (Customer Support)

다단계 메뉴 선택과 폼 입력이 혼합된 전형적인 CS 봇입니다.

```typescript
const SUPPORT_FLOW = {
  start: {
    id: 'start',
    question: '안녕하세요! 무엇을 도와드릴까요?',
    type: 'button',
    options: ['주문/결제', '배송조회', '취소/환불', '상담원 연결'],
    next: (ans) => {
      if (ans === '주문/결제') return 'order_menu';
      if (ans === '배송조회') return 'tracking';
      if (ans === '취소/환불') return 'refund';
      return 'agent_connect';
    }
  },
  order_menu: {
    id: 'order_menu',
    question: '어떤 점이 궁금하신가요?',
    type: 'button',
    options: ['결제수단 변경', '영수증 발급', '주문내역 확인'],
    next: 'guide_view'
  },
  tracking: {
    id: 'tracking',
    question: '운송장 번호를 입력해주세요. (숫자만)',
    type: 'input',
    next: 'tracking_result'
  },
  tracking_result: {
    id: 'tracking_result',
    question: (answers) => `운송장번호 ${answers.tracking} 조회 결과: 배송 중입니다.`,
    isEnd: true
  },
  refund: {
    id: 'refund',
    question: '환불 사유를 선택해주세요.',
    type: 'button',
    options: ['단순변심', '상품불량', '배송지연'],
    next: 'refund_confirm'
  },
  refund_confirm: {
    id: 'refund_confirm',
    question: '환불 접수가 완료되었습니다. 3일 이내 처리됩니다.',
    isEnd: true
  },
  agent_connect: {
    id: 'agent_connect',
    question: '상담원 연결을 대기합니다. 잠시만 기다려주세요...',
    isEnd: true
  },
  guide_view: { // 공통 안내 노드
    id: 'guide_view',
    question: '해당 메뉴얼을 보여드립니다. 추가 문의가 있으신가요?',
    type: 'button',
    options: ['처음으로', '종료'],
    next: (ans) => ans === '처음으로' ? 'start' : 'end_bye'
  },
  end_bye: {
    id: 'end_bye',
    question: '이용해주셔서 감사합니다.',
    isEnd: true
  }
};
```

---

## 2. 설문조사 (Survey)

점수 입력과 로직 분기가 포함된 설문조사입니다.

```typescript
const SURVEY_FLOW = {
  intro: {
    id: 'intro',
    question: '서비스 만족도 조사를 시작합니다. (소요시간: 1분)',
    type: 'button',
    options: ['시작하기'],
    next: 'score'
  },
  score: {
    id: 'score',
    question: '전반적인 서비스 만족도를 1~5점으로 평가해주세요.',
    type: 'button',
    options: ['1', '2', '3', '4', '5'],
    next: (ans) => parseInt(ans) <= 2 ? 'reason_bad' : 'reason_good'
  },
  reason_bad: {
    id: 'reason_bad',
    question: '죄송합니다. 어떤 점이 불편하셨나요?',
    type: 'input',
    next: 'contact_agree'
  },
  reason_good: {
    id: 'reason_good',
    question: '감사합니다! 가장 좋았던 점은 무엇인가요?',
    type: 'input',
    next: 'final'
  },
  contact_agree: {
    id: 'contact_agree',
    question: '개선 후 안내를 받으시겠습니까?',
    type: 'button',
    options: ['네', '아니오'],
    next: 'final'
  },
  final: {
    id: 'final',
    question: '소중한 의견 감사합니다.',
    isEnd: true
  }
};
```

---

## 3. MBTI 성격 유형 검사 (Quiz Style)

점수를 누적 계산하여 결과를 도출하는 방식입니다.

> **Tip**: 복잡한 점수 계산 로직은 `next` 함수나 별도의 결과 계산 함수에서 처리합니다.

```typescript
const MBTI_FLOW = {
  start: {
    id: 'start',
    question: '간단한 성격 테스트를 시작합니다.',
    type: 'button',
    options: ['Start'],
    next: 'q1'
  },
  q1: { // E vs I
    id: 'q1',
    question: '주말에 쉬는 방식은?',
    type: 'button',
    options: ['친구들과 파티', '집에서 혼자 넷플릭스'],
    next: 'q2'
  },
  q2: { // N vs S
    id: 'q2',
    question: '멍 때릴 때 하는 생각은?',
    type: 'button',
    options: ['좀비 아포칼립스 망상', '저녁 뭐 먹지 현실 고민'],
    next: 'q3'
  },
  q3: { // F vs T
    id: 'q3',
    question: '친구가 우울하다고 하면?',
    type: 'button',
    options: ['무슨 일이야? ㅠㅠ (공감)', '왜 우울해? (원인분석)'],
    next: 'result_calc'
  },
  result_calc: {
    id: 'result_calc',
    question: '결과 분석 중...',
    // 실제로는 여기서 useEffect 등으로 잠시 대기 후 결과 페이지로 이동하거나,
    // 바로 결과를 보여줄 수 있습니다.
    next: (ans, allAnswers) => {
      // 답변을 기반으로 결과 계산
      const isE = allAnswers.q1 === '친구들과 파티';
      const isN = allAnswers.q2 === '좀비 아포칼립스 망상';
      const isF = allAnswers.q3.includes('공감');
      
      const type = `${isE ? 'E' : 'I'}${isN ? 'N' : 'S'}${isF ? 'F' : 'T'}P`; // P는 고정 예시
      return `result_${type}`;
    }
  },
  // 결과 노드들...
  result_ENFP: { id: 'result_ENFP', question: '당신은 재기발랄한 활동가 ENFP!', isEnd: true },
  result_ISTP: { id: 'result_ISTP', question: '당신은 만능 재주꾼 ISTP!', isEnd: true },
  // ... (기타 유형 생략, fallback)
  result_default: { id: 'result_default', question: '당신은 알 수 없는 신비로운 유형!', isEnd: true }
};
```
