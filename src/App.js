import { useState, useRef, useCallback, useEffect } from "react";

const GRADES = [
  { label: "小1", value: "小学1年生" }, { label: "小2", value: "小学2年生" },
  { label: "小3", value: "小学3年生" }, { label: "小4", value: "小学4年生" },
  { label: "小5", value: "小学5年生" }, { label: "小6", value: "小学6年生" },
  { label: "中1", value: "中学1年生" }, { label: "中2", value: "中学2年生" },
  { label: "中3", value: "中学3年生" }, { label: "高1", value: "高校1年生" },
  { label: "高2", value: "高校2年生" }, { label: "高3", value: "高校3年生" },
];

const SUBJECTS = [
  { label: "数学", emoji: "📐", color: "#FF6B6B", bg: "#FFF0F0" },
  { label: "英語", emoji: "🔤", color: "#FF9F43", bg: "#FFF7ED" },
  { label: "国語", emoji: "📖", color: "#54A0FF", bg: "#EFF6FF" },
  { label: "理科", emoji: "🔬", color: "#5F27CD", bg: "#F5F3FF" },
  { label: "社会", emoji: "🌏", color: "#00D2D3", bg: "#F0FFFE" },
];

const TEACHER_PASSWORD = "home2024";
const STORAGE_KEY = "qa-logs";

const SYSTEM_PROMPT = `あなたは「勉強犬」という名前の、元気でやさしい犬の家庭教師キャラクターです。
生徒からの質問に答えるとき：
- 語尾に「わん！」「だよ！」「ね！」など犬らしさとやさしさを混ぜる（やりすぎない程度に）
- 学年に合わせた言葉遣いで答える
- 小学生にはひらがなを多めに使う
- 答えだけでなく「なぜそうなるか」を説明する
- 励ましの言葉を必ず添える
- 絵文字を使って親しみやすくする
- 回答は長すぎず要点を絞る`;

const HINT_PROMPT = `あなたは「勉強犬」という名前の、元気でやさしい犬の家庭教師キャラクターです。
ヒントだけを出してください：
- 答えは絶対に教えない
- 「どこから考えればいいか」「どんな公式が使えるか」のとっかかりだけを伝える
- 1〜2文の短いヒントにする
- 学年に合わせた言葉遣いで
- 小学生にはやさしくひらがなを多めに
- 最後に犬らしく「いっしょにがんばろう！🐾」のような一言を
- 絶対に解き方の手順や答えを示さないこと`;

async function loadLogs() {
  try { const r = await window.storage.get(STORAGE_KEY, true); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
async function saveLog(entry) {
  try { const logs = await loadLogs(); logs.unshift(entry); await window.storage.set(STORAGE_KEY, JSON.stringify(logs.slice(0, 200)), true); }
  catch (e) { console.error(e); }
}
async function updateLog(id, patch) {
  try {
    const logs = await loadLogs(); const idx = logs.findIndex(l => l.id === id);
    if (idx !== -1) logs[idx] = { ...logs[idx], ...patch };
    await window.storage.set(STORAGE_KEY, JSON.stringify(logs), true); return logs;
  } catch (e) { console.error(e); return null; }
}

const subjectColor = sub => SUBJECTS.find(s => s.label === sub)?.color || "#aaa";
const subjectEmoji = sub => SUBJECTS.find(s => s.label === sub)?.emoji || "";
const subjectBg = sub => SUBJECTS.find(s => s.label === sub)?.bg || "#f9f9f9";

async function callClaude(systemPrompt, userContent) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": process.env.REACT_APP_ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages: [{ role: "user", content: userContent }] }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.map(b => b.text || "").join("\n") || "";
}

function buildUserContent(grade, subject, question, imageBase64) {
  const parts = [];
  if (imageBase64) parts.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
  parts.push({ type: "text", text: `学年：${grade}\n科目：${subject}\n${question ? `質問：${question}` : "この問題を解説してください。"}` });
  return parts;
}

// ── Dog mascot SVG ───────────────────────────────────────────
function DogFace({ size = 56, mood = "normal" }) {
  
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "linear-gradient(135deg,#FBBF24,#F59E0B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.52, boxShadow: "0 3px 10px rgba(251,191,36,0.4)", flexShrink: 0, border: "3px solid #fff" }}>
      🐶
    </div>
  );
}

