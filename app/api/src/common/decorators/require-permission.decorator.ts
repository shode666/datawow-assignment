import { SetMetadata } from '@nestjs/common';
import type { PermissionValue } from '../constants/permission.constant';

export const PERMISSION_KEY = 'requiredPermissions';

/**
 * ต้องมีอย่างน้อย 1 permission ในลิสต์ถึงจะเรียกได้
 *
 * ในดีไซน์นี้ทุกบัญชีสลับเป็น admin ได้อยู่แล้ว decorator นี้จึงเป็น
 * mode guard (token กำลังสวมหมวกอะไร) ไม่ใช่ access control ว่าใครเป็นใคร
 */
export const RequirePermission = (
  ...permissions: PermissionValue[]
) => SetMetadata(PERMISSION_KEY, permissions);
