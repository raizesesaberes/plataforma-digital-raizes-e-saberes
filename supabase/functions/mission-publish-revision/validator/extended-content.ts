import { z } from "zod";
import { common, text, id, face, imageSchema, question } from "./fields.ts";
import { cells, coordinateKey, normalizeAnswer } from "./grid.ts";
const bounded = z.number().int().min(0).max(11);
const word = z
  .string()
  .trim()
  .regex(
    /^[A-Z]{2,12}$/,
    "Use de 2 a 12 letras A–Z, maiúsculas e sem acentos.",
  );
function unique(
  values: string[],
  context: z.RefinementCtx,
  message = "Identificadores repetidos.",
) {
  if (new Set(values).size !== values.length)
    context.addIssue({ code: "custom", message });
}
const sequence = z
  .object({
    ...common,
    template: z.literal("sequence"),
    items: z.array(face.extend({ id })).min(2).max(12),
  })
  .strict()
  .superRefine((g, c) => {
    unique(
      g.items.map((x) => x.id),
      c,
    );
    unique(
      g.items.map((x) => x.label),
      c,
      "Os rótulos da sequência precisam ser distintos.",
    );
  });
const classification = z
  .object({
    ...common,
    template: z.literal("classification"),
    categories: z
      .array(z.object({ id, label: text }).strict())
      .min(2)
      .max(6),
    items: z
      .array(face.extend({ id, categoryId: id }))
      .min(2)
      .max(24),
  })
  .strict()
  .superRefine((g, c) => {
    unique(
      g.categories.map((x) => x.id),
      c,
    );
    unique(
      g.categories.map((x) => x.label),
      c,
      "Categorias com rótulos repetidos.",
    );
    unique(
      g.items.map((x) => x.id),
      c,
    );
    if (g.items.some((x) => !g.categories.some((y) => y.id === x.categoryId)))
      c.addIssue({
        code: "custom",
        message: "Cada item precisa de uma categoria existente.",
      });
    if (g.categories.some((x) => !g.items.some((y) => y.categoryId === x.id)))
      c.addIssue({
        code: "custom",
        message: "Cada categoria precisa de pelo menos um item.",
      });
  });
const puzzle = z
  .object({
    ...common,
    template: z.literal("puzzle"),
    rows: z.number().int().min(2).max(4),
    columns: z.number().int().min(2).max(4),
    image: imageSchema,
    pieces: z
      .array(
        z
          .object({ id, label: text, slot: z.number().int().min(0).max(15) })
          .strict(),
      )
      .min(4)
      .max(16),
  })
  .strict()
  .superRefine((g, c) => {
    const size = g.rows * g.columns;
    unique(
      g.pieces.map((x) => x.id),
      c,
    );
    unique(
      g.pieces.map((x) => String(x.slot)),
      c,
      "Duas peças não podem ocupar a mesma posição.",
    );
    if (g.pieces.length !== size || g.pieces.some((x) => x.slot >= size))
      c.addIssue({
        code: "custom",
        message:
          "Cadastre uma peça para cada posição da grade, sem posições fora dos limites.",
      });
  });
