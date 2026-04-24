import { useState, useEffect, useCallback } from "react";

const GRADES = ["中1", "中2", "中3", "高1", "高2", "高3"];

async function generateQuestions(grade) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `あなたは英単語テストの問題作成AIです。必ずJSON形式のみで返答してください。前置きや説明は一切不要です。`,
      messages: [{
        role: "user",
        content: `${grade}レベルの英単語テスト問題を10問作成してください。
日本語→英語問題5問、英語→日本語問題5問をランダムに混ぜてください。
以下のJSON形式のみで返答してください：
[
  {
    "question": "問題文",
    "correct": "正解",
    "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"]
  }
]
choicesには正解を含む4つの選択肢をランダムな順番で入れてください。`
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.map(b => b.text || "").join("") || "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function saveTestResult(entry) {
  try {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveTestResult", entry })
    });
  } catch (e) { console.error(e); }
}

export default function WordTest({ onClose }) {
  const [phase, setPhase] = useState("select"); // select | loading | quiz | result
  const [grade, setGrade] = useState("");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [answers, setAnswers] = useState([]);
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    if (phase !== "quiz") return;
    if (selected !== null) return;
    setTimeLeft(5);
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          handleAnswer(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [current, phase, selected]);

  const handleStart = async () => {
    if (!grade) return;
    setPhase("loading");
    try {
      const qs = await generateQuestions(grade);
      setQuestions(qs);
      setCurrent(0);
      setScore(0);
      setAnswers([]);
      setSelected(null);
      setPhase("quiz");
    } catch (e) {
      alert("問題の生成に失敗しました。もう一度試してね🐾");
      setPhase("select");
    }
  };

  const handleAnswer = useCallback((choice) => {
    if (selected !== null) return;
    const q = questions[current];
    const isCorrect = choice === q.correct;
    setSelected(choice || "タイムアウト");
    if (isCorrect) setScore(s => s + 1);
    setAnswers(a => [...a, { question: q.question, correct: q.correct, selected: choice, isCorrect }]);

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setPhase("result");
        saveTestResult({
          id: Date.now(),
          studentName,
          grade,
          score: isCorrect ? score + 1 : score,
          total: questions.length,
          time: new Date().toLocaleString("ja-JP"),
          type: "英単語"
        });
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1000);
  }, [selected, questions, current, score, studentName, grade]);

  if (phase === "select") return (
    <div style={{ minHeight: "100vh", background: "#FFF5F5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🐶</div>
      <div style={{ fontSize: 22, fontWeight: "900", color: "#FF6B6B", marginBottom: 4 }}>英単語テスト</div>
      <div style={{ fontSize: 13, color: "#aaa", marginBottom: 32 }}>10問・1問5秒勝負！</div>

      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>なまえ（省略OK）</div>
        <input value={studentName} onChange={e => setStudentName(e.target.value)}
          placeholder="なまえを入力"
          style={{ width: "100%", padding: "12px", fontSize: 15, border: "2.5px solid #FFE4E4", borderRadius: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 20 }} />

        <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>学年を選んでね</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 32 }}>
          {GRADES.map(g => (
            <button key={g} onClick={() => setGrade(g)}
              style={{ padding: "12px 0", fontSize: 15, fontWeight: "800", borderRadius: 12, border: grade === g ? "3px solid #FF6B6B" : "2.5px solid #FFE4E4", background: grade === g ? "#FF6B6B" : "#fff", color: grade === g ? "#fff" : "#FF6B6B", cursor: "pointer" }}>
              {g}
            </button>
          ))}
        </div>

        <button onClick={handleStart} disabled={!grade}
          style={{ width: "100%", padding: "16px", fontSize: 17, fontWeight: "900", background: grade ? "#FF6B6B" : "#ffcdd2", color: "#fff", border: "none", borderRadius: 16, cursor: grade ? "pointer" : "default" }}>
          🐾 スタート！
        </button>
        <button onClick={onClose} style={{ width: "100%", marginTop: 12, padding: "12px", fontSize: 14, background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
          もどる
        </button>
      </div>
    </div>
  );

  if (phase === "loading") return (
    <div style={{ minHeight: "100vh", background: "#FFF5F5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🐶</div>
      <div style={{ fontSize: 16, fontWeight: "700", color: "#FF6B6B" }}>問題を作っています...</div>
    </div>
  );

  if (phase === "quiz" && questions.length > 0) {
    const q = questions[current];
    return (
      <div style={{ minHeight: "100vh", background: "#FFF5F5", display: "flex", flexDirection: "column", alignItems: "center", padding: 24, paddingTop: 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: "#aaa", fontWeight: "700" }}>{current + 1} / {questions.length}</div>
            <div style={{ fontSize: 28, fontWeight: "900", color: timeLeft <= 2 ? "#EF4444" : "#FF6B6B" }}>{timeLeft}</div>
          </div>

          <div style={{ width: "100%", background: "#FFE4E4", borderRadius: 8, height: 8, marginBottom: 32 }}>
            <div style={{ width: `${((current) / questions.length) * 100}%`, background: "#FF6B6B", height: 8, borderRadius: 8, transition: "width 0.3s" }} />
          </div>

          <div style={{ background: "#fff", borderRadius: 20, padding: 24, marginBottom: 24, textAlign: "center", boxShadow: "0 2px 12px rgba(255,107,107,0.1)" }}>
            <div style={{ fontSize: 22, fontWeight: "900", color: "#333" }}>{q.question}</div>
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
                  style={{ padding: "16px 12px", fontSize: 15, fontWeight: "700", borderRadius: 14, border, background: bg, color, cursor: selected ? "default" : "pointer", transition: "all 0.2s" }}>
                  {choice}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result") return (
    <div style={{ minHeight: "100vh", background: "#FFF5F5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>{score >= 8 ? "🏆" : score >= 5 ? "🐶" : "😢"}</div>
      <div style={{ fontSize: 24, fontWeight: "900", color: "#FF6B6B", marginBottom: 4 }}>結果発表！</div>
      <div style={{ fontSize: 48, fontWeight: "900", color: "#333", marginBottom: 4 }}>{score} <span style={{ fontSize: 20, color: "#aaa" }}>/ {questions.length}</span></div>
      <div style={{ fontSize: 15, color: "#888", marginBottom: 32 }}>
        {score >= 8 ? "すごい！完璧に近いわん！🎉" : score >= 5 ? "なかなかやるわん！もう少し！🐾" : "もう一度チャレンジしてみてわん！💪"}
      </div>
      <button onClick={() => { setPhase("select"); setGrade(""); }} style={{ width: "100%", maxWidth: 360, padding: "16px", fontSize: 16, fontWeight: "900", background: "#FF6B6B", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", marginBottom: 12 }}>
        🔄 もう一度やる
      </button>
      <button onClick={onClose} style={{ width: "100%", maxWidth: 360, padding: "12px", fontSize: 14, background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
        もどる
      </button>
    </div>
  );

  return null;
}
