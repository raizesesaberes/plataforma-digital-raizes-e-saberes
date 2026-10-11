import React, { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { MobileSession } from "../services/library";
import {
  journeyApi,
  journeyGates,
  newRequestId,
  type Gates,
  type Inbox,
  type Notice,
  type Thread,
} from "../services/journeys";
import {
  Action,
  JourneyCard,
  OperationStatus,
  useOperation,
  journeyStyles as s,
} from "../components/JourneyKit";
const pendingReplies = new Map<
  string,
  {
    body: string;
    requestId: string;
    inFlight?: Promise<unknown>;
    confirmed?: boolean;
  }
>();
const replyListeners = new Map<string, Set<(body: string) => void>>();
const pendingEdits = new Map<
  string,
  {
    title: string;
    body: string;
    revision: number;
    requestId: string;
    confirmed?: boolean;
    confirmedRevision?: number;
    inFlight?: Promise<{ revision: number }>;
  }
>();
type Api = ReturnType<typeof journeyApi>;
type Sent = Awaited<ReturnType<Api["teacherNotices"]>>;
export function CommunicationJourney({
  session,
  teacher = false,
  gates = journeyGates,
}: {
  session: MobileSession | null;
  teacher?: boolean;
  gates?: Gates;
}) {
  if (!gates.replies && !gates.editing)
    return (
      <JourneyCard>
        <Text style={s.text}>Recados aguardando liberação do backend.</Text>
      </JourneyCard>
    );
  if (!session)
    return (
      <JourneyCard>
        <Text style={s.text}>Entre para consultar os recados.</Text>
      </JourneyCard>
    );
  return (
    <Messages
      key={session.userId + session.accessToken}
      session={session}
      teacher={teacher}
      gates={gates}
    />
  );
}
function Messages({
  session,
  teacher,
  gates,
}: {
  session: MobileSession;
  teacher: boolean;
  gates: Gates;
}) {
  const api = useMemo(() => journeyApi(session, gates), [session, gates]),
    op = useOperation();
  const [inbox, setInbox] = useState<Inbox[]>([]),
    [sent, setSent] = useState<Sent>([]),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState<{
      id: string;
      delivery: string | null;
    } | null>(null),
    [threads, setThreads] = useState<Awaited<ReturnType<Api["threads"]>>>([]),
    [delivery, setDelivery] = useState(""),
    [view, setView] = useState<"list" | "replies" | "notice">("list");
  async function reload() {
    setInbox([]);
    setSent([]);
    setThreads([]);
    setLoaded(false);
    if (teacher) {
      const rows = await api.teacherNotices();
      setSent(rows);
      if (selected && !rows.some((row) => row.id === selected.id)) {
        setView("list");
        setSelected(null);
        setDelivery("");
      }
    } else {
      const rows = await api.inbox();
      setInbox(rows);
      if (
        selected &&
        !rows.some((row) => row.delivery_id === selected.delivery)
      ) {
        setView("list");
        setSelected(null);
        setDelivery("");
      }
    }
    setLoaded(true);
  }
  useEffect(() => {
    void op.run(reload);
  }, [api, teacher]);
  return (
    <View>
      <JourneyCard>
        <Text style={s.title}>Recados e respostas</Text>
        <OperationStatus {...op} />
        <Action
          title="Atualizar recados"
          disabled={op.busy}
          onPress={() => void op.run(reload)}
        />
        {!gates.replies || !gates.editing ? (
          <Text style={s.muted}>
            Algumas ações aguardam liberação do backend. Sem versões
            habilitadas, a leitura indicada é histórica.
          </Text>
        ) : null}
        {loaded && (teacher ? sent : inbox).length === 0 ? (
          <Text style={s.text}>Nenhum recado disponível.</Text>
        ) : null}
        {!teacher ? (
          <Text style={s.muted}>
            {inbox.filter((x) => !x.read_at).length}{" "}
            {gates.editing
              ? "não lido(s) nesta lista"
              : "sem leitura histórica nesta lista"}
          </Text>
        ) : null}
        {teacher
          ? sent.map((item) => (
              <JourneyCard key={item.id}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.text}>{item.body}</Text>
                <Text style={s.muted}>
                  Entregues: {item.delivered} · Leituras{" "}
                  {gates.editing ? `da versão ${item.revision}` : "históricas"}:{" "}
                  {item.read ?? "Indisponível"}
                </Text>
                {!item.source_type ? (
                  <>
                    {gates.replies ? (
                      <Action
                        title={`Conversas: ${item.title}`}
                        disabled={op.busy}
                        onPress={() =>
                          void op.run(async () => {
                            setSelected({ id: item.id, delivery: null });
                            setDelivery("");
                            setThreads(await api.threads(item.id));
                            setView("replies");
                          })
                        }
                      />
                    ) : null}
                    {gates.editing ? (
                      <Action
                        title={`Editar / Versões: ${item.title}`}
                        disabled={op.busy}
                        onPress={() => {
                          setSelected({ id: item.id, delivery: null });
                          setView("notice");
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </JourneyCard>
            ))
          : inbox.map((item) => (
              <JourneyCard key={item.delivery_id}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.text}>{item.body}</Text>
                {item.child_name ? (
                  <Text style={s.muted}>Aluno: {item.child_name}</Text>
                ) : null}
                <Text style={s.muted}>
                  {item.read_at ? "Lido" : "Não lido"}
                  {gates.editing
                    ? ` · versão ${item.revision || 1}`
                    : " · registro histórico"}
                </Text>
                {!item.source_type ? (
                  <>
                    {gates.replies ? (
                      <Action
                        title={`Responder: ${item.title}`}
                        disabled={op.busy}
                        onPress={() => {
                          setSelected({
                            id: item.communication_id,
                            delivery: item.delivery_id,
                          });
                          setDelivery(item.delivery_id);
                          setView("replies");
                        }}
                      />
                    ) : null}
                    {gates.editing ? (
                      <Action
                        title={`Versão / Leitura: ${item.title}`}
                        disabled={op.busy}
                        onPress={() => {
                          setSelected({
                            id: item.communication_id,
                            delivery: item.delivery_id,
                          });
                          setView("notice");
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </JourneyCard>
            ))}
      </JourneyCard>
      {view !== "list" ? (
        <Action
          title="Fechar conversa"
          onPress={() => {
            setView("list");
            setDelivery("");
            void op.run(reload);
          }}
        />
      ) : null}
      {view === "replies" && teacher && !delivery ? (
        <JourneyCard>
          {threads.length === 0 ? (
            <Text style={s.text}>Nenhum destinatário disponível.</Text>
          ) : (
            threads.map((t) => (
              <Action
                key={t.delivery_id}
                title={`${t.recipient_name}${t.student_name ? ` · Aluno: ${t.student_name}` : ""} · ${t.reply_count} resposta(s)`}
                onPress={() => setDelivery(t.delivery_id)}
              />
            ))
          )}
        </JourneyCard>
      ) : null}
      {view === "replies" && delivery ? (
        <ReplyPanel
          key={delivery}
          api={api}
          actor={session.userId}
          delivery={delivery}
          onDenied={() => {
            setInbox((rows) =>
              rows.filter((row) => row.delivery_id !== delivery),
            );
            setThreads((rows) =>
              rows.filter((row) => row.delivery_id !== delivery),
            );
          }}
        />
      ) : null}
      {view === "notice" && selected ? (
        <NoticePanel
          key={`${selected.id}:${selected.delivery}`}
          api={api}
          actor={session.userId}
          id={selected.id}
          delivery={selected.delivery}
          onChanged={reload}
          onDenied={() => {
            setInbox((rows) =>
              rows.filter((row) => row.delivery_id !== selected.delivery),
            );
            setSent((rows) => rows.filter((row) => row.id !== selected.id));
          }}
        />
      ) : null}
    </View>
  );
}
function ReplyPanel({
  api,
  actor,
  delivery,
  onDenied,
}: {
  api: Api;
  actor: string;
  delivery: string;
  onDenied: () => void;
}) {
  const op = useOperation(),
    key = `${actor}:${delivery}`;
  const [thread, setThread] = useState<Thread | null>(null),
    [text, setText] = useState(() =>
      pendingReplies.get(key)?.confirmed
        ? ""
        : pendingReplies.get(key)?.body || "",
    );
  useEffect(() => {
    const listener = (body: string) =>
      setText((current) => (current.trim() === body ? "" : current));
    const listeners =
      replyListeners.get(key) || new Set<(body: string) => void>();
    listeners.add(listener);
    replyListeners.set(key, listeners);
    return () => {
      listeners.delete(listener);
      if (!listeners.size) replyListeners.delete(key);
    };
  }, [key]);
  async function refreshThread() {
    setThread(null);
    try {
      setThread(await api.thread(delivery));
    } catch (error) {
      if (error instanceof Error && /:403(?::|$)/.test(error.message))
        onDenied();
      throw error;
    }
  }
  useEffect(() => {
    void op.run(refreshThread);
  }, [api, delivery]);
  return (
    <JourneyCard>
      <Text style={s.title}>Respostas</Text>
      <OperationStatus {...op} />
      <Text style={s.muted}>
        Visíveis ao destinatário, ao autor autorizado e à gestão escolar, de
        rede ou administradores com permissão.
      </Text>
      {thread ? (
        <>
          <Text style={s.text}>{thread.title}</Text>
          {thread.messages.length === 0 ? (
            <Text style={s.muted}>Nenhuma resposta ainda.</Text>
          ) : (
            thread.messages.map((m) => (
              <Text key={m.id} style={s.text}>
                {m.own ? "Você" : m.author_name}: {m.body}
              </Text>
            ))
          )}
          <TextInput
            style={s.input}
            accessibilityLabel="Sua resposta"
            multiline
            value={text}
            editable={!op.busy}
            maxLength={1000}
            onChangeText={(value) => {
              if (pendingReplies.get(key)?.confirmed)
                pendingReplies.delete(key);
              setText(value);
            }}
          />
          <Action
            title="Enviar resposta"
            disabled={op.busy || !text.trim()}
            onPress={() =>
              void op.run(async () => {
                let draft = pendingReplies.get(key);
                if (!draft || draft.body !== text.trim())
                  draft = { body: text.trim(), requestId: newRequestId() };
                pendingReplies.set(key, draft);
                if (!draft.confirmed) {
                  draft.inFlight ||= api.reply(
                    delivery,
                    draft.body,
                    draft.requestId,
                  );
                  try {
                    await draft.inFlight;
                    draft.confirmed = true;
                  } finally {
                    draft.inFlight = undefined;
                  }
                }
                for (const listener of replyListeners.get(key) || [])
                  listener(draft.body);
                setText((current) =>
                  current.trim() === draft.body ? "" : current,
                );
                op.setMessage("Resposta confirmada no servidor.");
                try {
                  await refreshThread();
                } catch {
                  op.setMessage(
                    "Resposta confirmada no servidor. Não foi possível atualizar a conversa; tente Atualizar conversa.",
                  );
                }
              })
            }
          />
        </>
      ) : null}
      <Action
        title="Atualizar conversa"
        disabled={op.busy}
        onPress={() => void op.run(refreshThread)}
      />
    </JourneyCard>
  );
}
function NoticePanel({
  api,
  actor,
  id,
  delivery,
  onChanged,
  onDenied,
}: {
  api: Api;
  actor: string;
  id: string;
  delivery: string | null;
  onChanged: () => Promise<void>;
  onDenied: () => void;
}) {
  const op = useOperation(),
    key = `${actor}:${id}`;
  const [notice, setNotice] = useState<Notice | null>(null),
    [title, setTitle] = useState(""),
    [body, setBody] = useState("");
  async function load() {
    setNotice(null);
    let n: Notice;
    try {
      n = await api.notice(id, delivery);
    } catch (error) {
      if (error instanceof Error && /:403(?::|$)/.test(error.message))
        onDenied();
      throw error;
    }
    setNotice(n);
    const saved = pendingEdits.get(key);
    const pending = saved?.confirmed ? undefined : saved;
    setTitle(pending?.title ?? n.title);
    setBody(pending?.body ?? n.body);
  }
  useEffect(() => {
    void op.run(load);
  }, [api, id, delivery]);
  return (
    <JourneyCard>
      <Text style={s.title}>Versões do recado</Text>
      <OperationStatus {...op} />
      <Action
        title="Atualizar versão (descartar rascunho)"
        disabled={op.busy}
        onPress={() =>
          void op.run(async () => {
            pendingEdits.delete(key);
            await load();
          })
        }
      />
      {notice ? (
        <>
          <Text style={s.text}>
            Versão {notice.revision}: {notice.title}
          </Text>
          <Text style={s.text}>{notice.body}</Text>
          <Text style={s.muted}>
            Leituras antigas não confirmam a leitura desta versão.
          </Text>
          {delivery ? (
            <Action
              title={
                notice.current_revision_read_at
                  ? "Esta versão já foi lida"
                  : "Confirmar leitura desta versão"
              }
              disabled={op.busy || Boolean(notice.current_revision_read_at)}
              onPress={() =>
                void op.run(async () => {
                  await api.read(delivery, notice.revision);
                  await load();
                  await onChanged();
                  op.setMessage("Leitura confirmada no servidor.");
                })
              }
            />
          ) : null}
          {notice.can_edit ? (
            <>
              <Text style={s.muted}>
                Leituras da versão atual:{" "}
                {notice.current_revision_read_count ?? 0}
              </Text>
              <TextInput
                style={s.input}
                accessibilityLabel="Título do recado"
                value={title}
                onChangeText={setTitle}
                editable={!op.busy}
                maxLength={160}
              />
              <TextInput
                style={s.input}
                accessibilityLabel="Texto do recado"
                value={body}
                onChangeText={setBody}
                editable={!op.busy}
                multiline
                maxLength={700}
              />
              <Action
                title="Salvar nova versão"
                disabled={op.busy || !title.trim() || !body.trim()}
                onPress={() =>
                  void op.run(async () => {
                    let draft = pendingEdits.get(key);
                    if (
                      !draft ||
                      draft.title !== title.trim() ||
                      draft.body !== body.trim() ||
                      (draft.confirmed &&
                        draft.confirmedRevision !== notice.revision)
                    )
                      draft = {
                        title: title.trim(),
                        body: body.trim(),
                        revision: notice.revision,
                        requestId: newRequestId(),
                      };
                    pendingEdits.set(key, draft);
                    if (!draft.confirmed) {
                      draft.inFlight ||= api.edit(
                        id,
                        draft.revision,
                        draft.title,
                        draft.body,
                        draft.requestId,
                      );
                      try {
                        const receipt = await draft.inFlight;
                        draft.confirmedRevision = receipt.revision;
                        draft.confirmed = true;
                      } finally {
                        draft.inFlight = undefined;
                      }
                    }
                    op.setMessage("Nova versão confirmada no servidor.");
                    try {
                      await load();
                      await onChanged();
                    } catch {
                      op.setMessage(
                        "Nova versão confirmada no servidor. Não foi possível atualizar os recados; tente atualizar.",
                      );
                    }
                  })
                }
              />
            </>
          ) : null}
          <Text style={s.title}>Histórico</Text>
          {notice.history.map((v) => (
            <View key={v.revision}>
              <Text style={s.text}>
                Versão {v.revision}: {v.title}
              </Text>
              <Text style={s.text}>{v.body}</Text>
            </View>
          ))}
        </>
      ) : null}
    </JourneyCard>
  );
}
