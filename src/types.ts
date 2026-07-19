/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  MANAGER = "manager",
  SUPERVISOR = "supervisor",
  EMPLOYEE = "employee",
}

export enum TaskStatus {
  PENDING = "pending", // معلقة
  IN_PROGRESS = "in_progress", // قيد التنفيذ
  UNDER_REVIEW = "under_review", // قيد المراجعة
  COMPLETED = "completed", // مكتملة
  REJECTED = "rejected", // مرفوضة
  CANCELLED = "cancelled", // ملغاة
  OVERDUE = "overdue", // متأخرة
}

export enum TaskPriority {
  LOW = "low", // منخفضة
  MEDIUM = "medium", // متوسطة
  HIGH = "high", // عالية
  URGENT = "urgent", // عاجلة
}

export interface Company {
  id: string;
  name: string;
  subscriptionPlan: "basic" | "premium" | "enterprise";
  subscriptionStatus: "active" | "expired" | "trial";
  employeeLimit: number;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  position: string; // المسمى الوظيفي
  salary: number;
  status: "active" | "inactive";
  createdAt: string;
  performanceScore?: number; // متوسط تقييم الأداء الحالي
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  description: string;
  managerId?: string; // معرف مدير القسم (أو مشرف)
  createdAt: string;
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  description: string;
  departmentId?: string;
  status: "planning" | "active" | "completed" | "on_hold";
  startDate: string;
  endDate: string;
  progress: number; // نسبة الإنجاز
  createdAt: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  text: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface TaskHistoryItem {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface Task {
  id: string;
  companyId: string;
  projectId?: string;
  title: string;
  description: string;
  departmentId?: string;
  assignedEmployeeId: string;
  assignedById: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  estimatedTime: number; // بالساعات
  completionPercentage: number;
  requiredFiles: boolean; // هل يتطلب رفع ملفات للاعتماد؟
  attachments: { name: string; url: string; size: string; type: string }[];
  comments: TaskComment[];
  checklist: ChecklistItem[];
  tags: string[];
  category: string;
  history: TaskHistoryItem[];
  createdAt: string;
}

export interface DailyEvaluation {
  id: string;
  companyId: string;
  employeeId: string;
  evaluatorId: string;
  date: string; // YYYY-MM-DD
  taskQuality: number; // 1-10
  speed: number; // 1-10
  commitment: number; // 1-10
  attendance: number; // 1-10
  communication: number; // 1-10
  problemSolving: number; // 1-10
  cooperation: number; // 1-10
  overallRating: number; // المتوسط التلقائي
  notes: string;
  finalScore: number; // من 100%
}

export interface Attendance {
  id: string;
  companyId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string; // HH:MM:SS
  clockOut?: string; // HH:MM:SS
  workingHours?: number;
  lateArrival: boolean;
  status: "present" | "late" | "absent" | "vacation" | "leave";
  leaveReason?: string;
}

export interface FileItem {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  name: string;
  size: string;
  type: string; // pdf | image | doc | xls | zip | video
  url: string;
  uploadedAt: string;
  approvedByManager: boolean;
}

export interface Announcement {
  id: string;
  companyId: string;
  title: string;
  content: string;
  createdBy: string; // اسم المدير الكاتب الإعلان
  createdAt: string;
  priority: "normal" | "important" | "urgent";
}

export interface Notification {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  companyId: string;
  senderId: string;
  senderName: string;
  receiverId: string; // 'all' للإرسال العام أو معرف مستخدم
  message: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  companyId: string;
  userId: string;
  username: string;
  action: string;
  ip: string;
  details: string;
  createdAt: string;
}
