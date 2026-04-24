import { useState, useEffect, useCallback, useRef } from "react";

async function saveTestResult(entry) {
  try {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveTestResult", entry })
    });
  } catch (e) { console.error(e); }
}

function renderWithRuby(text) {
  if (!text || typeof text !== "string") return text;
  // {漢字|ふりがな} 形式をrubyタグに変換
  const parts = text.split(/(\{[^}]+\|[^}]+\})/);
  return parts.map((part, i) => {
    const match = part.match(/\{([^|]+)\|([^}]+)\}/);
    if (match) return <ruby key={i}>{match[1]}<rt>{match[2]}</rt></ruby>;
    return part;
  });
}

export default function QuizEngine({ questions, studentName, grade, subject, onClose, onRetry }) {
  const timeLimit = ["言葉集め", "理科", "社会"].includes(subject) ? 10 : 5;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [answers, setAnswers] = useState([]);
  const [phase, setPhase] = useState("quiz");

  useEffect(() => {
    if (phase !== "quiz") return;
    if (selected !== null) return;
    setTimeLeft(timeLimit);
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); handleAnswer(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [current, phase, selected]);

  const handleAnswer = useCallback((choice) => {
    if (selected !== null) return;
    const q = questions[current];
    const isCorrect = choice === q.correct;
    setSelected(choice || "タイムアウト");
    if (isCorrect) setScore(s => s + 1);
    const newAnswers = [...answers, { question: q.question, correct: q.correct, selected: choice, isCorrect }];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setPhase("result");
        const finalScore = newAnswers.filter(a => a.isCorrect).length;
        saveTestResult({
          id: Date.now(),
          studentName,
          grade,
          subject,
          score: finalScore,
          total: questions.length,
          time: new Date().toLocaleString("ja-JP"),
        });
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1000);
  }, [selected, questions, current, answers, studentName, grade, subject]);

  if (phase === "quiz") {
    const q = questions[current];
    return (
      <div style={{ minHeight: "100vh", background: "#FFF5F5", display: "flex", flexDirection: "column", alignItems: "center", padding: 24, paddingTop: 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#aaa", fontWeight: "700" }}>{current + 1} / {questions.length}</div>
            <div style={{ fontSize: 28, fontWeight: "900", color: timeLeft <= 2 ? "#EF4444" : "#FF6B6B" }}>{timeLeft}</div>
          </div>
          <div style={{ width: "100%", background: "#FFE4E4", borderRadius: 8, height: 8, marginBottom: 32 }}>
            <div style={{ width: `${(current / questions.length) * 100}%`, background: "#FF6B6B", height: 8, borderRadius: 8, transition: "width 0.3s" }} />
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 24, textAlign: "center", boxShadow: "0 2px 12px rgba(255,107,107,0.1)" }}>
            <div style={{ fontSize: 20, fontWeight: "900", color: "#333" }}>{renderWithRuby(q.question)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {q.choices.map((choice, i) => {
              let bg = "#fff", border = "2.5px solid #FFE4E4", color = "#333";
              if (selected !== null) {
                if (choice === q.correct) { bg = "#D1FAE5"; border = "2.5px solid #10B981"; color = "#065F46"; }
                else if (choice === selected) { bg = "#FEE2E2"; border = "2.5px solid #EF4444"; color = "#991B1B"; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(choice)} disabled={selected !== null}
                  style={{ padding: "16px 12px", fontSize: 14, fontWeight: "700", borderRadius: 14, border, background: bg, color, cursor: selected ? "default" : "pointer", transition: "all 0.2s" }}>
                  {renderWithRuby(choice)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const wrongAnswers = answers.filter(a => !a.isCorrect);
    const finalScore = answers.filter(a => a.isCorrect).length;
    return <ResultWithChat
      wrongAnswers={wrongAnswers}
      finalScore={finalScore}
      total={questions.length}
      questions={questions}
      answers={answers}
      subject={subject}
      grade={grade}
      onRetry={onRetry}
      onClose={onClose}
    />;
  }

  return null;
}

function ResultWithChat({ wrongAnswers, finalScore, total, questions, answers, subject, grade, onRetry, onClose }) {
  const [explanations, setExplanations] = useState({});
  const [loadingIdx, setLoadingIdx] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const getExplanation = async (a, i) => {
    setLoadingIdx(i);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `あなたは「勉強犬」という名前の元気でやさしい犬の家庭教師です。語尾に「わん」「だよ」など犬らしさを自然に混ぜてください。${grade}の生徒に分かりやすく説明してください。`,
          messages: [{
            role: "user",
            content: `${subject}のテストでこの問題を間違えました。分かりやすく解説してください。
問題：${a.question}
正解：${a.correct}
私の答え：${a.selected || "タイムアウト"}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setExplanations(prev => ({ ...prev, [i]: text }));
    } catch (e) {
      setExplanations(prev => ({ ...prev, [i]: "解説の取得に失敗しました🐾" }));
    }
    setLoadingIdx(null);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user", content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `あなたは「勉強犬」という名前の元気でやさしい犬の家庭教師です。語尾に「わん」「だよ」など犬らしさを自然に混ぜてください。${grade}の${subject}のテスト結果について質問を受けています。`,
          messages: newMessages
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      setChatMessages([...newMessages, { role: "assistant", content: text }]);
    } catch (e) {
      setChatMessages([...newMessages, { role: "assistant", content: "エラーが出たよ。もう一度試してね🐾" }]);
    }
    setChatLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFF5F5", display: "flex", flexDirection: "column", alignItems: "center", padding: 24, paddingTop: 48 }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ fontSize: 64, marginBottom: 8, textAlign: "center" }}>{finalScore >= 8 ? "🏆" : finalScore >= 5 ? "🐶" : "😢"}</div>
        <div style={{ fontSize: 24, fontWeight: "900", color: "#FF6B6B", marginBottom: 4, textAlign: "center" }}>結果発表！</div>
        <div style={{ fontSize: 48, fontWeight: "900", color: "#333", marginBottom: 4, textAlign: "center" }}>{finalScore} <span style={{ fontSize: 20, color: "#aaa" }}>/ {total}</span></div>
        <div style={{ fontSize: 15, color: "#888", marginBottom: 24, textAlign: "center" }}>
          {finalScore >= 8 ? "すごい！完璧に近いわん！🎉" : finalScore >= 5 ? "なかなかやるわん！もう少し！🐾" : "もう一度チャレンジしてみてわん！💪"}
        </div>

        {wrongAnswers.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 15, fontWeight: "900", color: "#EF4444", marginBottom: 12 }}>❌ 間違えた問題</div>
            {wrongAnswers.map((a, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "2px solid #FFE4E4" }}>
                <div style={{ fontSize: 14, fontWeight: "800", color: "#333", marginBottom: 8 }}>Q. {a.question}</div>
                <div style={{ fontSize: 13, color: "#EF4444", marginBottom: 4 }}>あなたの答え：{a.selected || "タイムアウト"}</div>
                <div style={{ fontSize: 13, color: "#10B981", fontWeight: "700", marginBottom: 12 }}>正解：{a.correct}</div>
                {!explanations[i] && (
                  <button onClick={() => getExplanation(a, i)} disabled={loadingIdx === i}
                    style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: "800", background: "#FFF5F5", color: "#FF6B6B", border: "2px solid #FFE4E4", borderRadius: 10, cursor: "pointer" }}>
                    {loadingIdx === i ? "解説を取得中..." : "🐶 解説してもらう"}
                  </button>
                )}
                {explanations[i] && (
                  <div style={{ background: "#FFF5F5", borderRadius: 10, padding: 12, border: "2px solid #FFE4E4", marginTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: "800", color: "#FF6B6B", marginBottom: 6 }}>🐶 勉強犬の解説</div>
                    {explanations[i].split("
").map((l, j) => <p key={j} style={{ margin: "2px 0", fontSize: 13, color: "#444" }}>{l}</p>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 自由質問チャット */}
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "2px solid #FFE4E4", marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: "900", color: "#FF6B6B", marginBottom: 12 }}>💬 勉強犬に質問する</div>
          {chatMessages.length > 0 && (
            <div style={{ marginBottom: 12, maxHeight: 300, overflowY: "auto" }}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "80%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: m.role === "user" ? "#FF6B6B" : "#FFF5F5", color: m.role === "user" ? "#fff" : "#333", fontSize: 13, border: m.role === "assistant" ? "2px solid #FFE4E4" : "none" }}>
                    {m.content.split("
").map((l, j) => <p key={j} style={{ margin: "2px 0" }}>{l}</p>)}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "10px 14px", borderRadius: "16px 16px 16px 4px", background: "#FFF5F5", border: "2px solid #FFE4E4", fontSize: 13, color: "#aaa" }}>考え中...🐶</div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              placeholder="質問を入力してね🐾"
              style={{ flex: 1, padding: "10px 12px", fontSize: 13, border: "2px solid #FFE4E4", borderRadius: 12, fontFamily: "inherit", outline: "none" }} />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
              style={{ padding: "10px 16px", background: "#FF6B6B", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: "800", fontSize: 13 }}>
              送信
            </button>
          </div>
        </div>

        {wrongAnswers.length > 0 && (
          <button onClick={() => onRetry(questions.filter((_, i) => !answers[i]?.isCorrect))}
            style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: "900", background: "#EF4444", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", marginBottom: 12 }}>
            🔁 間違えた問題だけ再テスト（{wrongAnswers.length}問）
          </button>
        )}
        <button onClick={onClose}
          style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: "900", background: "#FF6B6B", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", marginBottom: 12 }}>
          🔄 最初からやり直す
        </button>
        <button onClick={() => onClose("menu")}
          style={{ width: "100%", padding: "12px", fontSize: 14, background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
          テストメニューにもどる
        </button>
      </div>
    </div>
  );
}
