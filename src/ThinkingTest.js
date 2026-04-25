import { useState, useEffect, useCallback } from "react";

async function generateThinkingQuestions() {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `あなたは論理思考問題を作成するAIです。必ずJSON形式のみで返答してください。前置きや説明は一切不要です。`,
      messages: [{
        role: "user",
        content: `神奈川県高校入試「共通特色検査」レベルの論理推論問題を3問作成してください。

問題の種類：
- 順序推論（A・B・C・Dの速さ・背の高さ・順位など）
- 嘘つき問題（誰が本当のことを言っている？）
- 条件整理（条件から正しいものを選ぶ）
- 集合問題（〜な人は何人？）

ルール：
- 中学生〜高校生向けの難易度
- 問題文は分かりやすく短く
- 4択の選択肢
- 小学生でもわかる丁寧な解説をつける

以下のJSON形式のみで返答してください：
[
  {
    "question": "問題文（条件も含む）",
    "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
    "correct": "正解の選択肢（choicesの中の1つと完全一致）",
    "explanation": "小学生でもわかる丁寧な解説（なぜその答えになるかを順を追って説明）"
  }
]`
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export default function ThinkingTest({ onClose }) {
  const [phase, setPhase] = useState("select");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(90);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState("");

  const handleStart = async () => {
    setLoading(true);
    try {
      const qs = await generateThinkingQuestions();
      setQuestions(qs);
      setCurrent(0);
      setScore(0);
      setAnswers([]);
      setSelected(null);
      setPhase("quiz");
    } catch (e) {
      alert("問題の生成に失敗しました。もう一度試してね🐾");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (phase !== "quiz") return;
    if (selected !== null) return;
    setTimeLeft(90);
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
    setAnswers(a => [...a, { question: q.question, correct: q.correct, selected: choice, isCorrect, explanation: q.explanation }]);
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setPhase("result");
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1500);
  }, [selected, questions, current]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#F0F4FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
      <div style={{ fontSize: 16, fontWeight: "700", color: "#4C6EF5" }}>問題を考えています...</div>
    </div>
  );

  if (phase === "select") return (
    <div style={{ minHeight: "100vh", background: "#F0F4FF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🧠</div>
      <div style={{ fontSize: 24, fontWeight: "900", color: "#4C6EF5", marginBottom: 4 }}>思考</div>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 8 }}>3問・1問90秒</div>
      <div style={{ fontSize: 12, color: "#4C6EF5", background: "#E8EDFF", padding: "8px 16px", borderRadius: 20, marginBottom: 32, fontWeight: "700" }}>論理推論トレーニング</div>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>なまえ（省略OK）</div>
        <input value={studentName} onChange={e => setStudentName(e.target.value)}
          placeholder="なまえを入力"
          style={{ width: "100%", padding: "12px", fontSize: 15, border: "2.5px solid #C5CEFF", borderRadius: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 24 }} />
        <button onClick={handleStart}
          style={{ width: "100%", padding: "16px", fontSize: 17, fontWeight: "900", background: "#4C6EF5", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", marginBottom: 12 }}>
          🧠 スタート！
        </button>
        <button onClick={onClose}
          style={{ width: "100%", padding: "12px", fontSize: 14, background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
          もどる
        </button>
      </div>
    </div>
  );

  if (phase === "quiz" && questions.length > 0) {
    const q = questions[current];
    const progress = timeLeft / 90;
    const timerColor = timeLeft <= 20 ? "#EF4444" : timeLeft <= 45 ? "#F59E0B" : "#4C6EF5";
    return (
      <div style={{ minHeight: "100vh", background: "#F0F4FF", display: "flex", flexDirection: "column", alignItems: "center", padding: 24, paddingTop: 32 }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: "#aaa", fontWeight: "700" }}>{current + 1} / {questions.length}</div>
            <div style={{ fontSize: 32, fontWeight: "900", color: timerColor }}>{timeLeft}</div>
          </div>
          <div style={{ width: "100%", background: "#C5CEFF", borderRadius: 8, height: 8, marginBottom: 24 }}>
            <div style={{ width: `${progress * 100}%`, background: timerColor, height: 8, borderRadius: 8, transition: "width 1s linear" }} />
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: "0 2px 16px rgba(76,110,245,0.1)", border: "2px solid #C5CEFF" }}>
            <div style={{ fontSize: 12, fontWeight: "800", color: "#4C6EF5", marginBottom: 12 }}>🧠 問題 {current + 1}</div>
            <div style={{ fontSize: 15, fontWeight: "700", color: "#333", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{q.question}</div>
          </div>
          {selected !== null && (
            <div style={{ background: "#EEF2FF", borderRadius: 14, padding: 16, marginBottom: 16, border: "2px solid #C5CEFF" }}>
              <div style={{ fontSize: 12, fontWeight: "800", color: "#4C6EF5", marginBottom: 8 }}>💡 解説</div>
              <div style={{ fontSize: 13, color: "#444", lineHeight: 1.8 }}>{q.explanation}</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.choices.map((choice, i) => {
              let bg = "#fff", border = "2.5px solid #C5CEFF", color = "#333";
              if (selected !== null) {
                if (choice === q.correct) { bg = "#D1FAE5"; border = "2.5px solid #10B981"; color = "#065F46"; }
                else if (choice === selected) { bg = "#FEE2E2"; border = "2.5px solid #EF4444"; color = "#991B1B"; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(choice)} disabled={selected !== null}
                  style={{ padding: "14px 16px", fontSize: 14, fontWeight: "700", borderRadius: 14, border, background: bg, color, cursor: selected ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div style={{ minHeight: "100vh", background: "#F0F4FF", display: "flex", flexDirection: "column", alignItems: "center", padding: 24, paddingTop: 48 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>{score === 3 ? "🏆" : score === 2 ? "🧠" : score === 1 ? "🐶" : "😢"}</div>
        <div style={{ fontSize: 24, fontWeight: "900", color: "#4C6EF5", marginBottom: 4 }}>結果発表！</div>
        <div style={{ fontSize: 48, fontWeight: "900", color: "#333", marginBottom: 4 }}>{score} <span style={{ fontSize: 20, color: "#aaa" }}>/ {questions.length}</span></div>
        <div style={{ fontSize: 15, color: "#888", marginBottom: 24 }}>
          {score === 3 ? "完璧！論理的思考力バッチリわん！🎉" : score === 2 ? "いい調子わん！あと一歩！🐾" : "難しかったね。解説をよく読もうわん！💪"}
        </div>
        <div style={{ width: "100%", maxWidth: 480, marginBottom: 24 }}>
          {answers.map((a, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, border: `2px solid ${a.isCorrect ? "#10B981" : "#EF4444"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 16 }}>{a.isCorrect ? "✅" : "❌"}</div>
                <div style={{ fontSize: 13, fontWeight: "800", color: "#333" }}>問題 {i + 1}</div>
              </div>
              <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 4 }}>あなたの答え：{a.selected || "タイムアウト"}</div>
              <div style={{ fontSize: 12, color: "#10B981", fontWeight: "700", marginBottom: 10 }}>正解：{a.correct}</div>
              <div style={{ background: "#EEF2FF", borderRadius: 10, padding: 12, border: "1px solid #C5CEFF" }}>
                <div style={{ fontSize: 11, fontWeight: "800", color: "#4C6EF5", marginBottom: 4 }}>💡 解説</div>
                <div style={{ fontSize: 12, color: "#444", lineHeight: 1.8 }}>{a.explanation}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ width: "100%", maxWidth: 480 }}>
          <button onClick={handleStart}
            style={{ width: "100%", padding: "16px", fontSize: 16, fontWeight: "900", background: "#4C6EF5", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", marginBottom: 12 }}>
            🔄 もう一度やる
          </button>
          <button onClick={onClose}
            style={{ width: "100%", padding: "12px", fontSize: 14, background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
            もどる
          </button>
        </div>
      </div>
    );
  }

  return null;
}
