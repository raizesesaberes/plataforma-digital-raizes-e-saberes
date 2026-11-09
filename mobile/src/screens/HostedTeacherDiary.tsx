import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Action, JourneyCard, journeyStyles as s } from "../components/JourneyKit";
import { getTeacherMobileClasses, type MobileSession, type TeacherMobileClass } from "../services/library";
import { createHostedDiary, DiaryError, type DiaryDraft, type DiaryEntry } from "../services/hostedDiary";

export type HostedTeacherDiaryProps = {
  session: MobileSession | null;
  registerLeaveGuard: (guard: (() => boolean) | null) => void;
};
const emptyDraft = (): DiaryDraft => ({ title: "Diário de Classe", taughtContent: "", pedagogicalNotes: "" });
const asDraft = (entry: DiaryEntry | null): DiaryDraft => entry ? ({ title: entry.title, taughtContent: entry.taughtContent, pedagogicalNotes: entry.pedagogicalNotes }) : emptyDraft();
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function validDate(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const d = new Date(`${value}T12:00:00Z`); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value; }

export function HostedTeacherDiary({ session, registerLeaveGuard }: HostedTeacherDiaryProps) {
  if (!session) return <JourneyCard><Text style={s.text}>Entre para consultar o diário.</Text></JourneyCard>;
  return <DiaryWorkspace key={`${session.userId}:${session.accessToken}`} session={session} registerLeaveGuard={registerLeaveGuard} />;
}
function DiaryWorkspace({ session, registerLeaveGuard }: { session: MobileSession; registerLeaveGuard: HostedTeacherDiaryProps["registerLeaveGuard"] }) {
  const [classes, setClasses] = useState<TeacherMobileClass[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(today);
  const [dateInput, setDateInput] = useState(date);
  const [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");
  const leave = useRef<(() => boolean) | null>(null);
  const register = useCallback((guard: (() => boolean) | null) => { leave.current = guard; registerLeaveGuard(guard); }, [registerLeaveGuard]);
  useEffect(() => {
    let active = true;
    setLoading(true); setFailed(false); setClasses([]); setClassId("");
    void getTeacherMobileClasses(session).then((rows) => { if (active) { setClasses(rows); setClassId(rows[0]?.id || ""); } })
      .catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, refresh]);
  function canSwitch() {
    if (leave.current && !leave.current()) { setMessage("Salve ou descarte as alterações no diário antes de mudar de turma ou data."); return false; }
    setMessage(""); return true;
  }
  const selected = classes.find((c) => c.id === classId);
  return <View>
    <JourneyCard>
      <Text accessibilityRole="header" style={s.title}>Diário de Classe</Text>
      <Text style={s.muted}>Consulte um dia e salve o registro como rascunho.</Text>
      {loading ? <Text accessibilityLiveRegion="polite" style={s.text}>Carregando suas turmas...</Text> : null}
      {failed ? <><Text style={s.error}>Não foi possível consultar suas turmas.</Text><Action title="Tentar novamente" onPress={() => setRefresh((n) => n + 1)} /></> : null}
      {!loading && !failed && !classes.length ? <Text style={s.text}>Nenhuma turma vinculada disponível.</Text> : null}
      {classes.map((c) => <Action key={c.id} title={`${c.id === classId ? "Selecionada: " : "Selecionar: "}${c.name}`} onPress={() => { if (c.id !== classId && canSwitch()) setClassId(c.id); }} />)}
      <Text style={s.text}>Data do diário (AAAA-MM-DD)</Text>
      <TextInput accessibilityLabel="Data do diário, formato ano mês dia" style={s.input} value={dateInput} onChangeText={setDateInput} maxLength={10} />
      <Action title="Consultar data" onPress={() => { if (!validDate(dateInput)) { setMessage("Informe uma data válida no formato AAAA-MM-DD."); return; } if (dateInput !== date && canSwitch()) setDate(dateInput); }} />
      {message ? <Text accessibilityLiveRegion="polite" style={s.error}>{message}</Text> : null}
    </JourneyCard>
    {selected ? <DiaryEditor key={`${selected.schoolId}:${selected.id}:${date}`} session={session} schoolClass={selected} date={date} register={register} /> : null}
  </View>;
}
function DiaryEditor({ session, schoolClass, date, register }: { session: MobileSession; schoolClass: TeacherMobileClass; date: string; register: HostedTeacherDiaryProps["registerLeaveGuard"] }) {
  const mounted = useRef(true), lock = useRef(false);
  const [entry, setEntry] = useState<DiaryEntry | null>(null), [draft, setDraft] = useState<DiaryDraft>(emptyDraft);
  const [baseline, setBaseline] = useState<DiaryDraft>(emptyDraft);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [reviewRequired, setReviewRequired] = useState(false);
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const dirty = draft.title !== baseline.title || draft.taughtContent !== baseline.taughtContent || draft.pedagogicalNotes !== baseline.pedagogicalNotes;
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const api = useMemo(() => createHostedDiary(session, { schoolId: schoolClass.schoolId, classId: schoolClass.id, date }, () => mounted.current), [session, schoolClass.schoolId, schoolClass.id, date]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    register(() => {
      if (!lock.current && !dirtyRef.current) return true;
      setError(lock.current ? "Aguarde a consulta ou gravação terminar antes de sair." : "Há alterações não salvas. Salve ou use Descartar alterações e permitir saída.");
      return false;
    });
    return () => register(null);
  }, [register]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!lock.current && !dirtyRef.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  function accept(record: DiaryEntry | null) { const values = asDraft(record); setEntry(record); setDraft(values); setBaseline(values); setReady(true); setReviewRequired(false); }
  async function load() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(""); setError("");
    try { const result = await api.load(); if (mounted.current) accept(result); }
    catch { if (mounted.current) { setReady(false); setError("Não foi possível consultar o diário. Nenhuma gravação foi confirmada."); } }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  useEffect(() => { void load(); }, [api]);
  async function save() {
    if (lock.current || !ready || reviewRequired || entry?.status === "closed") return;
    lock.current = true; setBusy(true); setMessage(""); setError("");
    try { const result = await api.saveDraft(entry, draft); if (mounted.current) { accept(result); setMessage("Rascunho salvo no servidor e conferido."); } }
    catch (e) {
      if (mounted.current) {
        setReviewRequired(true);
        setError(e instanceof DiaryError && e.code === "conflict" ? "O diário mudou. Recarregue e confira a versão atual antes de tentar salvar novamente." : "Não foi possível confirmar a gravação. Recarregue para conferir o diário antes de tentar novamente.");
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  const editable = ready && !busy && !reviewRequired && entry?.status !== "closed";
  return <JourneyCard>
    <Text accessibilityRole="header" style={s.title}>{schoolClass.name} · {date}</Text>
    <View accessibilityLiveRegion="polite">
      {busy ? <Text style={s.text}>Consultando ou salvando o diário...</Text> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}
      {message ? <Text style={s.text}>{message}</Text> : null}
    </View>
    {ready ? <>
      <Text style={s.muted}>{entry ? entry.status === "closed" ? "Diário fechado · somente consulta" : "Rascunho existente" : "Nenhum registro para este dia. Você pode criar um rascunho."}</Text>
      {entry ? <Text style={s.muted}>Atividades vinculadas: {entry.activityLinkCount}. Os vínculos com atividades, planejamento e agenda serão preservados.</Text> : null}
      <Text style={s.text}>Título</Text><TextInput accessibilityLabel="Título do diário" editable={editable} style={s.input} value={draft.title} onChangeText={(title) => setDraft((d) => ({ ...d, title }))} />
      <Text style={s.text}>Conteúdo trabalhado</Text><TextInput accessibilityLabel="Conteúdo trabalhado" editable={editable} multiline style={s.input} value={draft.taughtContent} onChangeText={(taughtContent) => setDraft((d) => ({ ...d, taughtContent }))} />
      <Text style={s.text}>Registro pedagógico</Text><TextInput accessibilityLabel="Registro pedagógico" editable={editable} multiline style={s.input} value={draft.pedagogicalNotes} onChangeText={(pedagogicalNotes) => setDraft((d) => ({ ...d, pedagogicalNotes }))} />
      <Action title="Salvar rascunho" disabled={!editable || (!dirty && Boolean(entry))} onPress={() => void save()} />
      {dirty ? <Text style={s.muted}>Há alterações não salvas. Salve ou descarte antes de sair.</Text> : null}
      <Text style={s.muted}>O fechamento do diário ainda não está disponível neste aplicativo. Salvar mantém o registro como rascunho.</Text>
    </> : null}
    <Action title={dirty ? "Descartar alterações e recarregar" : "Recarregar diário"} disabled={busy} onPress={() => void load()} />
    {dirty ? <Action title="Descartar alterações e permitir saída" disabled={busy} onPress={() => { setDraft({ ...baseline }); setMessage(""); }} /> : null}
  </JourneyCard>;
}