// ── Bubble speech ────────────────────────────────────────────
function DogSpeech({ text, color = "#FF6B6B" }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
      <DogFace size={44} />
      <div style={{ background: "#fff", border: `2.5px solid ${color}`, borderRadius: "0 16px 16px 16px", padding: "10px 14px", fontSize: 14, color: "#333", lineHeight: 1.7, flex: 1, boxShadow: "2px 3px 0px " + color + "44" }}>
        {text}
      </div>
    </div>
  );
}

// ── Teacher Login ────────────────────────────────────────────
function TeacherLogin({ onLogin }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState(false);
  const check = () => pw === TEACHER_PASSWORD ? onLogin() : setErr(true);
  return (
    <div style={S.loginWrap}>
      <div style={S.loginCard}>
        <div style={{ fontSize: 56, marginBottom: 4 }}>🐶</div>
        <div style={{ fontSize: 13, color: "#FF6B6B", fontWeight: "800", marginBottom: 2 }}>先生専用エリア</div>
        <div style={{ fontSize: 20, fontWeight: "900", color: "#333", marginBottom: 20 }}>ログイン</div>
        <input type="password" value={pw} onChange={e => { setPw(e.target.value); setErr(false); }}
          placeholder="パスワードを入力" style={{ ...S.input, marginBottom: 8 }}
          onKeyDown={e => e.key === "Enter" && check()} />
        {err && <div style={S.errorMsg}>パスワードが違います🐾</div>}
        <button style={S.mainBtn} onClick={check}>ログイン！</button>
        <div style={{ fontSize: 11, color: "#bbb", marginTop: 14 }}>※ 初期パスワード: home2024</div>
      </div>
    </div>
  );
}

