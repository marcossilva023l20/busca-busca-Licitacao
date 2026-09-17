import { pgTable, text, timestamp, uuid, jsonb, boolean } from "drizzle-orm/pg-core";

/**
 * Buscas salvas pelo usuário: nome + conjunto de filtros serializado.
 */
export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  filters: jsonb("filters").notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Licitações marcadas como favoritas (snapshot mínimo para exibição offline).
 */
export const favorites = pgTable("favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  numeroControlePncp: text("numero_controle_pncp").notNull().unique(),
  titulo: text("titulo").notNull(),
  orgao: text("orgao"),
  uf: text("uf"),
  municipio: text("municipio"),
  modalidadeNome: text("modalidade_nome"),
  portalNome: text("portal_nome"),
  dataEncerramento: text("data_encerramento"),
  valorEstimado: text("valor_estimado"),
  linkPncp: text("link_pncp"),
  linkSistemaOrigem: text("link_sistema_origem"),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SavedSearch = typeof savedSearches.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
