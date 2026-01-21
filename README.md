### 실제 사용 예시: `App.tsx`

이 코드는 당신이 만든 라이브러리를 `npm install` 했다고 가정하고 작성되었습니다.

```tsx
import React from 'react';
// 1. 당신이 만든 라이브러리에서 필요한 부품들을 가져옵니다.
import { useChat, ChatNode } from '@your-id/chatbot-library'; 

// 2. 청소업체 전용 대화 시나리오(Flow) 정의
const CLEANING_FLOW: Record<string, ChatNode> = {
  start: {
    id: "serviceType",
    question: "안녕하세요! 어떤 청소 서비스가 필요하신가요?",
    type: "button",
    options: ["이사청소", "거주청소", "사무실청소"],
    next: (val) => (val === "거주청소" ? "isVacant" : "spaceSize"),
  },
  isVacant: {
    id: "isVacant",
    question: "현재 짐이 있는 상태인가요?",
    type: "button",
    options: ["네, 비어있어요", "아니오, 짐이 있어요"],
    next: "spaceSize",
  },
  spaceSize: {
    id: "spaceSize",
    question: "공간의 평수는 어떻게 되나요? (숫자만 입력)",
    type: "input",
    next: "complete",
  },
  complete: {
    id: "complete",
    question: "모든 정보가 수집되었습니다. 곧 상담원이 연락드릴게요!",
    isEnd: true,
    next: ""
  },
};

export default function App() {
  // 3. 라이브러리의 useChat 훅 사용
  const { node, submitAnswer, submitInput, answers, isEnd } = useChat(CLEANING_FLOW, "customer_001");

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2>🧹 청소 견적 도우미</h2>
        <hr />

        {/* 질문 영역 */}
        <div style={{ margin: '20px 0', minHeight: '100px' }}>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
            {node.question}
          </p>

          {/* 선택지 버튼 (이사청소, 거주청소 등) */}
          {!isEnd && (node.type === 'button' || !node.type) && node.options && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {node.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => submitAnswer(opt)}
                  style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', border: '1px solid #007bff', background: 'white', color: '#007bff' }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* 주관식 입력창 (평수 입력 등) - type: 'input' 대응 */}
          {!isEnd && node.type === 'input' && (
            <input
              type="text"
              placeholder="답변을 입력하고 Enter를 누르세요"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitInput((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = ""; // 입력창 비우기
                }
              }}
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '8px', border: '1px solid #ccc' }}
            />
          )}
        </div>

        {/* 4. 실시간 데이터 요약 영역 (사용자에게 현재까지 입력한 정보를 보여줌) */}
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
          <h4 style={{ marginTop: 0 }}>📋 현재까지 수집된 정보</h4>
          <ul style={{ fontSize: '14px', color: '#666' }}>
            <li>서비스 종류: {answers.serviceType || '-'}</li>
            {answers.isVacant && <li>공실 여부: {answers.isVacant}</li>}
            <li>평수: {answers.spaceSize ? `${answers.spaceSize}평` : '-'}</li>
          </ul>
        </div>

        {isEnd && (
          <div style={{ textAlign: 'center', color: 'green', fontWeight: 'bold', marginTop: '20px' }}>
            ✅ 신청이 완료되었습니다!
          </div>
        )}
      </div>
    </div>
  );
}

```

---

### 💡 이 `App.tsx` 코드가 특별한 이유

1. **실시간 요약:** 하단에 `answers` 객체를 이용해 사용자가 입력한 내용을 바로 보여줍니다. 이는 고객에게 신뢰감을 줍니다.
2. **동적 질문 처리:** `CLEANING_FLOW`를 보시면 `serviceType`이 무엇이냐에 따라 `isVacant` 질문을 건너뛰거나 포함하는 로직이 적용되어 있습니다.
3. **UI와 로직의 분리:** 질문 내용이나 순서를 바꾸고 싶을 때, UI 코드를 건드릴 필요 없이 `CLEANING_FLOW` 객체의 내용만 수정하면 됩니다.