// ── Teacher Dashboard ────────────────────────────────────────
function TeacherDashboard({ onClose }) {
  const [logs, setLogs] = useState([]); const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("すべて"); const [expanded, setExpanded] = useState(null);
  const [editingId, setEditingId] = useState(null); const [draftComment, setDraftComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadLogs().then(d => { setLogs(d); setLoading(false); }); }, []);

  const startEdit = log => { setEditingId(log.id); setDraftComment(log.teacherComment || ""); };
  const saveComment = async id => {
    setSaving(true);
    const updated = await updateLog(id, { teacherComment: draftComment.trim(), commentedAt: new Date().toLocaleString("ja-JP") });
    if (updated) setLogs(updated); setEditingId(null); setSaving(false);
  };
  const deleteComment = async id => { const u = await updateLog(id, { teacherComment: "", commentedAt: null }); if (u) setLogs(u); };

  const displayLogs = filter === "補足あり" ? logs.filter(l => l.teacherComment)
    : filter === "ヒント使用" ? logs.filter(l => l.hintUsed)
    : filter === "すべて" ? logs : logs.filter(l => l.subject === filter);

  return (
    <div style={{ ...S.root, background: "#FFF9F0" }}>
      <header style={{ ...S.header, borderBottom: "3px solid #FBBF24" }}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <span style={{ fontSize: 28 }}>🐶</span>
            <div>
              <div style={{ ...S.logoMain, color: "#D97706" }}>先生用ダッシュボード</div>
              <div style={S.logoSub}>質問ログ・補足コメント</div>
            </div>
          </div>
          <button onClick={onClose} style={{ ...S.chipBtn, color: "#D97706", background: "#FEF3C7", border: "2px solid #FCD34D" }}>← もどる</button>
        </div>
      </header>

      <main style={S.main}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[{ num: logs.length, label: "総質問数", color: "#FF6B6B" }, { num: logs.filter(l => l.hintUsed).length, label: "💡ヒント使用", color: "#8B5CF6" }, { num: logs.filter(l => l.teacherComment).length, label: "✏️補足済み", color: "#F59E0B" }]
            .map(({ num, label, color }) => (
              <div key={label} style={{ background: "#fff", borderRadius: 14, padding: "10px 16px", flex: "1 1 70px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: `2.5px solid ${color}` }}>
                <div style={{ fontSize: 22, fontWeight: "900", color }}>{num}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{label}</div>
              </div>
            ))}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["すべて", "補足あり", "ヒント使用", ...SUBJECTS.map(s => s.label)].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: "5px 12px", fontSize: 12, fontWeight: "700", borderRadius: 20, border: "2px solid", borderColor: filter === s ? "#FF6B6B" : "#eee", background: filter === s ? "#FF6B6B" : "#fff", color: filter === s ? "#fff" : "#888", cursor: "pointer" }}>
              {s}
            </button>
          ))}
        </div>

        {loading ? <div style={{ textAlign: "center", padding: 32, color: "#ccc" }}>読み込み中...🐾</div>
          : displayLogs.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#ccc" }}><div style={{ fontSize: 48 }}>📭</div><div style={{ marginTop: 8 }}>まだ質問がないよ</div></div>
          : displayLogs.map((log, i) => {
          const isExpanded = expanded === log.id; const isEditing = editingId === log.id;
          return (
            <div key={log.id || i} style={{ background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `2.5px solid ${subjectColor(log.subject)}22`, borderLeft: `5px solid ${subjectColor(log.subject)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: "800", padding: "3px 10px", borderRadius: 20, background: subjectBg(log.subject), color: subjectColor(log.subject) }}>{subjectEmoji(log.subject)} {log.subject}</span>
                  <span style={{ fontSize: 12, color: "#888", background: "#F3F4F6", padding: "3px 10px", borderRadius: 20 }}>{log.grade}</span>
                  {log.hintUsed && <span style={{ fontSize: 11, color: "#7C3AED", background: "#EDE9FE", padding: "3px 10px", borderRadius: 20, fontWeight: "800" }}>💡ヒント</span>}
                  {log.teacherComment && <span style={{ fontSize: 11, color: "#D97706", background: "#FEF3C7", padding: "3px 10px", borderRadius: 20, fontWeight: "800" }}>✏️補足</span>}
                </div>
                <div style={{ fontSize: 11, color: "#ccc" }}>{log.time}</div>
              </div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 6, cursor: "pointer" }} onClick={() => setExpanded(isExpanded ? null : log.id)}>
                {log.hasImage && <span style={{ fontSize: 11, color: "#54A0FF", fontWeight: "700" }}>📷 画像あり </span>}
                {log.question || "（テキストなし）"}
              </div>

              {isExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {log.hint && (
                    <div style={{ background: "#F5F3FF", borderRadius: 12, padding: 12, borderLeft: "4px solid #8B5CF6" }}>
                      <div style={{ fontSize: 12, fontWeight: "800", color: "#7C3AED", marginBottom: 6 }}>💡 出したヒント</div>
                      {log.hint.split("\n").map((l, j) => <p key={j} style={{ margin: "2px 0", fontSize: 13, color: "#444" }}>{l}</p>)}
                    </div>
                  )}
                  {log.answer && (
                    <div style={{ background: "#F0F9FF", borderRadius: 12, padding: 12, borderLeft: "4px solid #54A0FF" }}>
                      <div style={{ fontSize: 12, fontWeight: "800", color: "#2563EB", marginBottom: 6 }}>🐶 勉強犬の解説</div>
                      {log.answer.split("\n").map((l, j) => <p key={j} style={{ margin: "2px 0", fontSize: 13, color: "#444" }}>{l}</p>)}
                    </div>
                  )}
                  {isEditing ? (
                    <div style={{ background: "#FFFBEB", borderRadius: 12, padding: 12, border: "2px solid #FCD34D" }}>
                      <div style={{ fontSize: 12, fontWeight: "800", color: "#D97706", marginBottom: 8 }}>✏️ 補足コメントを編集</div>
                      <textarea value={draftComment} onChange={e => setDraftComment(e.target.value)}
                        placeholder="例：この問題は入試でよく出るよ！" style={{ ...S.input, marginBottom: 8, resize: "vertical", height: 80, border: "2px solid #FCD34D" }} autoFocus />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => saveComment(log.id)} disabled={saving}
                          style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: "800", background: "#F59E0B", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>
                          {saving ? "保存中..." : "💾 保存する"}
                        </button>
                        <button onClick={() => setEditingId(null)} style={{ padding: "10px 14px", fontSize: 13, background: "#f3f4f6", color: "#888", border: "none", borderRadius: 10, cursor: "pointer" }}>キャンセル</button>
                      </div>
                    </div>
                  ) : log.teacherComment ? (
                    <div style={{ background: "#FFFBEB", borderRadius: 12, padding: 12, border: "2px solid #FCD34D" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: "800", color: "#D97706" }}>✏️ 先生の補足</div>
                        <div style={{ fontSize: 11, color: "#ccc" }}>{log.commentedAt}</div>
                      </div>
                      {log.teacherComment.split("\n").map((l, j) => <p key={j} style={{ margin: "2px 0", fontSize: 13, color: "#444" }}>{l}</p>)}
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => startEdit(log)} style={{ flex: 1, padding: "8px", fontSize: 12, fontWeight: "700", background: "#FEF3C7", color: "#D97706", border: "2px solid #FCD34D", borderRadius: 8, cursor: "pointer" }}>✏️ 編集</button>
                        <button onClick={() => deleteComment(log.id)} style={{ padding: "8px 12px", fontSize: 12, background: "#FEF2F2", color: "#EF4444", border: "2px solid #FECACA", borderRadius: 8, cursor: "pointer" }}>削除</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(log)} style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: "700", background: "#FFFBEB", color: "#D97706", border: "2px dashed #FCD34D", borderRadius: 10, cursor: "pointer" }}>
                      ＋ 補足コメントを追加する
                    </button>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: "#ccc", textAlign: "right", marginTop: 8, cursor: "pointer" }} onClick={() => setExpanded(isExpanded ? null : log.id)}>
                {isExpanded ? "▲ 閉じる" : "▼ 詳細を見る"}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("student");
  const [step, setStep] = useState("select");
  const [grade, setGrade] = useState(null); const [subject, setSubject] = useState(null);
  const [image, setImage] = useState(null); const [imageBase64, setImageBase64] = useState(null);
  const [question, setQuestion] = useState("");
  const [hint, setHint] = useState(""); const [hintLoading, setHintLoading] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [answer, setAnswer] = useState(""); const [answerLoading, setAnswerLoading] = useState(false);
  const [currentLogId, setCurrentLogId] = useState(null);
  const [teacherComment, setTeacherComment] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null); const cameraInputRef = useRef(null);

  useEffect(() => {
    if (step !== "answer" || !currentLogId) return;
    const poll = setInterval(async () => {
      const logs = await loadLogs(); const log = logs.find(l => l.id === currentLogId);
      if (log?.teacherComment) setTeacherComment(log.teacherComment);
    }, 10000);
    return () => clearInterval(poll);
  }, [step, currentLogId]);

  const handleImageSelect = useCallback((file) => {
    if (!file) return;
    setImage(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = e => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file); setStep("asking");
  }, []);

  const handleHint = async () => {
    if (!grade || !subject) return;
    setHintLoading(true); setError(null);
    try {
      const text = await callClaude(HINT_PROMPT, buildUserContent(grade, subject, question, imageBase64));
      setHint(text); setHintShown(true); setStep("hint");
    } catch { setError("ヒントの取得に失敗したよ🐾"); }
    finally { setHintLoading(false); }
  };

  const handleAsk = async () => {
    if (!grade || !subject) return;
    if (!question.trim() && !imageBase64) { setError("質問を入力するか、写真を撮ってね🐾"); return; }
    setAnswerLoading(true); setError(null); setStep("answer");
    const logId = currentLogId || Date.now(); setCurrentLogId(logId);
    try {
      const text = await callClaude(SYSTEM_PROMPT, buildUserContent(grade, subject, question, imageBase64));
      setAnswer(text);
      const now = new Date();
      const entry = { id: logId, grade, subject, question: question.trim(), answer: text, hint: hint || "", hintUsed: hintShown, hasImage: !!imageBase64, teacherComment: "", commentedAt: null, time: `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}` };
      if (currentLogId) await updateLog(logId, { answer: text });
      else await saveLog(entry);
    } catch { setError("エラーが出たよ。もう一度試してね🐾"); setStep(hintShown ? "hint" : "asking"); }
    finally { setAnswerLoading(false); }
  };

  const reset = () => {
    setStep("select"); setGrade(null); setSubject(null); setImage(null); setImageBase64(null);
    setQuestion(""); setHint(""); setHintShown(false); setAnswer("");
    setCurrentLogId(null); setTeacherComment(null); setError(null);
  };

  const goToCamera = () => {
    if (!grade || !subject) { setError("学年と科目を選んでね🐾"); return; }
    setError(null); setStep("camera");
  };

  if (mode === "teacherLogin") return <TeacherLogin onLogin={() => setMode("teacherDash")} />;
  if (mode === "teacherDash") return <TeacherDashboard onClose={() => setMode("student")} />;

  const progressPct = step === "select" ? 15 : step === "camera" ? 35 : step === "asking" ? 55 : step === "hint" ? 75 : 100;

  return (
    <div style={S.root}>
      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logo}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#FBBF24,#F59E0B)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 2px 8px #FBBF2466" }}>🐶</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: "900", color: "#FF6B6B", lineHeight: 1.1, letterSpacing: "-0.3px" }}>教えて！勉強犬</div>
              <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>HOME個別指導塾</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {step !== "select" && <button onClick={reset} style={S.chipBtn}>🔄 最初から</button>}
            <button onClick={() => setMode("teacherLogin")} style={{ ...S.chipBtn, color: "#D97706", background: "#FEF3C7", border: "2px solid #FCD34D" }}>先生🔐</button>
          </div>
        </div>
        {/* Progress paw prints */}
        <div style={{ height: 6, background: "#FDE8E8", borderRadius: 3, margin: "0 16px 10px" }}>
          <div style={{ height: "100%", background: "linear-gradient(90deg,#FF6B6B,#FF9F43)", borderRadius: 3, width: `${progressPct}%`, transition: "width 0.5s cubic-bezier(.4,0,.2,1)" }} />
        </div>
      </header>

      <main style={S.main}>

        {/* ── Hero banner (select only) ── */}
        {step === "select" && (
          <div style={{ background: "linear-gradient(135deg,#FF6B6B,#FF9F43)", borderRadius: 20, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 20px #FF6B6B33" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, flexShrink: 0 }}>🐶</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: "900", color: "#fff", lineHeight: 1.3 }}>なんでも聞いてね！</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 3 }}>勉強犬がわかりやすく教えるよ🐾</div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Grade & Subject ── */}
        <section style={S.card}>
          <div style={S.sectionTitle}>
            <span style={S.stepDot}>1</span>
            <span>学年と科目を選ぼう</span>
          </div>
          <div style={S.gradeGrid}>
            {GRADES.map(g => (
              <button key={g.value} onClick={() => { setGrade(g.value); setError(null); }}
                style={{ ...S.gradeBtn, ...(grade === g.value ? { background: "#FF6B6B", color: "#fff", borderColor: "#FF6B6B", transform: "scale(1.05)" } : {}) }}
                disabled={step === "answer"}>
                {g.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 2 }}>
            {SUBJECTS.map(s => (
              <button key={s.label} onClick={() => { setSubject(s.label); setError(null); }}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", fontSize: 13, fontWeight: "800", borderRadius: 24, border: `2.5px solid`, borderColor: subject === s.label ? s.color : "#eee", background: subject === s.label ? s.bg : "#fff", color: subject === s.label ? s.color : "#aaa", cursor: "pointer", transition: "all 0.15s", transform: subject === s.label ? "scale(1.05)" : "scale(1)" }}
                disabled={step === "answer"}>
                <span>{s.emoji}</span>{s.label}
              </button>
            ))}
          </div>
          {grade && subject && step === "select" && (
            <div style={{ marginTop: 12, padding: "8px 14px", background: "#F0FFF4", border: "2px solid #6EE7B7", borderRadius: 12, fontSize: 13, fontWeight: "800", color: "#059669" }}>
              ✅ {grade}・{subject}を選んだよ！
            </div>
          )}
        </section>

        {/* ── STEP 2: Camera prompt ── */}
        {step === "select" && (
          <section style={S.card}>
            <div style={S.sectionTitle}><span style={S.stepDot}>2</span><span>問題の写真を撮ろう</span></div>
            <div onClick={goToCamera}
              style={{ border: "3px dashed #FFB347", borderRadius: 16, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: "#FFFBF0", transition: "background 0.15s" }}>
              <div style={{ fontSize: 44, marginBottom: 6 }}>📸</div>
              <div style={{ fontSize: 15, fontWeight: "900", color: "#FF9F43", marginBottom: 4 }}>ここをタップして撮影！</div>
              <div style={{ fontSize: 12, color: "#FBBF24" }}>教科書・プリント・ノート、なんでもOK🐾</div>
            </div>
            {error && <div style={{ ...S.errorMsg, marginTop: 10 }}>{error}</div>}
          </section>
        )}

        {step === "camera" && (
          <section style={S.card}>
            <div style={S.sectionTitle}><span style={S.stepDot}>2</span><span>写真を撮ろう</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{ ...S.mainBtn, background: "linear-gradient(135deg,#FF9F43,#FF6B6B)" }} onClick={() => cameraInputRef.current?.click()}>📷 カメラで撮影！</button>
              <button style={S.subBtn} onClick={() => fileInputRef.current?.click()}>🖼️ ライブラリから選ぶ</button>
              <button style={{ ...S.subBtn, color: "#888" }} onClick={() => setStep("asking")}>写真なしで質問する →</button>
            </div>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleImageSelect(e.target.files[0])} />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleImageSelect(e.target.files[0])} />
          </section>
        )}

        {/* ── STEP 3: Question ── */}
        {(step === "asking" || step === "hint" || step === "answer") && (
          <section style={S.card}>
            <div style={S.sectionTitle}><span style={S.stepDot}>3</span><span>質問しよう</span></div>
            {image && (
              <div style={{ position: "relative", marginBottom: 12 }}>
                <img src={image} alt="問題" style={{ width: "100%", borderRadius: 12, display: "block", maxHeight: 220, objectFit: "contain", border: "2px solid #FFE4B5" }} />
                {step === "asking" && (
                  <button style={{ position: "absolute", top: 6, right: 6, background: "#FF6B6B", color: "#fff", border: "none", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", fontSize: 12, fontWeight: "900" }}
                    onClick={() => { setImage(null); setImageBase64(null); }}>✕</button>
                )}
              </div>
            )}
            {step === "asking" && (
              <>
                <textarea value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder={image ? "わからないところを書いてね🐾（省略してもOK！）" : "質問を書いてね🐾"}
                  style={S.input} rows={3} />
                {error && <div style={S.errorMsg}>{error}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={handleHint} disabled={hintLoading}
                    style={{ flex: 1, padding: "13px 6px", fontSize: 14, fontWeight: "900", background: hintLoading ? "#EDE9FE" : "linear-gradient(135deg,#8B5CF6,#6D28D9)", color: hintLoading ? "#8B5CF6" : "#fff", border: "none", borderRadius: 14, cursor: "pointer", boxShadow: hintLoading ? "none" : "0 3px 0 #4C1D95" }}>
                    {hintLoading ? "考え中...🐾" : "💡 ヒントをもらう"}
                  </button>
                  <button onClick={handleAsk} disabled={answerLoading}
                    style={{ flex: 1, padding: "13px 6px", fontSize: 14, fontWeight: "900", background: answerLoading ? "#DBEAFE" : "linear-gradient(135deg,#FF6B6B,#FF9F43)", color: answerLoading ? "#3B82F6" : "#fff", border: "none", borderRadius: 14, cursor: "pointer", boxShadow: answerLoading ? "none" : "0 3px 0 #C2410C" }}>
                    {answerLoading ? "考え中...🐾" : "📖 解説してもらう"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Hint card ── */}
        {step === "hint" && hint && (
          <section style={{ ...S.card, border: "2.5px solid #8B5CF6", background: "#FDFBFF" }}>
            <div style={S.sectionTitle}><span style={{ ...S.stepDot, background: "#8B5CF6" }}>💡</span><span style={{ color: "#6D28D9" }}>ヒントだよ！</span></div>
            <DogSpeech text={hint} color="#8B5CF6" />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setStep("asking")} style={{ flex: 1, padding: "11px", fontSize: 13, fontWeight: "800", background: "#F5F3FF", color: "#6D28D9", border: "2px solid #DDD6FE", borderRadius: 12, cursor: "pointer" }}>
                ← もう一度考える🤔
              </button>
              <button onClick={handleAsk} disabled={answerLoading}
                style={{ flex: 1, padding: "11px", fontSize: 13, fontWeight: "800", background: "linear-gradient(135deg,#FF6B6B,#FF9F43)", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", boxShadow: "0 3px 0 #C2410C" }}>
                {answerLoading ? "考え中..." : "📖 解説を見る"}
              </button>
            </div>
          </section>
        )}

        {/* ── Answer ── */}
        {step === "answer" && (
          <>
            {hint && (
              <section style={{ ...S.card, border: "2px solid #DDD6FE", background: "#FDFBFF" }}>
                <div style={{ fontSize: 12, fontWeight: "800", color: "#7C3AED", marginBottom: 8 }}>💡 さっき出たヒント</div>
                <div style={{ background: "#EDE9FE", borderRadius: 10, padding: 12, fontSize: 13, color: "#555", lineHeight: 1.7 }}>
                  {hint}
                </div>
              </section>
            )}

            <section style={{ ...S.card, border: "2.5px solid #FF6B6B" }}>
              <div style={S.sectionTitle}>
                <span style={{ ...S.stepDot, background: "#FF6B6B" }}>🐶</span>
                <div>
                  <span style={{ color: "#FF6B6B", fontWeight: "900" }}>勉強犬の解説</span>
                  <span style={{ fontSize: 11, color: "#bbb", marginLeft: 8 }}>{grade}・{subject}</span>
                </div>
              </div>
              {answerLoading ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🐶</div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 7, marginBottom: 8 }}>
                    {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "#FF6B6B", display: "inline-block", animation: "bounce 1.2s infinite", animationDelay: `${d}s` }} />)}
                  </div>
                  <div style={{ fontSize: 13, color: "#FFB347", fontWeight: "700" }}>考えてるよ...🐾</div>
                </div>
              ) : (
                <DogSpeech text={answer} color="#FF6B6B" />
              )}
            </section>

            {teacherComment && (
              <section style={{ ...S.card, border: "2.5px solid #FCD34D", background: "#FFFBEB" }}>
                <div style={S.sectionTitle}>
                  <span style={{ fontSize: 26 }}>👩🏫</span>
                  <div>
                    <span style={{ color: "#D97706", fontWeight: "900" }}>先生からの補足</span>
                    <div style={{ fontSize: 11, color: "#bbb" }}>担当講師より</div>
                  </div>
                </div>
                <div style={{ background: "#FEF9C3", borderRadius: 12, padding: 14, fontSize: 14, color: "#555", lineHeight: 1.8, border: "2px solid #FDE68A" }}>
                  {teacherComment.split("\n").map((l, i) => <p key={i} style={{ margin: "3px 0" }}>{l}</p>)}
                </div>
              </section>
            )}

            {!answerLoading && answer && (
              <button onClick={reset}
                style={{ width: "100%", padding: "14px", fontSize: 15, fontWeight: "900", background: "linear-gradient(135deg,#FF6B6B,#FF9F43)", color: "#fff", border: "none", borderRadius: 16, cursor: "pointer", boxShadow: "0 4px 0 #C2410C", letterSpacing: "0.3px" }}>
                🐾 別の問題に挑戦する！
              </button>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-7px)} }
        button:active { transform: translateY(2px) !important; }
      `}</style>
    </div>
  );
}

const S = {
  root: { minHeight: "100vh", background: "#FFF5F5", fontFamily: "'Hiragino Maru Gothic ProN','Helvetica Neue','Yu Gothic',sans-serif" },
  header: { background: "#fff", boxShadow: "0 2px 12px rgba(255,107,107,0.1)", position: "sticky", top: 0, zIndex: 10, paddingTop: 10 },
  headerInner: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 8px" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoMain: { fontSize: 16, fontWeight: "900", color: "#FF6B6B" },
  logoSub: { fontSize: 10, color: "#ccc" },
  chipBtn: { fontSize: 12, color: "#888", background: "#f5f5f5", border: "2px solid #eee", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontWeight: "700" },
  main: { padding: "14px 16px 32px", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#fff", borderRadius: 20, padding: 18, boxShadow: "0 2px 16px rgba(255,107,107,0.08)", border: "2px solid #FFE4E4" },
  sectionTitle: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 14, fontWeight: "900", color: "#333" },
  stepDot: { width: 24, height: 24, borderRadius: "50%", background: "#FF6B6B", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "900", flexShrink: 0 },
  gradeGrid: { display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6, marginBottom: 12 },
  gradeBtn: { padding: "8px 2px", fontSize: 12, fontWeight: "800", border: "2.5px solid #FFE4E4", borderRadius: 10, background: "#fff", color: "#ccc", cursor: "pointer", transition: "all 0.15s" },
  input: { width: "100%", padding: "12px", fontSize: 14, border: "2.5px solid #FFE4E4", borderRadius: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box", resize: "vertical" },
  errorMsg: { fontSize: 13, color: "#EF4444", background: "#FEF2F2", borderRadius: 10, padding: "8px 12px", fontWeight: "700" },
  mainBtn: { width: "100%", padding: "14px", fontSize: 15, fontWeight: "900", background: "linear-gradient(135deg,#FF6B6B,#FF9F43)", color: "#fff", border: "none", borderRadius: 14, cursor: "pointer", boxShadow: "0 3px 0 #C2410C" },
  subBtn: { width: "100%", padding: "12px", fontSize: 14, fontWeight: "700", background: "#f9f9f9", color: "#666", border: "2px solid #eee", borderRadius: 12, cursor: "pointer" },
  loginWrap: { minHeight: "100vh", background: "#FFF5F5", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  loginCard: { background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 360, boxShadow: "0 4px 24px rgba(255,107,107,0.15)", textAlign: "center", border: "2px solid #FFE4E4" },
};
