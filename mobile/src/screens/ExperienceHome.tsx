import React, { useEffect, useState } from "react";
import { AppIcon as Feather } from "../components/AppIcon";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { AppProfile, IconName, ModuleKey } from "../data/fixtures";
import { getCrescerStudentProfile, getStudentProfile, getTeacherHomeSummary, getTeacherMobileClasses, type MobileSession } from "../services/library";

type Props = { profile: AppProfile; session: MobileSession | null; onOpen: (key: ModuleKey) => void; onLogout: () => void; preview?: boolean; hosted?: boolean };
type Identity = { name: string; school: string; detail: string; classes?: number };
type Shortcut = { key: ModuleKey; label: string; body: string; icon: IconName; color: string };
const palette = { ink: "#174D3E", muted: "#687565", paper: "#FAF7ED", green: "#174D3E", cream: "#FFFDF7", gold: "#F4D690", line: "#E1E5D6" };
const missionKey = "mission" as ModuleKey;
const coloringKey = "coloring" as ModuleKey;
const demo: Record<AppProfile["role"], Identity> = {
  crescer: { name: "Lia", school: "Escola de demonstração", detail: "Infantil 4 anos · perfil fictício" },
  fundamental: { name: "Alex", school: "Escola de demonstração", detail: "6º ano de demonstração · perfil fictício" },
  professor: { name: "Professora Ana", school: "Escola de demonstração", detail: "Infantil 4 e 6º ano · turmas fictícias", classes: 2 }
};
const shortcuts: Record<AppProfile["role"], Shortcut[]> = {
  crescer: [
    { key: coloringKey, label: "Colorir", body: "Um mundo de cores", icon: "edit-3", color: "#F7DCA1" },
    { key: "games", label: "Jogos", body: "Brincar e descobrir", icon: "grid", color: "#DCD9EF" },
    { key: "library", label: "Biblioteca", body: "Histórias para imaginar", icon: "book-open", color: "#CBE4EA" },
    { key: "activities", label: "Atividades", body: "Aprender do seu jeito", icon: "sun", color: "#D9E7BF" },
    { key: "discoveries", label: "Descobertas", body: "Explorar coisas novas", icon: "compass", color: "#F0D7CE" }
  ],
  fundamental: [
    { key: "activities", label: "Atividades", body: "Seu próximo desafio", icon: "check-square", color: "#D9E7BF" },
    { key: "games", label: "Jogos", body: "Praticar com estratégia", icon: "grid", color: "#DCD9EF" },
    { key: "library", label: "Biblioteca", body: "Conhecimento ao alcance", icon: "book-open", color: "#CBE4EA" },
    { key: "avalia", label: "Avalia+", body: "Avaliações e resultados", icon: "bar-chart-2", color: "#F7DCA1" },
    { key: "agenda", label: "Agenda", body: "Organize sua semana", icon: "calendar", color: "#F0D7CE" }
  ],
  professor: [
    { key: "classes", label: "Minhas turmas", body: "Cada aluno, uma história", icon: "users", color: "#D9E7BF" },
    { key: "diary", label: "Diário de Classe", body: "Registre a aprendizagem", icon: "edit-3", color: "#F7DCA1" },
    { key: "avalia", label: "Avalia+", body: "Avaliar para acompanhar", icon: "bar-chart-2", color: "#CBE4EA" },
    { key: "communication", label: "Comunicação", body: "Mantenha a turma perto", icon: "message-circle", color: "#DCD9EF" },
    { key: "agenda", label: "Agenda", body: "Seu planejamento em dia", icon: "calendar", color: "#F0D7CE" }
  ]
};

