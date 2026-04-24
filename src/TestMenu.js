import { useState } from "react";
import { SUBJECTS, SCIENCE_UNITS, SOCIAL_UNITS, GRADES_ALL, GRADES_MID_HIGH } from "./testData";
import QuizEngine from "./QuizEngine";

async function generateQuestions(subject, grade, units, keywords, difficulty) {
  let prompt = "";
  if (subject === "english") {
    prompt = `${grade}レベルの英単語テスト問題を10問作成してください。日本語→英語問題5問、英語→日本語問題5問をランダムに混ぜてください。`;
  } else if (subject === "vocab") {
    prompt = `${grade}レベルの語彙・言葉の意味テスト問題を10問作成してください。言葉の意味を問う4択問題にしてください。
問題文と選択肢の漢字には必ずふりがなをつけてください。
ふりがなは {漢字|ふりがな} の形式で書いてください。例：{綺麗|きれい}な{花|はな}`;
  } else if (subject === "kanji") {
    prompt = `${grade}で習う漢字の読み方テスト問題を10問作成してください。漢字の読み方を問う4択問題にしてください。`;
  } else if (subject === "science") {
    const diffText = difficulty === "easy" ? "基本的な" : difficulty === "hard" ? "発展的な" : "標準的な";
    prompt = `${grade}の理科「${units.join("・")}」の単元から${diffText}テスト問題を10問作成してください。`;
  } else if (subject === "social") {
    const diffText = difficulty === "easy" ? "基本的な" : difficulty === "hard" ? "発展的な" : "標準的な";
    prompt = `${grade}の社会「${units.join("・")}」の単元から${diffText}テスト問題を10問作成してください。`;
  } else if (subject === "keyword") {
    const diffText = difficulty === "easy" ? "基本的な" : difficulty === "hard" ? "発展的な" : "標準的な";
    prompt = `${grade}レベルで「${keywords.join("・")}」に関する${diffText}テスト問題を10問作成してください。`;
  }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: `あなたはテスト問題作成AIです。必ずJSON形式のみで返答してください。前置きや説明は一切不要です。`,
      messages: [{
        role: "user",
        content: `${prompt}
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

export default function TestMenu({ onClose }) {
  const [phase, setPhase] = useState("subject");
  const [subject, setSubject] = useState(null);
  const [grade, setGrade] = useState("");
  const [selectedUnits, setSelectedUnits] = useState([]);
  const [keywords, setKeywords] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);

  const subjectData = SUBJECTS.find(s => s.id === subject);

  const getGrades = () => {
    if (!subject) return GRADES_ALL;
    if (subject === "science") return Object.keys(SCIENCE_UNITS);
    if (subject === "social") return Object.keys(SOCIAL_UNITS);
    if (subject === "english") return GRADES_MID_HIGH;
    return GRADES_ALL;
  };

  const getUnits = () => {
    if (subject === "science") return SCIENCE_UNITS[grade] || [];
    if (subject === "social") return SOCIAL_UNITS[grade] || [];
    return [];
  };

  const toggleUnit = (unit) => {
    setSelectedUnits(prev =>
      prev.includes(unit) ? prev.filter(u => u !== unit) : prev.length < 5 ? [...prev, unit] : prev
    );
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const keywordList = keywords.split(/[,、\n]/).map(k => k.trim()).filter(k => k);
      const qs = await generateQuestions(subject, grade, selectedUnits, keywordList);
      setQuestions(qs);
      setPhase("quiz");
    } catch (e) {
      alert("問題の生成に失敗しました。もう一度試してね🐾");
    }
    setLoading(false);
  };

  const gradeLabel = subject === "social" ? "教科を選んでね" : "学年を選んでね";
  const needsUnits = subject === "science" || subject === "social";
  const needsKeywords = subject === "keyword";
  const needsDifficulty = subject === "science" || subject === "social" || subject === "keyword";
  const canStart = subject && grade && 
    (!needsUnits || selectedUnits.length > 0) && 
    (!needsKeywords || keywords.trim().length > 0) &&
    (!needsDifficulty || difficulty !== "");

  if (phase === "quiz") return (
    <QuizEngine
      questions={questions}
      studentName={studentName}
      grade={grade}
      subject={subjectData?.label || subject}
      onClose={(dest) => { if (dest === "menu") { setPhase("subject"); setSubject(null); setGrade(""); setSelectedUnits([]); setKeywords(""); } else { setPhase("subject"); setSubject(null); setGrade(""); setSelectedUnits([]); setKeywords(""); } }}
      onRetry={(retryQs) => { setQuestions(retryQs); setPhase("quiz"); }}
    />
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FFF5F5", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🐶</div>
      <div style={{ fontSize: 16, fontWeight: "700", color: "#FF6B6B" }}>問題を作っています...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FFF5F5", padding: 24, paddingTop: 48 }}>
      <div style={{ maxWidth: 440, margin: "0 auto" }}>
        <div style={{ fontSize: 22, fontWeight: "900", color: "#FF6B6B", marginBottom: 4, textAlign: "center" }}>📝 テスト</div>
        <div style={{ fontSize: 13, color: "#aaa", marginBottom: 32, textAlign: "center" }}>10問・4択クイズ！</div>

        {/* なまえ */}
        <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>なまえ（省略OK）</div>
        <input value={studentName} onChange={e => setStudentName(e.target.value)}
          placeholder="なまえを入力"
          style={{ width: "100%", padding: "12px", fontSize: 15, border: "2.5px solid #FFE4E4", borderRadius: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 24 }} />

        {/* 科目選択 */}
        <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>科目を選んでね</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
          {SUBJECTS.map(s => (
            <button key={s.id} onClick={() => { setSubject(s.id); setGrade(""); setSelectedUnits([]); }}
              style={{ padding: "12px 4px", fontSize: 13, fontWeight: "800", borderRadius: 12, border: subject === s.id ? `3px solid ${s.color}` : "2.5px solid #FFE4E4", background: subject === s.id ? s.color : "#fff", color: subject === s.id ? "#fff" : s.color, cursor: "pointer" }}>
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        {/* 学年選択 */}
        {subject && (
          <>
            <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>{gradeLabel}</div>
            <div style={{ display: "grid", gridTemplateColumns: subject === "social" ? "1fr" : "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
              {getGrades().map(g => (
                <button key={g} onClick={() => { setGrade(g); setSelectedUnits([]); }}
                  style={{ padding: "12px 0", fontSize: 13, fontWeight: "800", borderRadius: 12, border: grade === g ? "3px solid #FF6B6B" : "2.5px solid #FFE4E4", background: grade === g ? "#FF6B6B" : "#fff", color: grade === g ? "#fff" : "#FF6B6B", cursor: "pointer" }}>
                  {g}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 単元選択（理科・社会） */}
        {needsUnits && grade && (
          <>
            <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 4 }}>単元を選んでね（複数選択OK・最大5つ）</div>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>選択中: {selectedUnits.length}つ</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {getUnits().map(unit => (
                <button key={unit} onClick={() => toggleUnit(unit)}
                  style={{ padding: "8px 12px", fontSize: 12, fontWeight: "700", borderRadius: 20, border: selectedUnits.includes(unit) ? "2px solid #00B894" : "2px solid #ddd", background: selectedUnits.includes(unit) ? "#00B894" : "#fff", color: selectedUnits.includes(unit) ? "#fff" : "#555", cursor: "pointer" }}>
                  {unit}
                </button>
              ))}
            </div>
          </>
        )}

        {/* キーワード入力 */}
        {needsKeywords && grade && (
          <>
            <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 4 }}>キーワードを入力（1〜10個）</div>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8 }}>カンマ・改行で区切ってね</div>
            <textarea value={keywords} onChange={e => setKeywords(e.target.value)}
              placeholder="例：光合成, 蒸散, 葉緑体"
              style={{ width: "100%", padding: "12px", fontSize: 14, border: "2.5px solid #FFE4E4", borderRadius: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical", height: 100, marginBottom: 24 }} />
          </>
        )}

        {/* 難易度選択（理科・社会・キーワード） */}
        {needsDifficulty && grade && (subject !== "keyword" || keywords.trim().length > 0) && (subject !== "science" || selectedUnits.length > 0) && (subject !== "social" || selectedUnits.length > 0) && (
          <>
            <div style={{ fontSize: 13, fontWeight: "700", color: "#888", marginBottom: 8 }}>難易度を選んでね</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 24 }}>
              {[{ id: "easy", label: "やさしい", emoji: "😊" }, { id: "normal", label: "ふつう", emoji: "🐶" }, { id: "hard", label: "むずかしい", emoji: "🔥" }].map(d => (
                <button key={d.id} onClick={() => setDifficulty(d.id)}
                  style={{ padding: "12px 4px", fontSize: 13, fontWeight: "800", borderRadius: 12, border: difficulty === d.id ? "3px solid #FF6B6B" : "2.5px solid #FFE4E4", background: difficulty === d.id ? "#FF6B6B" : "#fff", color: difficulty === d.id ? "#fff" : "#FF6B6B", cursor: "pointer" }}>
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* スタートボタン */}
        <button onClick={handleStart} disabled={!canStart}
          style={{ width: "100%", padding: "16px", fontSize: 17, fontWeight: "900", background: canStart ? "#FF6B6B" : "#ffcdd2", color: "#fff", border: "none", borderRadius: 16, cursor: canStart ? "pointer" : "default", marginBottom: 12 }}>
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
