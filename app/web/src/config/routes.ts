// ไม่มี JSX/icon ในไฟล์นี้ เพื่อให้ server component import ได้โดยไม่ลาก antd เข้ามา
export type ViewMode = 'user' | 'admin';

export const modeHome: Record<ViewMode, string> = {
  user: '/list',
  admin: '/admin',
};