export function ExperienceHome({ profile, session, onOpen, onLogout, preview = false, hosted = false }: Props) {
  const { width } = useWindowDimensions();
  const narrow = width < 700;
  const tiny = width < 380;
  const teacher = profile.role === "professor";
  const child = profile.role === "crescer";
  const roleLabel = teacher ? "AMBIENTE DA PROFESSORA" : child ? "EDUCAÇÃO INFANTIL" : "FUNDAMENTAL E MÉDIO";
  const identityKey = `${profile.role}:${session?.userId ?? "none"}`;
  const [loaded, setLoaded] = useState<{ key: string; data: Identity | null; error: boolean } | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (preview) return;
    let active = true;
    setLoaded(null);
    if (!session) {
      setLoaded({ key: identityKey, data: null, error: true });
      return;
    }
    async function load() {
      try {
        let next: Identity;
        if (profile.role === "professor") {
          const [summary, classes] = await Promise.all([getTeacherHomeSummary(session!), getTeacherMobileClasses(session!)]);
          next = { name: summary.teacherName, school: summary.schoolName, detail: `${classes.length} turma${classes.length === 1 ? "" : "s"} vinculada${classes.length === 1 ? "" : "s"}`, classes: classes.length };
        } else {
          const student = await (profile.role === "crescer" ? getCrescerStudentProfile(session!) : getStudentProfile(session!));
          next = { name: student.name, school: student.schoolName, detail: [student.className, student.schoolYear || student.ageGroup].filter(Boolean).join(" · ") };
        }
        if (active) setLoaded({ key: identityKey, data: next, error: false });
      } catch {
        if (active) setLoaded({ key: identityKey, data: null, error: true });
      }
    }
    void load();
    return () => { active = false; };
  }, [preview, identityKey, session, profile.role, refresh]);

  const identity = preview ? demo[profile.role] : loaded?.key === identityKey ? loaded.data : null;
  const error = !preview && loaded?.key === identityKey && loaded.error;
  const greeting = identity ? `Olá, ${teacher ? identity.name : identity.name.split(" ")[0]}!` : error ? "Seu espaço de aprendizagem" : "Preparando seu espaço…";
  const primary = shortcuts[profile.role].map(item => hosted && item.key === "diary" ? {...item, body: "Consulte os registros da turma"} : item);
  const used = new Set(primary.map(item => item.key));
  const more = [...profile.modules.filter(item => !used.has(item.key) && item.key !== "home" && item.key !== missionKey), ...(child || teacher ? [{key:"prints" as ModuleKey,label:"Atividades para Imprimir",icon:"printer" as IconName,description:"Folhas e orientações para explorar."}] : [])];
  const missionTitle = teacher ? "Pequenas missões.\nGrandes descobertas." : child ? "Que descoberta\nvamos fazer hoje?" : "Um novo desafio.\nUm passo adiante.";
  const missionSubtitle = teacher ? "Escolha atividades, organize a semana e prepare uma experiência para cada turma." : child ? "Uma borboleta, muitas possibilidades. Escolha suas cores e dê asas à imaginação." : "A água está em todo lugar. Explore uma missão de Ciências com três perguntas para pensar.";
  const badge = teacher ? "PLANEJAMENTO DA SEMANA" : "MISSÃO DO DIA";

  return (
    <View style={s.root} testID={`experience-home-${profile.role}`}>
      <View style={s.header}>
        <View style={s.brand}>
          <Image source={require("../../assets/experience/logo.png")} resizeMode="contain" style={{ width: narrow ? 150 : 165, height: narrow ? 68 : 75 }} accessibilityLabel="Raízes e Saberes, ecossistema educacional" />
          {!narrow ? <View style={s.brandText}><Text style={s.brandName}>Seu espaço para crescer</Text><Text style={s.brandSub}>Aprender. Descobrir. Transformar.</Text></View> : null}
        </View>
        <Pressable onPress={onLogout} accessibilityRole="button" accessibilityLabel="Sair do aplicativo" style={({ pressed }) => [s.logout, pressed && s.pressed]}><Feather name="log-out" size={18} color={palette.ink} /></Pressable>
      </View>

      <View style={[s.welcome, narrow && s.welcomeNarrow]}>
        <View style={s.welcomeCopy}>
          <Text style={s.eyebrow}>{roleLabel}</Text>
          <Text style={[s.greeting, narrow && s.greetingSmall]}>{greeting}</Text>
          <Text style={s.welcomeDetail}>{identity ? `${identity.school} · ${identity.detail}` : error ? "Não foi possível carregar seu contexto institucional." : "Conferindo seu vínculo com a escola."}</Text>
          {error ? <Pressable onPress={() => setRefresh(value => value + 1)} accessibilityRole="button" style={s.retry}><Feather name="refresh-cw" size={14} color={palette.green} /><Text style={s.retryText}>Tentar novamente</Text></Pressable> : null}
        </View>
        {preview ? <View style={s.previewBadge}><View style={s.previewDot} /><Text style={s.previewText}>DADOS DEMONSTRATIVOS</Text></View> : <View style={s.safeBadge}><Feather name="shield" size={15} color={palette.green} /><Text style={s.safeText}>Seu espaço na escola</Text></View>}
      </View>

      <View style={[s.mission, narrow && s.missionNarrow]}>
        <View style={s.missionCircle} />
        <View style={[s.missionCopy, narrow && s.missionCopyNarrow]}>
          <View style={s.missionEyebrow}><Feather name={teacher ? "calendar" : "star"} size={15} color={palette.gold} /><Text style={s.missionEyebrowText}>{badge}</Text></View>
          <Text style={[s.missionTitle, narrow && s.missionTitleSmall, tiny && { fontSize: 28 }]}>{missionTitle}</Text>
          <Text style={s.missionBody}>{preview ? missionSubtitle : hosted ? (teacher ? "Planeje atividades para suas turmas, confira o período e publique quando estiver pronto." : "Consulte as atividades disponíveis para sua turma e continue de onde parou.") : "Um novo espaço para reunir atividades preparadas para cada turma. A conexão com as missões institucionais ainda está em preparação."}</Text>
          <Pressable onPress={() => onOpen(missionKey)} accessibilityRole="button" accessibilityLabel={teacher ? "Planejar Missão do Dia" : "Abrir Missão do Dia"} style={({ pressed }) => [s.missionButton, pressed && s.pressed]}>
            <Text style={s.missionButtonText}>{preview ? teacher ? "Planejar uma missão" : "Explorar minha missão" : hosted ? teacher ? "Planejar minhas missões" : "Abrir minhas missões" : "Conhecer a nova área"}</Text><Feather name="arrow-right" size={18} color={palette.ink} />
          </Pressable>
          <Text style={s.missionNote}>{preview ? "Exemplo para experimentar · sem envio a alunos" : hosted ? "Atividades e permissões vinculadas à sua conta" : "Integração de missões em preparação"}</Text>
        </View>
        {!narrow ? <View style={s.missionArt} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={s.artOrbit} />
          <View style={s.artCardBack}><Feather name={teacher ? "calendar" : "book-open"} size={58} color={palette.green} /></View>
          <View style={s.artCardFront}><Image source={child ? require("../../assets/experience/borboleta.png") : require("../../assets/crescer-home/icon_missao.png")} style={s.starImage} resizeMode="contain" /><Text style={s.artCaption}>{teacher ? "Planejar com propósito" : child ? "Imaginar é só o começo" : "Aprender transforma"}</Text></View>
          <View style={s.artSpark}><Feather name="sun" size={26} color={palette.gold} /></View>
        </View> : null}
      </View>

      <View style={s.sectionHeading}><View><Text style={s.eyebrow}>{child ? "UM MUNDO PARA EXPLORAR" : teacher ? "SUA ROTINA, MAIS SIMPLES" : "CONTINUE SUA JORNADA"}</Text><Text style={s.sectionTitle}>{child ? "Vamos brincar e aprender" : "Acessos rápidos"}</Text></View><Feather name={child ? "sun" : "arrow-up-right"} size={23} color="#85986C" /></View>
      <View style={s.grid}>
        {primary.map((item, index) => <Pressable key={item.key} onPress={() => onOpen(item.key)} accessibilityRole="button" accessibilityLabel={item.label} style={({ pressed }) => [s.card, { width: narrow ? index === primary.length - 1 ? "100%" : "47.5%" : width < 1100 ? "31.5%" : "18.6%" }, narrow && index === primary.length - 1 && s.cardWide, pressed && s.cardPressed]}>
          <View style={[s.cardArt, { backgroundColor: item.color }, narrow && index === primary.length - 1 && s.cardArtWide]}><View style={s.cardArtCircle} /><Feather name={item.icon} size={narrow ? 32 : 38} color={palette.green} /><View style={s.cardArrow}><Feather name="arrow-up-right" size={15} color={palette.green} /></View></View>
          <View style={[s.cardCopy, narrow && index === primary.length - 1 && { flex: 1 }]}><Text style={s.cardTitle}>{item.label}</Text><Text style={s.cardBody}>{item.body}</Text></View>
        </Pressable>)}
      </View>

      <View style={[s.dayNote, narrow && s.dayNoteNarrow]}>
        <View style={s.noteIcon}><Feather name={teacher ? "feather" : child ? "heart" : "compass"} size={23} color="#667D4D" /></View>
        <View style={s.noteCopy}><Text style={s.noteTitle}>{teacher ? "Cada turma tem seu ritmo. Seu planejamento também." : child ? "O tempo de cada criança é o tempo da descoberta." : "Aprender é construir, um passo de cada vez."}</Text><Text style={s.noteBody}>{teacher ? "Atividades, acompanhamento e comunicação reunidos no mesmo lugar." : child ? "Explore com calma. Crie, brinque e encontre seu próprio caminho." : "Reúna seus estudos, descubra novas ideias e volte sempre que precisar."}</Text></View>
      </View>

      {more.length > 0 ? <><View style={s.moreHeading}><Text style={s.moreTitle}>Mais acessos</Text><Text style={s.moreCaption}>Tudo no seu lugar</Text></View><View style={s.moreGrid}>{more.map(item => <Pressable key={item.key} onPress={() => onOpen(item.key)} accessibilityRole="button" accessibilityLabel={item.label} style={({ pressed }) => [s.moreLink, { width: narrow ? "47.5%" : "23.5%" }, pressed && s.pressed]}><Feather name={item.icon} size={18} color={palette.green} /><Text style={s.moreText}>{item.label}</Text><Feather name="chevron-right" size={15} color="#8A9782" /></Pressable>)}</View></> : null}
      <View style={s.footer}><Text style={s.footerBrand}>RAÍZES E SABERES</Text><Text style={s.footerText}>Grandes futuros nascem aqui.</Text></View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { width: "100%", maxWidth: 1180, alignSelf: "center", paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: palette.line },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1 },
  brandIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: palette.green, alignItems: "center", justifyContent: "center" },
  brandText: { flexShrink: 1 }, brandName: { color: palette.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 }, brandSub: { color: palette.muted, fontSize: 10, marginTop: 3, letterSpacing: 0.6 },
  logout: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F0F0E5", alignItems: "center", justifyContent: "center" },
  welcome: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 20, paddingVertical: 28 }, welcomeNarrow: { alignItems: "flex-start", flexDirection: "column", gap: 13, paddingVertical: 23 }, welcomeCopy: { flex: 1 },
  eyebrow: { color: "#7A8859", fontSize: 10, fontWeight: "800", letterSpacing: 1.8 }, greeting: { color: palette.ink, fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 8 }, greetingSmall: { fontSize: 29 }, welcomeDetail: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 7 },
  previewBadge: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, backgroundColor: "#EEEFDF", paddingVertical: 9, paddingHorizontal: 12 }, previewDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#758949" }, previewText: { color: "#657346", fontSize: 8, fontWeight: "700", letterSpacing: 1 }, safeBadge: { flexDirection: "row", alignItems: "center", gap: 6 }, safeText: { color: palette.muted, fontSize: 11 },
  retry: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 44 }, retryText: { fontSize: 12, color: palette.green, fontWeight: "700" },
  mission: { flexDirection: "row", minHeight: 330, backgroundColor: palette.green, borderRadius: 28, overflow: "hidden", position: "relative" }, missionNarrow: { minHeight: 0, borderRadius: 23 }, missionCircle: { position: "absolute", right: -110, top: -140, width: 520, height: 520, borderRadius: 260, backgroundColor: "#205644" }, missionCopy: { flex: 1.3, padding: 34, zIndex: 2 }, missionCopyNarrow: { padding: 24 }, missionEyebrow: { flexDirection: "row", alignItems: "center", gap: 8 }, missionEyebrowText: { fontSize: 10, color: palette.gold, letterSpacing: 1.6, fontWeight: "800" },
  missionTitle: { fontSize: 37, fontWeight: "800", lineHeight: 43, color: palette.cream, letterSpacing: -1.25, marginTop: 18 }, missionTitleSmall: { fontSize: 30, lineHeight: 36 }, missionBody: { color: "#D3DED1", fontSize: 13, lineHeight: 21, marginTop: 13, maxWidth: 400 }, missionButton: { backgroundColor: palette.gold, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 13, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 15, marginTop: 22, minHeight: 48 }, missionButtonText: { color: palette.ink, fontSize: 13, fontWeight: "800", flexShrink: 1 }, missionNote: { color: "#BECFBA", fontSize: 9, lineHeight: 15, marginTop: 11 },
  missionArt: { flex: 1, minWidth: 240, alignItems: "center", justifyContent: "center", position: "relative" }, artOrbit: { width: 255, height: 255, position: "absolute", borderWidth: 1, borderColor: "#739476", borderRadius: 128, transform: [{ rotate: "-12deg" }, { scaleY: 0.87 }] }, artCardBack: { position: "absolute", width: 155, height: 180, backgroundColor: "#CDE0B7", borderRadius: 20, transform: [{ rotate: "-16deg" }, { translateX: -38 }, { translateY: -12 }], justifyContent: "center", alignItems: "center" }, artCardFront: { width: 155, height: 190, backgroundColor: palette.cream, borderRadius: 20, transform: [{ rotate: "9deg" }, { translateX: 37 }, { translateY: 15 }], alignItems: "center", justifyContent: "center", padding: 15, gap: 15, shadowColor: "#082D22", shadowOffset: { width: 0, height: 13 }, shadowOpacity: 0.15, shadowRadius: 20 }, starImage: { width: 97, height: 97 }, artCaption: { color: palette.green, fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 17 }, artSpark: { position: "absolute", top: 38, right: 45 },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 34, marginBottom: 18 }, sectionTitle: { color: palette.ink, fontSize: 23, fontWeight: "800", letterSpacing: -0.6, marginTop: 6 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, card: { backgroundColor: palette.cream, borderRadius: 20, overflow: "hidden", minHeight: 185, borderWidth: 1, borderColor: "#E5E6D8" }, cardWide: { flexDirection: "row", minHeight: 97, alignItems: "center" }, cardArtWide: { width: 97 }, cardPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] }, cardArt: { height: 97, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }, cardArtCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.32)", position: "absolute" }, cardArrow: { position: "absolute", right: 12, top: 12 }, cardCopy: { paddingHorizontal: 15, paddingVertical: 16 }, cardTitle: { color: palette.ink, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 }, cardBody: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  dayNote: { flexDirection: "row", gap: 15, alignItems: "center", backgroundColor: "#EFF1E2", borderRadius: 18, paddingHorizontal: 22, paddingVertical: 22, marginTop: 24 }, dayNoteNarrow: { paddingHorizontal: 17, alignItems: "flex-start" }, noteIcon: { paddingTop: 2 }, noteCopy: { flex: 1 }, noteTitle: { color: "#4D6741", fontSize: 13, fontWeight: "700", lineHeight: 20 }, noteBody: { color: "#68765B", fontSize: 11, lineHeight: 18, marginTop: 3 },
  moreHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 30, marginBottom: 14 }, moreTitle: { color: palette.ink, fontSize: 18, fontWeight: "700" }, moreCaption: { color: "#8B947F", fontSize: 10 }, moreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, moreLink: { minHeight: 55, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 11, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F2F1E8" }, moreText: { flex: 1, color: palette.ink, fontSize: 12, fontWeight: "600" }, pressed: { opacity: 0.72 }, footer: { marginTop: 35, alignItems: "center", gap: 5 }, footerBrand: { fontSize: 9, letterSpacing: 2, fontWeight: "700", color: "#778369" }, footerText: { fontSize: 10, color: "#8A927E" }
});
