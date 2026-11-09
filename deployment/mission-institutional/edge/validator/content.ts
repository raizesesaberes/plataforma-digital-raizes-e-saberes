import { z } from "zod";
import { common, question, face, id } from "./fields.ts";
import { extendedSchemas } from "./extended-content.ts";
export { imageSchema } from "./fields.ts";
const pair = z.object({ id, left: face, right: face }).strict();
export const gameSchema = z
  .discriminatedUnion("template", [
    z
      .object({
        ...common,
        template: z.literal("quiz"),
        questions: z.array(question).min(1).max(100),
      })
      .strict(),
    z
      .object({
        ...common,
        template: z.literal("memory"),
        memoryMode: z.enum(["identical", "relational"]),
        pairs: z.array(pair).min(2).max(16),
      })
      .strict(),
    z
      .object({
        ...common,
        template: z.literal("association"),
        pairs: z.array(pair).min(2).max(16),
      })
      .strict(),
    ...extendedSchemas,
  ])
  .superRefine((g, c) => {
    const items = (() => {
      switch (g.template) {
        case "quiz":
          return g.questions;
        case "memory":
        case "association":
          return g.pairs;
        case "sequence":
        case "classification":
          return g.items;
        case "completion":
          return g.blanks;
        case "trail":
          return g.nodes;
        case "word-search":
          return g.words;
        case "crossword":
          return g.entries;
        case "puzzle":
          return g.pieces;
      }
    })();
    if (new Set(items.map((i) => i.id)).size !== items.length)
      c.addIssue({
        code: "custom",
        message: "Itens com identificadores repetidos.",
      });
    const supportIds =
      g.pedagogicalSupport?.items?.map((item) => item.itemId) || [];
    if (new Set(supportIds).size !== supportIds.length)
      c.addIssue({
        code: "custom",
        path: ["pedagogicalSupport", "items"],
        message: "Apoios com identificadores repetidos.",
      });
    if (supportIds.some((id) => !items.some((item) => item.id === id)))
      c.addIssue({
        code: "custom",
        path: ["pedagogicalSupport", "items"],
        message: "Cada apoio deve apontar para um item da atividade.",
      });
    if (
      (g.template === "memory" || g.template === "puzzle") &&
      supportIds.length
    )
      c.addIssue({
        code: "custom",
        path: ["pedagogicalSupport", "items"],
        message:
          "Memória e quebra-cabeça usam apenas apoio geral, sem antecipar pares ou posições.",
      });
    if (g.bookReference) {
      if (g.catalog && g.catalog.band !== `EF${g.bookReference.year}`)
        c.addIssue({
          code: "custom",
          path: ["bookReference", "year"],
          message: "O ano do livro deve coincidir com a faixa EF do catálogo.",
        });
      const itemIds = new Set(items.map((item) => item.id));
      const mappedIds = new Set(
        g.bookReference.itemSources.map((source) => source.itemId),
      );
      for (const [index, source] of g.bookReference.itemSources.entries())
        if (!itemIds.has(source.itemId))
          c.addIssue({
            code: "custom",
            path: ["bookReference", "itemSources", index, "itemId"],
            message:
              "A fonte deve apontar para um item existente da atividade.",
          });
      if (items.some((item) => !mappedIds.has(item.id)))
        c.addIssue({
          code: "custom",
          path: ["bookReference", "itemSources"],
          message:
            "Todos os itens da atividade precisam de uma fonte no livro.",
        });
    }
    if (g.template === "memory" && g.memoryMode === "identical")
      for (const p of g.pairs) {
        if (JSON.stringify(p.left) !== JSON.stringify(p.right))
          c.addIssue({
            code: "custom",
            message: "Na memória, os dois lados do par devem ser idênticos.",
          });
      }
  });
export type GameContent = z.infer<typeof gameSchema>;
export type Template = GameContent["template"];
export type Face = z.infer<typeof face>;
export function parseContent(value: unknown): GameContent {
  return gameSchema.parse(value);
}
export function validationMessages(value: unknown): string[] {
  const result = gameSchema.safeParse(value);
  return result.success
    ? []
    : result.error.issues.map(
        (i) => `${i.path.join(".") || "conteúdo"}: ${i.message}`,
      );
}
