/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
export var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["MANAGER"] = "manager";
    UserRole["SUPERVISOR"] = "supervisor";
    UserRole["EMPLOYEE"] = "employee";
})(UserRole || (UserRole = {}));
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in_progress";
    TaskStatus["UNDER_REVIEW"] = "under_review";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["REJECTED"] = "rejected";
    TaskStatus["CANCELLED"] = "cancelled";
    TaskStatus["OVERDUE"] = "overdue";
})(TaskStatus || (TaskStatus = {}));
export var TaskPriority;
(function (TaskPriority) {
    TaskPriority["LOW"] = "low";
    TaskPriority["MEDIUM"] = "medium";
    TaskPriority["HIGH"] = "high";
    TaskPriority["URGENT"] = "urgent";
})(TaskPriority || (TaskPriority = {}));
