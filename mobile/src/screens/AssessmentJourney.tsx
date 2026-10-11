import React, { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import {
  getTeacherMobileClasses,
  type MobileSession,
  type TeacherMobileClass,
} from "../services/library";
import {
  journeyApi,
  journeyGates,
  latestAttempt,
  finished,
  type Gates,
  type StudentWork,
  type Published,
  type Results,
} from "../services/journeys";
import {
  Action,
  JourneyCard,
  OperationStatus,
  useOperation,
  journeyStyles as s,
} from "../components/JourneyKit";
export function AssessmentJourney({
  session,
  teacher = false,
  gates = journeyGates,
}: {
  session: MobileSession | null;
  teacher?: boolean;
  gates?: Gates;
}) {
  if (!session)
    return (
      <JourneyCard>
        <Text style={s.text}>Entre para acessar suas avaliações.</Text>
      </JourneyCard>
    );
  if (!gates.assessments)
    return (
      <JourneyCard>
        <Text style={s.title}>Avalia+</Text>
        <Text style={s.text}>
          Jornada de avaliações aguardando liberação do backend.
        </Text>
      </JourneyCard>
    );
  return teacher ? (
    <TeacherAssessments
      key={session.userId + session.accessToken}
      session={session}
      gates={gates}
    />
  ) : (
    <StudentAssessments
      key={session.userId + session.accessToken}
      session={session}
      gates={gates}
    />
  );
}
function TeacherAssessments({
  session,
  gates,
}: {
  session: MobileSession;
  gates: Gates;
}) {
  const api = useMemo(() => journeyApi(session, gates), [session, gates]),
    op = useOperation();
  const [classes, setClasses] = useState<TeacherMobileClass[]>([]),
    [classId, setClassId] = useState(""),
    [questions, setQuestions] = useState<
      { question_item_id: string; title: string }[]
    >([]),
    [selected, setSelected] = useState<string[]>([]),
    [title, setTitle] = useState(""),
    [drafts, setDrafts] = useState<{ id: string; title: string }[]>([]),
    [draftId, setDraftId] = useState(""),
    [assignments, setAssignments] = useState<Published[]>([]),
    [resultId, setResultId] = useState(""),
    [results, setResults] = useState<Results | null>(null),
    [loaded, setLoaded] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const schoolClass = classes.find((c) => c.id === classId);
  async function reload() {
    const [c, a, d] = await Promise.all([
      getTeacherMobileClasses(session),
      api.published(),
      api.drafts(),
    ]);
    setClasses(c);
    setAssignments(a);
    setDrafts(d);
    setLoaded(true);
    if (resultId) setResults(await api.results(resultId));
  }
  useEffect(() => {
    void op.run(reload);
  }, [api]);
  async function choose(c: TeacherMobileClass) {
    setClassId(c.id);
    setSelected([]);
    setQuestions([]);
    const data = await api.questions(c.schoolId, c.id);
    if (data.status !== "PASS") throw new Error("content_unavailable");
    setQuestions(data.items);
  }
  return (
    <View>
      <JourneyCard>
        <Text style={s.title}>Avalia+ · Professor</Text>
        <OperationStatus {...op} />
        <Action
          title="Atualizar avaliações"
          disabled={op.busy}
          onPress={() => void op.run(reload)}
        />
        {loaded && classes.length === 0 ? (
          <Text style={s.text}>Nenhuma turma vinculada.</Text>
        ) : null}
        {classes.map((c) => (
          <Action
            key={c.id}
            title={`${c.id === classId ? "✓ " : ""}Turma: ${c.name}`}
            disabled={op.busy}
            onPress={() => void op.run(() => choose(c))}
          />
        ))}
        {schoolClass ? (
          <>
            <Text style={s.muted}>
              Conteúdo autorizado para {schoolClass.name}
            </Text>
            {questions.length === 0 && !op.busy ? (
              <Text style={s.text}>
                Nenhuma questão disponível para esta turma.
              </Text>
            ) : null}
            {questions.map((q) => (
              <Action
                key={q.question_item_id}
                title={`${selected.includes(q.question_item_id) ? "✓ " : ""}${q.title || "Questão"}`}
                disabled={op.busy}
                onPress={() =>
                  setSelected((ids) =>
                    ids.includes(q.question_item_id)
                      ? ids.filter((id) => id !== q.question_item_id)
                      : [...ids, q.question_item_id],
                  )
                }
              />
            ))}
            <TextInput
              style={s.input}
              accessibilityLabel="Título da avaliação"
              value={title}
              onChangeText={setTitle}
              maxLength={160}
            />
            <Action
              title="Montar avaliação"
              disabled={
                op.busy || !title.trim() || !selected.length || uncertain
              }
              onPress={() =>
                void op.run(async () => {
                  try {
                    const result = await api.assemble(
                      schoolClass.schoolId,
                      classId,
                      title.trim(),
                      selected,
                    );
                    setDraftId(result.assessment.id);
                    op.setMessage(
                      "Avaliação salva no servidor. Selecione Publicar para enviar à turma.",
                    );
                  } catch (e) {
                    setUncertain(true);
                    throw e;
                  } finally {
                    setDrafts(await api.drafts());
                  }
                })
              }
            />
            {uncertain ? (
              <Text style={s.muted}>
                Confirmação de montagem indisponível. Confira as avaliações
                salvas antes de continuar.
              </Text>
            ) : null}
          </>
        ) : null}
        {drafts.map((d) => (
          <Action
            key={d.id}
            title={`${draftId === d.id ? "✓ " : ""}Avaliação salva: ${d.title}`}
            disabled={op.busy}
            onPress={() => {
              setDraftId(d.id);
              setUncertain(false);
            }}
          />
        ))}
        <Action
          title="Publicar na turma selecionada"
          disabled={op.busy || !draftId || !classId}
          onPress={() =>
            void op.run(async () => {
              const publication = await api.publish(draftId, classId);
              await reload();
              setResultId(publication.id);
              setResults(await api.results(publication.id));
              op.setMessage("Publicação confirmada no servidor.");
            })
          }
        />
      </JourneyCard>
      <JourneyCard>
        <Text style={s.title}>Aplicações e resultados</Text>
        {loaded && assignments.length === 0 ? (
          <Text style={s.text}>Nenhuma aplicação publicada.</Text>
        ) : null}
        {assignments.map((a) => (
          <Action
            key={a.id}
            title={`Resultados: ${drafts.find((d) => d.id === a.assessment_id)?.title || "Avaliação"} · ${classes.find((c) => c.id === a.class_id)?.name || "Turma"}`}
            disabled={op.busy}
            onPress={() =>
              void op.run(async () => {
                setResults(null);
                setResultId(a.id);
                setResults(await api.results(a.id));
              })
            }
          />
        ))}
        {results ? (
          <>
            <Text style={s.text}>
              Entregas: {results.summary.completed_students}/
              {results.summary.assigned_students}
            </Text>
            <Text style={s.text}>
              {results.summary.completed_students
                ? results.summary.average_percentage === null
                  ? "Aguardando correção."
                  : `Média: ${results.summary.average_percentage}%`
                : "Aguardando entregas."}
            </Text>
            {results.students.map((st) => (
              <Text key={st.student_id} style={s.text}>
                {st.student_name}:{" "}
                {st.score_percentage === null
                  ? "Sem nota"
                  : `${st.score_percentage}%`}{" "}
                · {st.status}
              </Text>
            ))}
          </>
        ) : null}
      </JourneyCard>
    </View>
  );
}
function StudentAssessments({
  session,
  gates,
}: {
  session: MobileSession;
  gates: Gates;
}) {
  const api = useMemo(() => journeyApi(session, gates), [session, gates]),
    op = useOperation();
  const [work, setWork] = useState<StudentWork>({
      assignments: [],
      attempts: [],
    }),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState(""),
    [token, setToken] = useState(""),
    [drafts, setDrafts] = useState<Record<string, string>>({});
  async function reload() {
    setWork(await api.work());
    setLoaded(true);
  }
  useEffect(() => {
    void op.run(reload);
  }, [api]);
  const assignment = work.assignments.find((a) => a.id === selected),
    attempt = latestAttempt(work, selected);
  const hasUnsaved = assignment?.assessment.questions.some(
    (q) =>
      q.question.alternatives.length === 0 &&
      drafts[q.question_id] !== undefined &&
      drafts[q.question_id] !==
        attempt?.responses.find((r) => r.question_id === q.question_id)
          ?.response_text,
  );
  return (
    <View>
      <JourneyCard>
        <Text style={s.title}>Avalia+</Text>
        <OperationStatus {...op} />
        <Action
          title="Atualizar avaliações"
          disabled={op.busy}
          onPress={() => void op.run(reload)}
        />
        {loaded && work.assignments.length === 0 ? (
          <Text style={s.text}>Sem avaliações disponíveis no momento.</Text>
        ) : null}
        {work.assignments.map((a) => (
          <Action
            key={a.id}
            title={`Abrir: ${a.assessment.title}`}
            disabled={op.busy}
            onPress={() => {
              setSelected(a.id);
              setDrafts({});
              setToken("");
            }}
          />
        ))}
      </JourneyCard>
      {assignment ? (
        <JourneyCard>
          <Text style={s.title}>{assignment.assessment.title}</Text>
          {!attempt ? (
            <>
              {assignment.token_required ? (
                <TextInput
                  style={s.input}
                  accessibilityLabel="Código da aplicação"
                  value={token}
                  onChangeText={setToken}
                />
              ) : null}
              <Action
                title="Iniciar avaliação"
                disabled={
                  op.busy || (assignment.token_required && !token.trim())
                }
                onPress={() =>
                  void op.run(async () => {
                    await api.start(assignment.id, token.trim());
                    await reload();
                  })
                }
              />
            </>
          ) : finished(attempt) ? (
            <Text style={s.text}>
              {attempt.score_percentage === null
                ? "Entregue. Aguardando correção."
                : `Resultado: ${attempt.score_percentage}%`}
            </Text>
          ) : attempt.status !== "in_progress" ? (
            <Text style={s.text}>
              Tentativa {attempt.status}. Solicite orientação ao professor.
            </Text>
          ) : (
            <>
              {attempt.deadline_at ? (
                <Text style={s.muted}>
                  Prazo: {new Date(attempt.deadline_at).toLocaleString()}
                </Text>
              ) : null}
              {assignment.assessment.questions.map((q, i) => {
                const response = attempt.responses.find(
                  (r) => r.question_id === q.question_id,
                );
                return (
                  <View key={q.question_id} style={s.row}>
                    <Text style={s.title}>Questão {i + 1}</Text>
                    {q.question.base_text ? (
                      <Text style={s.text}>{q.question.base_text}</Text>
                    ) : null}
                    <Text style={s.text}>{q.question.statement}</Text>
                    {q.question.alternatives.length ? (
                      q.question.alternatives.map((a) => (
                        <Action
                          key={a.id}
                          title={`${response?.selected_alternative_id === a.id ? "✓ " : ""}${a.label}: ${a.body}`}
                          disabled={op.busy}
                          onPress={() =>
                            void op.run(async () => {
                              await api.save(
                                attempt,
                                q.question_id,
                                a.id,
                                null,
                              );
                              await reload();
                              op.setMessage("Resposta salva no servidor.");
                            })
                          }
                        />
                      ))
                    ) : (
                      <>
                        <TextInput
                          multiline
                          style={s.input}
                          accessibilityLabel={`Resposta da questão ${i + 1}`}
                          value={
                            drafts[q.question_id] ??
                            response?.response_text ??
                            ""
                          }
                          onChangeText={(text) =>
                            setDrafts((d) => ({ ...d, [q.question_id]: text }))
                          }
                        />
                        <Action
                          title={`Salvar resposta ${i + 1}`}
                          disabled={
                            op.busy ||
                            !(
                              drafts[q.question_id] ??
                              response?.response_text ??
                              ""
                            ).trim()
                          }
                          onPress={() =>
                            void op.run(async () => {
                              const savedDraft =
                                drafts[q.question_id] ??
                                response?.response_text ??
                                "";
                              await api.save(
                                attempt,
                                q.question_id,
                                null,
                                savedDraft.trim(),
                              );
                              setDrafts((d) => {
                                if (d[q.question_id] !== savedDraft) return d;
                                const next = { ...d };
                                delete next[q.question_id];
                                return next;
                              });
                              await reload();
                              op.setMessage("Resposta salva no servidor.");
                            })
                          }
                        />
                      </>
                    )}
                  </View>
                );
              })}
              {hasUnsaved ? (
                <Text style={s.muted}>
                  Salve as respostas alteradas antes de entregar.
                </Text>
              ) : null}
              <Action
                title="Entregar avaliação"
                disabled={
                  op.busy ||
                  hasUnsaved ||
                  assignment.assessment.questions.some(
                    (q) =>
                      !attempt.responses.some(
                        (r) => r.question_id === q.question_id,
                      ),
                  )
                }
                onPress={() =>
                  void op.run(async () => {
                    await api.submit(attempt.id);
                    await reload();
                    op.setMessage("Entrega confirmada no servidor.");
                  })
                }
              />
            </>
          )}
        </JourneyCard>
      ) : null}
    </View>
  );
}
