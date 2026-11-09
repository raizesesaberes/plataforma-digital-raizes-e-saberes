import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Action, JourneyCard, journeyStyles as s } from "../components/JourneyKit";
import {
  getCrescerCalendarEvents,
  getCrescerNotificationCenter,
  type CrescerCalendarEvent,
  type CrescerNotificationCenterItem,
  type MobileSession,
} from "../services/library";

export type HostedStudentFeedProps = {
  session: MobileSession | null;
  kind: "agenda" | "notifications";
  detailToken?: string;
  onDetail?: (token: string) => void;
  onDetailBack?: () => void;
};
type FeedItem =
  | { kind: "agenda"; record: CrescerCalendarEvent }
  | { kind: "notifications"; record: CrescerNotificationCenterItem };
type FeedState =
  | { status: "loading" }
  | { status: "error"; forbidden: boolean }
  | { status: "ready"; items: FeedItem[]; generation: string };

/** Hosted only. Never resolves a detail through fixtures or a non-unique title. */
export function HostedStudentFeed({ session, kind, detailToken, onDetail, onDetailBack }: HostedStudentFeedProps) {
  if (!session) {
    return <JourneyCard><Text style={s.text}>Entre para consultar {kind === "agenda" ? "sua agenda" : "suas notificações"}.</Text></JourneyCard>;
  }
  // A credential/account change clears old data synchronously, before effects run.
  return <StudentFeed key={`${session.userId}:${session.accessToken}:${kind}`} session={session} kind={kind} detailToken={detailToken} onDetail={onDetail} onDetailBack={onDetailBack} />;
}

function StudentFeed({ session, kind, detailToken, onDetail, onDetailBack }: HostedStudentFeedProps & {session: MobileSession}) {
  const [state, setState] = useState<FeedState>({ status: "loading" });
  const [localToken, setLocalToken] = useState<string | undefined>();
  const token = onDetail ? detailToken : localToken;
  const selected = state.status === "ready" && token?.startsWith(state.generation + ":")
    ? state.items[Number(token.slice(state.generation.length + 1))] ?? null : null;
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLocalToken(undefined);
    setState({ status: "loading" });
    const request: Promise<FeedItem[]> = kind === "agenda"
      ? getCrescerCalendarEvents(session).then((rows) => rows.map((record) => ({ kind: "agenda" as const, record })))
      : getCrescerNotificationCenter(session).then((rows) => rows.map((record) => ({ kind: "notifications" as const, record })));
    void request.then((items) => {
      if (active) setState({ status: "ready", items, generation: crypto.randomUUID() });
    }).catch((error: unknown) => {
      if (active) setState({ status: "error", forbidden: error instanceof Error && /:(401|403)(:|$)/.test(error.message) });
    });
    return () => { active = false; };
  }, [session, kind, revision]);

  function refresh() {
    setLocalToken(undefined);
    setState({ status: "loading" });
    setRevision((value) => value + 1);
  }

  if (selected) {
    return (
      <JourneyCard>
        <Action title={kind === "agenda" ? "Voltar à agenda" : "Voltar às notificações"} onPress={() => onDetailBack ? onDetailBack() : setLocalToken(undefined)} />
        <Text accessibilityRole="header" style={s.title}>{selected.record.title}</Text>
        {selected.kind === "agenda" ? <>
          <Text style={s.muted}>{calendarDate(selected.record.eventDate)}{selected.record.startTime ? ` · ${selected.record.startTime}` : ""}{selected.record.endTime ? ` até ${selected.record.endTime}` : ""}</Text>
          <Text style={s.text}>{selected.record.description || "A escola não incluiu uma descrição."}</Text>
        </> : <>
          <Text style={s.muted}>{selected.record.origin} · {deliveryDate(selected.record.deliveredAt)}</Text>
          <Text style={s.text}>{selected.record.summary || "Esta notificação não inclui mais detalhes."}</Text>
          <Text style={s.muted}>A abertura nesta tela não altera o status de leitura no servidor.</Text>
        </>}
      </JourneyCard>
    );
  }

  return (
    <View>
      <JourneyCard>
        <Text accessibilityRole="header" style={s.title}>{kind === "agenda" ? "Minha agenda" : "Notificações"}</Text>
        <Text style={s.muted}>{kind === "agenda"
          ? "Compromissos dos últimos 7 dias e dos próximos 21 dias."
          : "Até 5 notificações disponibilizadas pela escola nos últimos 90 dias."}</Text>
        <Action title="Atualizar" disabled={state.status === "loading"} onPress={refresh} />
        <View accessibilityLiveRegion="polite">
          {state.status === "loading" ? <><ActivityIndicator accessibilityLabel="Carregando" /><Text style={s.text}>Carregando {kind === "agenda" ? "agenda" : "notificações"}...</Text></> : null}
          {state.status === "error" ? <>
            <Text style={s.error}>{state.forbidden ? "Não foi possível autorizar esta consulta. Confira seu acesso e vínculo com a escola." : "Não foi possível carregar os dados. Tente novamente."}</Text>
            <Action title="Tentar novamente" onPress={refresh} />
          </> : null}
          {state.status === "ready" && state.items.length === 0 ? <Text style={s.text}>{kind === "agenda" ? "Nenhum compromisso disponível neste período." : "Nenhuma notificação disponível neste período."}</Text> : null}
        </View>
      </JourneyCard>
      {state.status === "ready" ? state.items.map((item, index) => (
        <JourneyCard key={index}>
          <Text accessibilityRole="header" style={s.title}>{item.record.title}</Text>
          <Text style={s.muted}>{item.kind === "agenda" ? calendarDate(item.record.eventDate) : `${item.record.origin} · ${deliveryDate(item.record.deliveredAt)}`}</Text>
          {item.kind === "notifications" && item.record.unread ? <Text style={s.muted}>Não lida, conforme a última consulta</Text> : null}
          <Action title={`Ver detalhes: ${item.record.title}`} onPress={() => {const token = `${state.generation}:${index}`;if(onDetail)onDetail(token);else setLocalToken(token);}} />
        </JourneyCard>
      )) : null}
    </View>
  );
}

function calendarDate(value: string) {
  // Date-only strings are school calendar dates, not UTC instants.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || "Data não informada";
}
function deliveryDate(value: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleString("pt-BR");
}
