import { pgTable, serial, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  kindeId: text('kinde_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  onboardingState: jsonb('onboarding_state').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  ownerId: text('owner_id').notNull().references(() => users.kindeId, { onDelete: 'cascade' }),
  workspaceId: integer('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const models = pgTable('models', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: integer('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  fileSize: text('file_size').notNull(),
  fileUrl: text('file_url'),
  status: text('status').default('processing').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  workspaceId: integer('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  email: text('email').notNull(),
  role: text('role').default('viewer').notNull(),
  inviteToken: text('invite_token'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.kindeId, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  workspaces: many(workspaces),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.kindeId],
  }),
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  models: many(models),
  teamMembers: many(teamMembers),
}));

export const modelsRelations = relations(models, ({ one }) => ({
  project: one(projects, {
    fields: [models.projectId],
    references: [projects.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  project: one(projects, {
    fields: [teamMembers.projectId],
    references: [projects.id],
  }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.kindeId],
  }),
  projects: many(projects),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.kindeId, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  keyHash: text('key_hash').notNull(),
  prefix: text('prefix').notNull(),
  scopes: text('scopes').array().default(['projects:read']).$type<string[]>(),
  rateLimitPerMin: integer('rate_limit_per_min').default(60),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.kindeId, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  mode: text('mode').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  workspaceId: integer('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fileUrl: text('file_url').notNull(),
  mimeType: text('mime_type'),
  status: text('status').default('pending').notNull(),
  chunks: integer('chunks').default(0),
  indexedAt: timestamp('indexed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.kindeId, { onDelete: 'cascade' }),
  inviteEmails: boolean('invite_emails').default(true),
  sharedEmails: boolean('shared_emails').default(true),
  projectEmails: boolean('project_emails').default(true),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.kindeId],
  }),
}));


