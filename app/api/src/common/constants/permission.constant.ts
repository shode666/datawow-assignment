export const Permission = {
  USER: 1,
  ADMIN: 2,
} as const;

export type PermissionValue =
  (typeof Permission)[keyof typeof Permission];