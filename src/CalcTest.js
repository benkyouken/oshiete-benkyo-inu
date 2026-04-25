import { useState, useEffect, useCallback } from "react";
import QuizEngine from "./QuizEngine";

const CALC_TYPES = [
  { id: "kuku", label: "九九", emoji: "✖️", grades: ["小2","小3","小4","小5","小6"] },
  { id: "addsub", label: "足し算・引き算", emoji: "➕", grades: ["小1","小2","小3","小4","小5","小6"] },
  { id: "fourops", label: "四則計算", emoji: "🔢", grades: ["小3","小4","小5","小6"] },
  { id: "posneg_addsub", label: "正負の数の加法・減法", emoji: "➕➖", grades: ["中1"] },
  { id: "posneg_muldiv", label: "正負の数の乗法・除法", emoji: "✖️➗", grades: ["中1"] },
  { id: "posneg_four", label: "正負の数の四則計算", emoji: "🔢", grades: ["中1"] },
  { id: "algebra", label: "文字式の四則計算", emoji: "🔤", grades: ["中1","中2","中3"] },
  { id: "equation", label: "方程式", emoji: "⚖️", grades: ["中1","中2","中3"] },
];

function generateQuestion(type) {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

  let question, correct, choices;

  if (type === "kuku") {
    const a = rand(2, 9), b = rand(1, 9);
    correct = a * b;
    question = `${a} × ${b} = ?`;
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-5, 5);
      if (w !== correct && w > 0) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);

  } else if (type === "addsub") {
    const op = rand(0, 1);
    if (op === 0) {
      const a = rand(1, 99), b = rand(1, 99);
      correct = a + b;
      question = `${a} + ${b} = ?`;
    } else {
      const a = rand(10, 99), b = rand(1, a);
      correct = a - b;
      question = `${a} - ${b} = ?`;
    }
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-10, 10);
      if (w !== correct) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);

  } else if (type === "fourops") {
    const ops = ["+", "-", "×", "÷"];
    const op = ops[rand(0, 3)];
    if (op === "+") {
      const a = rand(1, 99), b = rand(1, 99);
      correct = a + b;
      question = `${a} + ${b} = ?`;
    } else if (op === "-") {
      const a = rand(10, 99), b = rand(1, a);
      correct = a - b;
      question = `${a} - ${b} = ?`;
    } else if (op === "×") {
      const a = rand(2, 9), b = rand(2, 9);
      correct = a * b;
      question = `${a} × ${b} = ?`;
    } else {
      const b = rand(2, 9), correct_ = rand(2, 9);
      const a = b * correct_;
      correct = correct_;
      question = `${a} ÷ ${b} = ?`;
    }
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-5, 5);
      if (w !== correct) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);

  } else if (type === "posneg_addsub") {
    const a = rand(-20, 20), b = rand(-20, 20);
    const op = rand(0, 1);
    if (op === 0) {
      correct = a + b;
      question = `(${a}) + (${b}) = ?`;
    } else {
      correct = a - b;
      question = `(${a}) - (${b}) = ?`;
    }
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-5, 5);
      if (w !== correct) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);

  } else if (type === "posneg_muldiv") {
    const op = rand(0, 1);
    if (op === 0) {
      const a = rand(-9, 9), b = rand(-9, 9);
      correct = a * b;
      question = `(${a}) × (${b}) = ?`;
    } else {
      const b = rand(1, 9) * (rand(0,1) ? 1 : -1);
      const correct_ = rand(1, 9) * (rand(0,1) ? 1 : -1);
      const a = b * correct_;
      correct = correct_;
      question = `(${a}) ÷ (${b}) = ?`;
    }
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-5, 5);
      if (w !== correct) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);

  } else if (type === "posneg_four") {
    const a = rand(-10, 10), b = rand(-10, 10), c = rand(-5, 5);
    const ops = ["+", "-"];
    const op1 = ops[rand(0,1)], op2 = ops[rand(0,1)];
    if (op1 === "+" && op2 === "+") correct = a + b + c;
    else if (op1 === "+" && op2 === "-") correct = a + b - c;
    else if (op1 === "-" && op2 === "+") correct = a - b + c;
    else correct = a - b - c;
    question = `(${a}) ${op1} (${b}) ${op2} (${c}) = ?`;
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-5, 5);
      if (w !== correct) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);

  } else if (type === "algebra") {
    const x = rand(1, 10);
    const a = rand(1, 5), b = rand(1, 5);
    const ops = ["+", "-", "×"];
    const op = ops[rand(0, 2)];
    if (op === "+") {
      correct = (a + b) * x;
      question = `${a}x + ${b}x = ? （x = ${x}）`;
    } else if (op === "-" && a > b) {
      correct = (a - b) * x;
      question = `${a}x - ${b}x = ? （x = ${x}）`;
    } else {
      correct = a * b * x;
      question = `${a} × ${b}x = ? （x = ${x}）`;
    }
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-10, 10);
      if (w !== correct && w > 0) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);

  } else if (type === "equation") {
    const x = rand(1, 10);
    const a = rand(1, 5), b = rand(1, 20);
    const lhs = a * x + b;
    correct = x;
    question = `${a}x + ${b} = ${lhs}　x = ?`;
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = correct + rand(-3, 3);
      if (w !== correct && w > 0) wrongs.add(w);
    }
    choices = shuffle([correct, ...wrongs]);
  }

  return {
    question,
    correct: String(correct),
    choices: choices.map(String)
  };
}