const wordSearch = z
  .object({
    ...common,
    template: z.literal("word-search"),
    grid: z
      .array(
        z
          .string()
          .regex(/^[A-Z]{3,12}$/, "Linhas da grade: de 3 a 12 letras A–Z."),
      )
      .min(3)
      .max(12),
    words: z
      .array(
        z
          .object({
            id,
            word,
            clue: text.optional(),
            image: imageSchema.optional(),
            row: bounded,
            col: bounded,
            direction: z.enum(["horizontal", "vertical"]),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .superRefine((g, c) => {
    unique(
      g.words.map((x) => x.id),
      c,
    );
    unique(
      g.words.map((x) => x.word),
      c,
      "Palavras repetidas.",
    );
    if (g.grid.some((x) => x.length !== g.grid[0].length))
      c.addIssue({
        code: "custom",
        message: "Todas as linhas devem ter o mesmo tamanho.",
      });
    for (const w of g.words) {
      const path = cells(
        w.row,
        w.col,
        w.word.length,
        w.direction === "vertical",
      );
      if (path.some((p, i) => g.grid[p.row]?.[p.col] !== w.word[i]))
        c.addIssue({
          code: "custom",
          message: `A palavra ${w.word} não está presente na posição declarada.`,
        });
    }
  });
const crossword = z
  .object({
    ...common,
    template: z.literal("crossword"),
    rows: z.number().int().min(3).max(12),
    columns: z.number().int().min(3).max(12),
    entries: z
      .array(
        z
          .object({
            id,
            clue: text,
            answer: word,
            row: bounded,
            col: bounded,
            direction: z.enum(["across", "down"]),
          })
          .strict(),
      )
      .min(2)
      .max(12),
  })
  .strict()
  .superRefine((g, c) => {
    unique(
      g.entries.map((x) => x.id),
      c,
    );
    unique(
      g.entries.map((x) => x.answer),
      c,
      "Respostas repetidas.",
    );
    const occupied = new Map<
      string,
      { letter: string; directions: Set<string>; ids: Set<string> }
    >();
    const links = new Map(g.entries.map((e) => [e.id, new Set<string>()]));
    for (const e of g.entries)
      for (const [i, p] of cells(
        e.row,
        e.col,
        e.answer.length,
        e.direction === "down",
      ).entries()) {
        if (p.row >= g.rows || p.col >= g.columns)
          c.addIssue({
            code: "custom",
            message: "Resposta ultrapassa os limites da grade.",
          });
        const key = coordinateKey(p),
          other = occupied.get(key);
        if (other) {
          if (other.letter !== e.answer[i] || other.directions.has(e.direction))
            c.addIssue({
              code: "custom",
              message:
                "Interseção contraditória ou sobreposição na mesma direção.",
            });
          for (const previousId of other.ids) {
            links.get(e.id)!.add(previousId);
            links.get(previousId)!.add(e.id);
          }
          other.directions.add(e.direction);
          other.ids.add(e.id);
        } else
          occupied.set(key, {
            letter: e.answer[i],
            directions: new Set([e.direction]),
            ids: new Set([e.id]),
          });
      }
    if (!g.entries[0]) return;
    const seen = new Set<string>();
    const pending = [g.entries[0].id];
    while (pending.length) {
      const next = pending.pop()!;
      if (seen.has(next)) continue;
      seen.add(next);
      pending.push(...links.get(next)!);
    }
    if (seen.size !== g.entries.length)
      c.addIssue({
        code: "custom",
        message: "Todas as palavras precisam estar conectadas por interseções.",
      });
  });
const completion = z
  .object({
    ...common,
    template: z.literal("completion"),
    blanks: z
      .array(
        z
          .object({
            id,
            before: z.string().max(500),
            after: z.string().max(500),
            answers: z.array(text).min(1).max(5),
            options: z.array(face.extend({ id })).min(2).max(6).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((g, c) => {
    unique(
      g.blanks.map((x) => x.id),
      c,
    );
    for (const b of g.blanks) {
      if (!(b.before + b.after).trim())
        c.addIssue({
          code: "custom",
          message: "A lacuna precisa de contexto antes ou depois.",
        });
      unique(b.answers.map(normalizeAnswer), c, "Respostas aceitas repetidas.");
      if (b.options) {
        unique(
          b.options.map((o) => o.id),
          c,
        );
        unique(
          b.options.map((o) => normalizeAnswer(o.label)),
          c,
        );
        if (
          !b.options.some((o) =>
            b.answers.some(
              (a) => normalizeAnswer(a) === normalizeAnswer(o.label),
            ),
          )
        )
          c.addIssue({
            code: "custom",
            message: "Inclua uma alternativa correta.",
          });
      }
    }
  });
const trail = z
  .object({
    ...common,
    template: z.literal("trail"),
    nodes: z.array(question).min(2).max(20),
  })
  .strict()
  .superRefine((g, c) =>
    unique(
      g.nodes.map((x) => x.id),
      c,
    ),
  );
export const extendedSchemas = [
  sequence,
  classification,
  puzzle,
  wordSearch,
  crossword,
  completion,
  trail,
] as const;
export type ExtendedContent = z.infer<(typeof extendedSchemas)[number]>;
export type ExtendedTemplate = ExtendedContent["template"];
export function isExtendedTemplate(value: string): value is ExtendedTemplate {
  return [
    "sequence",
    "classification",
    "puzzle",
    "word-search",
    "crossword",
    "completion",
    "trail",
  ].includes(value);
}
