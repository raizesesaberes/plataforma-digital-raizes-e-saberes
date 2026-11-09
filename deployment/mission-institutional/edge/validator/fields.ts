import { isBundledImage } from "./bundled-images.ts";
import { z } from "zod";
export const text = z.string().trim().min(1, "Preencha este campo.").max(500);
export const id = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,80}$/, "Identificador inválido.");
export const imageSchema = z
  .object({
    src: z
      .string()
      .max(800_000)
      .refine(
        (src) =>
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
            src,
          ) || isBundledImage(src),
        "Use imagem PNG, JPEG ou WebP incorporada.",
      ),
    alt: text,
  })
  .strict();
export const face = z
  .object({ label: text, image: imageSchema.optional() })
  .strict();
const option = face.extend({ id });
export const question = z
  .object({
    id,
    prompt: text,
    image: imageSchema.optional(),
    options: z.array(option).min(2).max(6),
    correctOptionId: id,
    explanation: text,
  })
  .strict()
  .superRefine((q, c) => {
    if (new Set(q.options.map((o) => o.id)).size !== q.options.length)
      c.addIssue({
        code: "custom",
        message: "Alternativas com identificadores repetidos.",
        path: ["options"],
      });
    if (new Set(q.options.map((o) => o.label)).size !== q.options.length)
      c.addIssue({
        code: "custom",
        message: "Use alternativas com rótulos distintos.",
        path: ["options"],
      });
    if (!q.options.some((o) => o.id === q.correctOptionId))
      c.addIssue({
        code: "custom",
        message: "Selecione uma resposta correta existente.",
        path: ["correctOptionId"],
      });
  });
export const bookReferenceSchema = z
  .object({
    year: z.number().int().min(1).max(9),
    bookId: id,
    bookTitle: text,
    unit: text,
    topic: text,
    sourceUrl: z
      .string()
      .url("Informe a URL do livro.")
      .refine(
        (url) => /^https:\/\//i.test(url),
        "Use uma URL HTTPS para a fonte.",
      ),
    pages: z
      .array(
        z
          .object({
            pdfPage: z.number().int().min(1),
            printedPage: text.optional(),
          })
          .strict(),
      )
      .min(1),
    itemSources: z
      .array(
        z
          .object({
            itemId: id,
            pdfPages: z.array(z.number().int().min(1)).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((reference, context) => {
    const pages = new Set(reference.pages.map((page) => page.pdfPage));
    if (pages.size !== reference.pages.length)
      context.addIssue({
        code: "custom",
        path: ["pages"],
        message: "Páginas do PDF repetidas.",
      });
    const itemIds = new Set<string>();
    for (const [index, source] of reference.itemSources.entries()) {
      if (itemIds.has(source.itemId))
        context.addIssue({
          code: "custom",
          path: ["itemSources", index, "itemId"],
          message: "Item com fonte repetida.",
        });
      itemIds.add(source.itemId);
      if (new Set(source.pdfPages).size !== source.pdfPages.length)
        context.addIssue({
          code: "custom",
          path: ["itemSources", index, "pdfPages"],
          message: "Páginas do PDF repetidas na fonte do item.",
        });
      if (source.pdfPages.some((page) => !pages.has(page)))
        context.addIssue({
          code: "custom",
          path: ["itemSources", index, "pdfPages"],
          message: "A fonte do item deve usar páginas declaradas no livro.",
        });
    }
  });
export type BookReference = z.infer<typeof bookReferenceSchema>;
export const common = {
  schemaVersion: z.literal(1),
  pedagogicalSupport: z
    .object({
      overview: text.optional(),
      items: z
        .array(z.object({ itemId: id, text }).strict())
        .min(1)
        .max(100)
        .optional(),
      afterCompletion: text.optional(),
    })
    .strict()
    .refine(
      (value) =>
        Boolean(value.overview || value.items?.length || value.afterCompletion),
      "Inclua ao menos um apoio pedagógico.",
    )
    .optional(),
  catalog: z
    .object({
      band: z.enum([
        "EI2",
        "EI3",
        "EI4",
        "EI5",
        "EF1",
        "EF2",
        "EF3",
        "EF4",
        "EF5",
        "EF6",
        "EF7",
        "EF8",
        "EF9",
        "EM1",
        "EM2",
        "EM3",
      ]),
      area: z.enum([
        "portugues",
        "matematica",
        "ciencias-variedades",
        "historia",
      ]),
      batch: id,
      objective: text,
      readingRequired: z.boolean(),
      visualSupport: z
        .array(
          z.object({ term: text, image: imageSchema, rights: text }).strict(),
        )
        .max(80),
    })
    .strict()
    .optional(),
  bookReference: bookReferenceSchema.optional(),
  id,
  title: text,
  grade: text.max(120),
  subject: text.max(120),
  collection: z.object({ id, title: text }).strict().optional(),
  description: text,
  difficulty: z.enum(["facil", "medio", "dificil"]),
  bncc: z
    .array(
      z
        .string()
        .regex(
          /^(EI\d{2}[A-Z]{2}\d{2}|EF\d{2}[A-Z]{2}\d{2,3}|EM\d{2}[A-Z]{3}\d{3}|EM\d{2}LP\d{2})$/,
          "Formato de código BNCC inválido.",
        ),
    )
    .max(20),
  status: z.enum(["draft", "review"]),
};