export default function CalcTest({ onClose }) {
  const [phase, setPhase] = useState("select");
  const [calcType, setCalcType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [studentName, setStudentName] = useState("");

  const handleStart = () => {
    const qs = Array.from({ length: 5 }, () => generateQuestion(calcType));
    setQuestions(qs);
    setPhase("quiz");
  };

  if (phase === "quiz") return (
    <QuizEngine
      questions={questions}
      studentName={studentName}
      grade=""
      subject={CALC_TYPES.find(t => t.id === calcType)?.label || "計算"}
      onClose={(dest) => { setPhase("select"); setCalcType(null); }}
      onRetry={(retryQs) => { setQuestions(retryQs); setPhase("quiz"); }}
      timeLimit={10}
    />
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FFF5F5", padding: 24, paddingTop: 48 }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: "900", color: "#FF6B6B", marginBottom: 4, textAlign: "center" }}>🔢 計算テスト</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 32, textAlign: "center" }}>5問・1問10秒勝負！</div>

        <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>なまえ（省略OK）</div>
        <input value={studentName} onChange={e => setStudentName(e.target.value)}
          placeholder="なまえを入力"
          style={{ width: "100%", padding: "12px", fontSize: 15, border: "2.5px solid #FFE4E4", borderRadius: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 24 }} />

        <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>種類を選んでね</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
          {CALC_TYPES.map(t => (
            <button key={t.id} onClick={() => setCalcType(t.id)}
              style={{ padding: "14px 16px", fontSize: 14, fontWeight: "800", borderRadius: 12, border: calcType === t.id ? "3px solid #FF6B6B" : "2.5px solid #FFE4E4", background: calcType === t.id ? "#FF6B6B" : "#fff", color: calcType === t.id ? "#fff" : "#FF6B6B", cursor: "pointer", textAlign: "left" }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <button onClick={handleStart} disabled={!calcType}
          style={{ width: "100%", padding: "16px", fontSize: 17, fontWeight: "900", background: calcType ? "#FF6B6B" : "#ffcdd2", color: "#fff", border: "none", borderRadius: 16, cursor: calcType ? "pointer" : "default", marginBottom: 12 }}>
          🐾 スタート！
        </button>
        <button onClick={onClose}
          style={{ width: "100%", padding: "12px", fontSize: 14, background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
          もどる
        </button>
      </div>
    </div>
  );
}
