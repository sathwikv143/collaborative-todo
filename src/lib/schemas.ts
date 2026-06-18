import { z } from "zod";
import {
  ACCOUNT_ID_FORMATTED_MAX_LENGTH,
  normalizeAccountId,
} from "./account-id-format";
import { isValidBackupCodeFormat, normalizeBackupCode } from "./backup-codes";
import { validateExternalUrl } from "./external-links";
import { TASK_PRIORITIES } from "./task-priority";
import { TASK_STATUS_IDS } from "./task-status";

const taskPrioritySchema = z.enum(
  TASK_PRIORITIES.map((p) => p.value) as [
    (typeof TASK_PRIORITIES)[number]["value"],
    ...(typeof TASK_PRIORITIES)[number]["value"][],
  ]
);

const taskStatusSchema = z.enum(TASK_STATUS_IDS);

/** Accepts legacy `open` and normalizes to `todo` in API handlers */
export const taskStatusInputSchema = z.union([taskStatusSchema, z.literal("open")]);

export const createListSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
});

export const createSectionSchema = z.object({
  title: z.string().min(1).max(120),
});

export const sectionPatchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const taskExternalLinkSchema = z
  .object({
    url: z.string().min(1).max(2048),
    label: z.string().max(120).nullable().optional(),
  })
  .superRefine((link, ctx) => {
    const result = validateExternalUrl(link.url);
    if (!result.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["url"], message: result.error });
    }
  });

const externalLinksSchema = z.array(taskExternalLinkSchema).max(15);

export const createTaskSchema = z.object({
  sectionId: z.string().uuid(),
  title: z.string().min(1).max(300),
  notes: z.string().max(1200).nullable().optional(),
  assigneeMemberId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: taskPrioritySchema.optional(),
  status: taskStatusInputSchema.optional(),
  externalLinks: externalLinksSchema.optional(),
});

export const taskPatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  notes: z.string().max(1200).nullable().optional(),
  status: taskStatusInputSchema.optional(),
  sectionId: z.string().uuid().optional(),
  assigneeMemberId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: taskPrioritySchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
  externalLinks: externalLinksSchema.optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const guestJoinSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
});

export const passkeyRegisterOptionsSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(80),
});

export const updateDisplayNameSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(80),
});

export const passkeyRegisterVerifySchema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.unknown()),
});

const accountIdInputSchema = z
  .string()
  .min(1)
  .max(ACCOUNT_ID_FORMATTED_MAX_LENGTH)
  .transform((value, ctx) => {
    const normalized = normalizeAccountId(value);
    if (!normalized) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid account ID" });
      return z.NEVER;
    }
    return normalized;
  });

export const passkeyLoginOptionsSchema = z.object({
  accountId: accountIdInputSchema,
});

export const passkeyLoginVerifySchema = z.object({
  challengeId: z.string().uuid(),
  accountId: accountIdInputSchema,
  response: z.record(z.unknown()),
});

const backupCodeInputSchema = z
  .string()
  .min(1)
  .max(20)
  .transform((value, ctx) => {
    if (!isValidBackupCodeFormat(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid backup code" });
      return z.NEVER;
    }
    return normalizeBackupCode(value);
  });

export const recoverBackupCodeSchema = z.object({
  backupCode: backupCodeInputSchema,
  consume: z.boolean(),
});

export const recoverPasskeyVerifySchema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.unknown()),
});

export const passkeyAddVerifySchema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.unknown()),
  deviceLabel: z.string().max(80).optional(),
});

export const passkeyRevokeSchema = z.object({
  passkeyId: z.string().uuid(),
});

export const backupRegenerateVerifySchema = z.object({
  challengeId: z.string().uuid(),
  response: z.record(z.unknown()),
});

export const accountDeleteVerifySchema = backupRegenerateVerifySchema;

export const createInviteSchema = z.object({
  role: z.enum(["admin", "editor", "viewer"]).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresInHours: z.number().int().positive().max(720).optional(),
});
