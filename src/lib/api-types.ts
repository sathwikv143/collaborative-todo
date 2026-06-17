export type ListIdParams = { params: Promise<{ id: string }> };
export type InviteIdParams = { params: Promise<{ id: string; inviteId: string }> };
export type JoinTokenParams = { params: Promise<{ token: string }> };
export type TaskCommentParams = {
  params: Promise<{ id: string; taskId: string }>;
};
