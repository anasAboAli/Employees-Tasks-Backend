/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { UserRole, TaskStatus, TaskPriority } from "./src/types";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(process.cwd(), "data", "db.json");
const JWT_SECRET = process.env.JWT_SECRET || "enterprise_employee_management_secret_key_2026";
app.use(cors());
app.use(express.json({ limit: "50mb" }));
// ----------------------------------------------------
// AI Studio Lazy Gemini Initialization
// ----------------------------------------------------
let aiInstance = null;
function getAIClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
        return null;
    }
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    "User-Agent": "aistudio-build",
                },
            },
        });
    }
    return aiInstance;
}
// ----------------------------------------------------
// Cryptography Helpers
// ----------------------------------------------------
function hashPassword(password, salt) {
    return crypto.createHmac("sha256", salt).update(password).digest("hex");
}
function generateSalt() {
    return crypto.randomBytes(16).toString("hex");
}
function signToken(payload) {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
    return `${header}.${data}.${signature}`;
}
function verifyToken(token) {
    try {
        const parts = token.split(".");
        if (parts.length !== 3)
            return null;
        const [header, data, signature] = parts;
        const expectedSignature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${data}`).digest("base64url");
        if (signature !== expectedSignature)
            return null;
        return JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    }
    catch {
        return null;
    }
}
function ensureDBDirectory() {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
function loadDB() {
    ensureDBDirectory();
    if (!fs.existsSync(DB_FILE)) {
        const freshState = getSeedData();
        saveDB(freshState);
        return freshState;
    }
    try {
        const data = fs.readFileSync(DB_FILE, "utf8");
        return JSON.parse(data);
    }
    catch (err) {
        console.error("Error reading database file, returning fresh seeded state", err);
        return getSeedData();
    }
}
function saveDB(state) {
    ensureDBDirectory();
    const tempPath = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(tempPath, DB_FILE);
}
function logActivity(userId, username, companyId, action, details) {
    const db = loadDB();
    db.activityLogs.unshift({
        id: `log_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        companyId,
        userId,
        username,
        action,
        ip: "127.0.0.1",
        details,
        createdAt: new Date().toISOString(),
    });
    saveDB(db);
}
// ----------------------------------------------------
// Realistic Arabic Seed Data
// ----------------------------------------------------
function getSeedData() {
    const superAdminSalt = "super_admin_salt_2026";
    const managerSalt = "manager_salt_2026";
    const supervisorSalt = "supervisor_salt_2026";
    const emp1Salt = "emp1_salt_2026";
    const emp2Salt = "emp2_salt_2026";
    return {
        companies: [
            { id: "comp_1", name: "مؤسسة النخبة للحلول التقنية", subscriptionPlan: "enterprise", subscriptionStatus: "active", employeeLimit: 100, createdAt: "2026-01-10T10:00:00.000Z" },
            { id: "comp_2", name: "مجموعة الفهد للمقاولات والاستشارات", subscriptionPlan: "premium", subscriptionStatus: "active", employeeLimit: 50, createdAt: "2026-02-15T11:30:00.000Z" }
        ],
        users: [
            {
                id: "usr_super",
                companyId: "all",
                username: "admin",
                passwordHash: hashPassword("password", superAdminSalt),
                salt: superAdminSalt,
                name: "عبد الرحمن التميمي",
                email: "admin@enterprise.com",
                role: UserRole.SUPER_ADMIN,
                position: "مدير النظام العام",
                salary: 25000,
                status: "active",
                createdAt: "2026-01-01T08:00:00.000Z"
            },
            {
                id: "usr_manager1",
                companyId: "comp_1",
                username: "manager",
                passwordHash: hashPassword("password", managerSalt),
                salt: managerSalt,
                name: "المهندس أحمد المنصوري",
                email: "ahmed@elite.com",
                role: UserRole.MANAGER,
                position: "المدير العام للمؤسسة",
                salary: 18000,
                status: "active",
                createdAt: "2026-01-12T09:00:00.000Z"
            },
            {
                id: "usr_supervisor1",
                companyId: "comp_1",
                username: "supervisor",
                passwordHash: hashPassword("password", supervisorSalt),
                salt: supervisorSalt,
                name: "خالد العتيبي",
                email: "khaled@elite.com",
                role: UserRole.SUPERVISOR,
                departmentId: "dept_it",
                position: "مشرف قسم هندسة البرمجيات",
                salary: 12000,
                status: "active",
                createdAt: "2026-01-15T09:30:00.000Z"
            },
            {
                id: "usr_emp1",
                companyId: "comp_1",
                username: "employee1",
                passwordHash: hashPassword("password", emp1Salt),
                salt: emp1Salt,
                name: "عادل الشمري",
                email: "adel@elite.com",
                role: UserRole.EMPLOYEE,
                departmentId: "dept_it",
                position: "مطور واجهات متكاملة",
                salary: 8500,
                status: "active",
                createdAt: "2026-01-18T08:30:00.000Z",
                performanceScore: 92
            },
            {
                id: "usr_emp2",
                companyId: "comp_1",
                username: "employee2",
                passwordHash: hashPassword("password", emp2Salt),
                salt: emp2Salt,
                name: "سارة الأحمد",
                email: "sara@elite.com",
                role: UserRole.EMPLOYEE,
                departmentId: "dept_hr",
                position: "مسؤولة التوظيف والتطوير",
                salary: 7500,
                status: "active",
                createdAt: "2026-01-20T08:45:00.000Z",
                performanceScore: 88
            }
        ],
        departments: [
            { id: "dept_it", companyId: "comp_1", name: "تقنية المعلومات والبرمجيات", description: "القسم المسؤول عن إدارة الشبكات وتطوير البرمجيات والحلول الرقمية للمؤسسة.", managerId: "usr_supervisor1", createdAt: "2026-01-11T12:00:00.000Z" },
            { id: "dept_hr", companyId: "comp_1", name: "الموارد البشرية", description: "قسم إدارة الكفاءات البشرية، التوظيف، شؤون الموظفين، والتدريب.", managerId: "usr_manager1", createdAt: "2026-01-11T12:30:00.000Z" }
        ],
        projects: [
            { id: "proj_erp", companyId: "comp_1", name: "نظام التحول الرقمي الداخلي", description: "تطوير وتدشين البوابة الداخلية الموحدة لإدارة موارد الشركة وأتمتة العمليات اليومية بالكامل.", departmentId: "dept_it", status: "active", startDate: "2026-02-01", endDate: "2026-09-30", progress: 45, createdAt: "2026-01-25T14:00:00.000Z" }
        ],
        tasks: [
            {
                id: "task_1",
                companyId: "comp_1",
                projectId: "proj_erp",
                title: "تصميم واجهة لوحة معلومات الموظفين باللغة العربية",
                description: "تصميم وتنفيذ شاشات لوحة معلومات الموظفين مع دعم كامل لاتجاه النص RTL وتضمين الرسوم البيانية لأداء المهام والحضور.",
                departmentId: "dept_it",
                assignedEmployeeId: "usr_emp1",
                assignedById: "usr_manager1",
                priority: TaskPriority.HIGH,
                status: TaskStatus.IN_PROGRESS,
                startDate: "2026-07-15",
                dueDate: "2026-07-22",
                estimatedTime: 16,
                completionPercentage: 60,
                requiredFiles: true,
                attachments: [
                    { name: "wireframes_final.pdf", url: "#", size: "2.4 MB", type: "pdf" }
                ],
                checklist: [
                    { id: "chk_1", text: "تصميم الهيكل الرئيسي للمكونات", isCompleted: true },
                    { id: "chk_2", text: "ربط واجهة عرض البيانات مع خادم Express", isCompleted: true },
                    { id: "chk_3", text: "تضمين خيارات فرز وتصفية المهام", isCompleted: false },
                    { id: "chk_4", text: "التأكد من التوافقية الكاملة للهواتف والأجهزة اللوحية", isCompleted: false }
                ],
                tags: ["تصميم", "واجهات", "عربي"],
                category: "تطوير الواجهات",
                comments: [
                    { id: "c_1", userId: "usr_manager1", userName: "المهندس أحمد المنصوري", userRole: UserRole.MANAGER, text: "يرجى التركيز على جمالية الخطوط وتناسق الألوان المعتمدة للهوية المؤسسية.", createdAt: "2026-07-16T10:00:00.000Z" },
                    { id: "c_2", userId: "usr_emp1", userName: "عادل الشمري", userRole: UserRole.EMPLOYEE, text: "تم اعتماد خط 'Cairo' الأنيق وتجربة استخدام سلسة جداً. قيد الربط الآن.", createdAt: "2026-07-16T14:30:00.000Z" }
                ],
                history: [
                    { id: "hist_1", action: "إنشاء المهمة وتعيينها للموظف", performedBy: "usr_manager1", performedByName: "المهندس أحمد المنصوري", createdAt: "2026-07-15T09:00:00.000Z" },
                    { id: "hist_2", action: "بدء العمل على المهمة وتعديل النسبة إلى 30%", performedBy: "usr_emp1", performedByName: "عادل الشمري", createdAt: "2026-07-15T11:00:00.000Z" }
                ],
                createdAt: "2026-07-15T09:00:00.000Z"
            },
            {
                id: "task_2",
                companyId: "comp_1",
                projectId: "proj_erp",
                title: "إعداد صياغة نماذج التقييم اليومي الجديد للموظفين",
                description: "إعداد مصفوفة المعايير السبعة لتقييم الموظفين باللغة العربية وإرسالها للمدراء لاعتمادها.",
                departmentId: "dept_hr",
                assignedEmployeeId: "usr_emp2",
                assignedById: "usr_manager1",
                priority: TaskPriority.MEDIUM,
                status: TaskStatus.UNDER_REVIEW,
                startDate: "2026-07-16",
                dueDate: "2026-07-20",
                estimatedTime: 8,
                completionPercentage: 100,
                requiredFiles: true,
                attachments: [
                    { name: "evaluation_criteria_draft.docx", url: "#", size: "450 KB", type: "doc" }
                ],
                checklist: [
                    { id: "chk_5", text: "صياغة المعايير السبعة بدقة", isCompleted: true },
                    { id: "chk_6", text: "تحديد آلية احتساب النقاط التلقائية", isCompleted: true },
                    { id: "chk_7", text: "مراجعة الصياغة اللغوية والتأكد من وضوحها", isCompleted: true }
                ],
                tags: ["شؤون موظفين", "تقييم", "صياغة"],
                category: "الموارد البشرية",
                comments: [
                    { id: "c_3", userId: "usr_emp2", userName: "سارة الأحمد", userRole: UserRole.EMPLOYEE, text: "أرفقت المستند المكتمل للمراجعة والاعتماد.", createdAt: "2026-07-17T11:00:00.000Z" }
                ],
                history: [
                    { id: "hist_3", action: "إنشاء المهمة وتعيينها للموظف", performedBy: "usr_manager1", performedByName: "المهندس أحمد المنصوري", createdAt: "2026-07-16T10:00:00.000Z" },
                    { id: "hist_4", action: "تقديم المهمة للمراجعة ورفع ملف الاعتماد", performedBy: "usr_emp2", performedByName: "سارة الأحمد", createdAt: "2026-07-17T11:15:00.000Z" }
                ],
                createdAt: "2026-07-16T10:00:00.000Z"
            }
        ],
        evaluations: [
            {
                id: "eval_1",
                companyId: "comp_1",
                employeeId: "usr_emp1",
                evaluatorId: "usr_manager1",
                date: "2026-07-17",
                taskQuality: 9,
                speed: 8,
                commitment: 10,
                attendance: 10,
                communication: 9,
                problemSolving: 8,
                cooperation: 9,
                overallRating: 9,
                notes: "عادل يبدي التزاماً استثنائياً وسرعة كبيرة في إنجاز واجهات النظام العربي المطالب بها. تواصله مع الفريق ممتاز ويساهم بفعالية في حل المشكلات التقنية.",
                finalScore: 90
            }
        ],
        attendance: [
            { id: "att_1", companyId: "comp_1", employeeId: "usr_emp1", date: "2026-07-17", clockIn: "08:05:00", clockOut: "17:00:00", workingHours: 8.92, lateArrival: false, status: "present" },
            { id: "att_2", companyId: "comp_1", employeeId: "usr_emp2", date: "2026-07-17", clockIn: "08:35:00", clockOut: "17:00:00", workingHours: 8.42, lateArrival: true, status: "late" }
        ],
        files: [
            { id: "file_1", companyId: "comp_1", userId: "usr_emp1", userName: "عادل الشمري", name: "wireframes_final.pdf", size: "2.4 MB", type: "pdf", url: "#", uploadedAt: "2026-07-15T09:10:00.000Z", approvedByManager: true },
            { id: "file_2", companyId: "comp_1", userId: "usr_emp2", userName: "سارة الأحمد", name: "evaluation_criteria_draft.docx", size: "450 KB", type: "doc", url: "#", uploadedAt: "2026-07-17T11:15:00.000Z", approvedByManager: false }
        ],
        announcements: [
            { id: "ann_1", companyId: "comp_1", title: "إطلاق بوابتنا الرقمية الجديدة للموظفين", content: "يسعدنا جداً الإعلان عن البدء الرسمي لتشغيل نظام إدارة الموظفين والمهام المتكامل. ندعو جميع الزملاء للبدء بتسجيل حضورهم اليومي والاطلاع على مهامهم الموكلة من خلال النظام.", createdBy: "المهندس أحمد المنصوري", createdAt: "2026-07-15T08:00:00.000Z", priority: "urgent" }
        ],
        notifications: [
            { id: "not_1", companyId: "comp_1", userId: "usr_emp1", title: "مهمة جديدة مسندة إليك", message: "قام أحمد المنصوري بتعيين مهمة 'تصميم واجهة لوحة معلومات الموظفين باللغة العربية' إليك.", read: false, createdAt: "2026-07-15T09:01:00.000Z" },
            { id: "not_2", companyId: "comp_1", userId: "usr_emp2", title: "مهمة جديدة مسندة إليك", message: "قام أحمد المنصوري بتعيين مهمة 'إعداد صياغة نماذج التقييم اليومي الجديد للموظفين' إليك.", read: true, createdAt: "2026-07-16T10:01:00.000Z" }
        ],
        chatMessages: [
            { id: "msg_1", companyId: "comp_1", senderId: "usr_manager1", senderName: "المهندس أحمد المنصوري", receiverId: "all", message: "صباح الخير جميعاً، أرجو من الجميع الالتزام بتحديث نسب إنجاز المهام اليوم بشكل دوري.", createdAt: "2026-07-17T08:15:00.000Z" },
            { id: "msg_2", companyId: "comp_1", senderId: "usr_emp1", senderName: "عادل الشمري", receiverId: "all", message: "صباح النور مهندس أحمد، سأقوم بتحديث واجهات لوحة المهام فوراً بعد انتهاء المزامنة الحالية.", createdAt: "2026-07-17T08:22:00.000Z" }
        ],
        activityLogs: [
            { id: "log_init", companyId: "comp_1", userId: "usr_manager1", username: "manager", action: "تسجيل الدخول", ip: "127.0.0.1", details: "قام المهندس أحمد المنصوري بتسجيل الدخول للنظام.", createdAt: "2026-07-17T08:00:00.000Z" }
        ]
    };
}
// ----------------------------------------------------
// Authentication Middleware
// ----------------------------------------------------
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "غير مصرح. يرجى تسجيل الدخول أولاً." });
    }
    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: "انتهت الجلسة أو الرمز غير صالح." });
    }
    req.user = decoded;
    next();
}
// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------
// 1. Auth Endpoint
app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان." });
    }
    const db = loadDB();
    const user = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return res.status(401).json({ error: "خطأ في اسم المستخدم أو كلمة المرور." });
    }
    if (user.status !== "active") {
        return res.status(403).json({ error: "هذا الحساب معطل حالياً. يرجى مراجعة إدارة الشركة." });
    }
    // Check password hash
    const expectedHash = hashPassword(password, user.salt);
    if (user.passwordHash !== expectedHash) {
        return res.status(401).json({ error: "خطأ في اسم المستخدم أو كلمة المرور." });
    }
    const tokenPayload = {
        id: user.id,
        companyId: user.companyId,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
    };
    const token = signToken(tokenPayload);
    logActivity(user.id, user.username, user.companyId, "تسجيل دخول ناجح", `قام المستخدم ${user.name} بتسجيل الدخول بنجاح.`);
    res.json({
        token,
        user: {
            id: user.id,
            companyId: user.companyId,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
            position: user.position,
            status: user.status,
        },
    });
});
// 2. Companies (Super Admin Only)
app.get("/api/companies", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: "غير مصرح. هذه الصلاحية تقتصر على مدير النظام العام." });
    }
    const db = loadDB();
    res.json(db.companies);
});
app.post("/api/companies", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: "غير مصرح." });
    }
    const { name, subscriptionPlan, employeeLimit } = req.body;
    if (!name)
        return res.status(400).json({ error: "اسم الشركة مطلوب." });
    const db = loadDB();
    const newCompany = {
        id: `comp_${Date.now()}`,
        name,
        subscriptionPlan: subscriptionPlan || "basic",
        subscriptionStatus: "active",
        employeeLimit: employeeLimit || 20,
        createdAt: new Date().toISOString(),
    };
    db.companies.push(newCompany);
    saveDB(db);
    logActivity(req.user.id, req.user.username, "all", "إنشاء شركة جديدة", `تم إنشاء شركة جديدة باسم: ${name}`);
    res.status(201).json(newCompany);
});
// 3. Users Management (Manager/Supervisor/Employee context)
app.get("/api/users", authMiddleware, (req, res) => {
    const db = loadDB();
    let usersList = [];
    if (req.user.role === UserRole.SUPER_ADMIN) {
        usersList = db.users;
    }
    else {
        // Filter by company
        usersList = db.users.filter((u) => u.companyId === req.user.companyId);
    }
    // Remove password hashes before returning
    const safeUsers = usersList.map(({ passwordHash, salt, ...rest }) => rest);
    res.json(safeUsers);
});
app.post("/api/users", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER && req.user.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: "صلاحية إنشاء الموظفين تقتصر على مدير الشركة." });
    }
    const { username, password, name, email, role, departmentId, position, salary } = req.body;
    if (!username || !password || !name || !email || !role) {
        return res.status(400).json({ error: "جميع الحقول الأساسية مطلوبة." });
    }
    const db = loadDB();
    const exists = db.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
        return res.status(400).json({ error: "اسم المستخدم هذا مسجل مسبقاً." });
    }
    const salt = generateSalt();
    const newUser = {
        id: `usr_${Date.now()}`,
        companyId: req.user.role === UserRole.SUPER_ADMIN ? (req.body.companyId || "comp_1") : req.user.companyId,
        username,
        passwordHash: hashPassword(password, salt),
        salt,
        name,
        email,
        role,
        departmentId,
        position: position || "موظف",
        salary: Number(salary) || 4000,
        status: "active",
        createdAt: new Date().toISOString(),
        performanceScore: 100,
    };
    db.users.push(newUser);
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "إنشاء موظف جديد", `تم تسجيل موظف جديد باسم: ${name} (${position})`);
    const { passwordHash, salt: s, ...safeUser } = newUser;
    res.status(201).json(safeUser);
});
app.put("/api/users/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const db = loadDB();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1)
        return res.status(404).json({ error: "المستخدم غير موجود." });
    // Security check: must belong to same company unless super admin
    if (req.user.role !== UserRole.SUPER_ADMIN && db.users[index].companyId !== req.user.companyId) {
        return res.status(403).json({ error: "غير مصرح لك بتعديل مستخدمين لشركة أخرى." });
    }
    // Only Manager or self can update (with constraints)
    if (req.user.role !== UserRole.MANAGER && req.user.role !== UserRole.SUPER_ADMIN && req.user.id !== id) {
        return res.status(403).json({ error: "غير مصرح بتعديل بيانات هذا الموظف." });
    }
    const userToUpdate = db.users[index];
    const { name, email, position, salary, status, password, departmentId, role } = req.body;
    if (name)
        userToUpdate.name = name;
    if (email)
        userToUpdate.email = email;
    if (departmentId !== undefined)
        userToUpdate.departmentId = departmentId;
    // Role, salary, status updates restricted to Manager/SuperAdmin
    if (req.user.role === UserRole.MANAGER || req.user.role === UserRole.SUPER_ADMIN) {
        if (position)
            userToUpdate.position = position;
        if (salary !== undefined)
            userToUpdate.salary = Number(salary);
        if (status)
            userToUpdate.status = status;
        if (role)
            userToUpdate.role = role;
    }
    if (password) {
        const salt = generateSalt();
        userToUpdate.salt = salt;
        userToUpdate.passwordHash = hashPassword(password, salt);
    }
    db.users[index] = userToUpdate;
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "تحديث بيانات مستخدم", `تم تعديل بيانات المستخدم: ${userToUpdate.name}`);
    const { passwordHash, salt: s, ...safeUser } = userToUpdate;
    res.json(safeUser);
});
app.delete("/api/users/:id", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER && req.user.role !== UserRole.SUPER_ADMIN) {
        return res.status(403).json({ error: "صلاحية حذف الموظفين تقتصر على المدير." });
    }
    const { id } = req.params;
    const db = loadDB();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1)
        return res.status(404).json({ error: "المستخدم غير موجود." });
    const deletedUser = db.users[index];
    db.users.splice(index, 1);
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "حذف حساب موظف", `تم حذف حساب الموظف: ${deletedUser.name}`);
    res.json({ success: true, message: "تم حذف الموظف بنجاح." });
});
// 4. Departments
app.get("/api/departments", authMiddleware, (req, res) => {
    const db = loadDB();
    const list = db.departments.filter((d) => d.companyId === req.user.companyId);
    res.json(list);
});
app.post("/api/departments", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ error: "صلاحية إدارة الأقسام تقتصر على مدير الشركة." });
    }
    const { name, description, managerId } = req.body;
    if (!name)
        return res.status(400).json({ error: "اسم القسم مطلوب." });
    const db = loadDB();
    const newDept = {
        id: `dept_${Date.now()}`,
        companyId: req.user.companyId,
        name,
        description: description || "",
        managerId: managerId || "",
        createdAt: new Date().toISOString(),
    };
    db.departments.push(newDept);
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "إنشاء قسم جديد", `تم إنشاء قسم جديد باسم: ${name}`);
    res.status(201).json(newDept);
});
app.put("/api/departments/:id", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ error: "صلاحية التعديل تقتصر على مدير الشركة." });
    }
    const { id } = req.params;
    const { name, description, managerId } = req.body;
    const db = loadDB();
    const index = db.departments.findIndex((d) => d.id === id && d.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "القسم غير موجود." });
    if (name)
        db.departments[index].name = name;
    if (description !== undefined)
        db.departments[index].description = description;
    if (managerId !== undefined)
        db.departments[index].managerId = managerId;
    saveDB(db);
    res.json(db.departments[index]);
});
app.delete("/api/departments/:id", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ error: "صلاحية الحذف تقتصر على مدير الشركة." });
    }
    const { id } = req.params;
    const db = loadDB();
    const index = db.departments.findIndex((d) => d.id === id && d.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "القسم غير موجود." });
    db.departments.splice(index, 1);
    saveDB(db);
    res.json({ success: true, message: "تم حذف القسم بنجاح." });
});
// 5. Projects
app.get("/api/projects", authMiddleware, (req, res) => {
    const db = loadDB();
    const list = db.projects.filter((p) => p.companyId === req.user.companyId);
    res.json(list);
});
app.post("/api/projects", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ error: "صلاحية إنشاء المشاريع تقتصر على المدير." });
    }
    const { name, description, departmentId, startDate, endDate, status } = req.body;
    if (!name)
        return res.status(400).json({ error: "اسم المشروع مطلوب." });
    const db = loadDB();
    const newProj = {
        id: `proj_${Date.now()}`,
        companyId: req.user.companyId,
        name,
        description: description || "",
        departmentId: departmentId || "",
        status: status || "active",
        startDate: startDate || new Date().toISOString().split("T")[0],
        endDate: endDate || "",
        progress: 0,
        createdAt: new Date().toISOString(),
    };
    db.projects.push(newProj);
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "إنشاء مشروع جديد", `تم إنشاء مشروع جديد: ${name}`);
    res.status(201).json(newProj);
});
app.put("/api/projects/:id", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER)
        return res.status(403).json({ error: "غير مصرح." });
    const { id } = req.params;
    const db = loadDB();
    const index = db.projects.findIndex((p) => p.id === id && p.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "المشروع غير موجود." });
    const { name, description, departmentId, status, startDate, endDate, progress } = req.body;
    if (name)
        db.projects[index].name = name;
    if (description !== undefined)
        db.projects[index].description = description;
    if (departmentId !== undefined)
        db.projects[index].departmentId = departmentId;
    if (status)
        db.projects[index].status = status;
    if (startDate)
        db.projects[index].startDate = startDate;
    if (endDate)
        db.projects[index].endDate = endDate;
    if (progress !== undefined)
        db.projects[index].progress = Number(progress);
    saveDB(db);
    res.json(db.projects[index]);
});
app.delete("/api/projects/:id", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER)
        return res.status(403).json({ error: "غير مصرح." });
    const { id } = req.params;
    const db = loadDB();
    const index = db.projects.findIndex((p) => p.id === id && p.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "المشروع غير موجود." });
    db.projects.splice(index, 1);
    saveDB(db);
    res.json({ success: true, message: "تم حذف المشروع بنجاح." });
});
// 6. Tasks Management (Assigned tasks, Comments, Checklist, Upload files, Approve/Reject)
app.get("/api/tasks", authMiddleware, (req, res) => {
    const db = loadDB();
    let list = db.tasks.filter((t) => t.companyId === req.user.companyId);
    // If Employee, they should only see tasks assigned to them, or to their department (optional, we filter by assignedEmployeeId for strict dashboard)
    if (req.user.role === UserRole.EMPLOYEE) {
        list = list.filter((t) => t.assignedEmployeeId === req.user.id);
    }
    else if (req.user.role === UserRole.SUPERVISOR) {
        // Supervisors see all tasks in their department
        if (req.user.departmentId) {
            list = list.filter((t) => t.departmentId === req.user.departmentId);
        }
    }
    res.json(list);
});
app.post("/api/tasks", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER && req.user.role !== UserRole.SUPERVISOR) {
        return res.status(403).json({ error: "تقتصر صلاحية إسناد المهام على المدراء والمشرفين." });
    }
    const { title, description, projectId, departmentId, assignedEmployeeId, priority, startDate, dueDate, estimatedTime, requiredFiles, tags, category } = req.body;
    if (!title || !assignedEmployeeId || !dueDate) {
        return res.status(400).json({ error: "العنوان، الموظف المسؤول، وتاريخ الاستحقاق حقول مطلوبة." });
    }
    const db = loadDB();
    const newTask = {
        id: `task_${Date.now()}`,
        companyId: req.user.companyId,
        projectId: projectId || "",
        title,
        description: description || "",
        departmentId: departmentId || "",
        assignedEmployeeId,
        assignedById: req.user.id,
        priority: priority || TaskPriority.MEDIUM,
        status: TaskStatus.PENDING,
        startDate: startDate || new Date().toISOString().split("T")[0],
        dueDate,
        estimatedTime: Number(estimatedTime) || 4,
        completionPercentage: 0,
        requiredFiles: requiredFiles === true || requiredFiles === "true",
        attachments: [],
        comments: [],
        checklist: (req.body.checklist || []).map((text, i) => ({ id: `chk_${Date.now()}_${i}`, text, isCompleted: false })),
        tags: tags || [],
        category: category || "عام",
        history: [
            { id: `hist_${Date.now()}`, action: "إنشاء المهمة وتكليف الموظف بها", performedBy: req.user.id, performedByName: req.user.name, createdAt: new Date().toISOString() }
        ],
        createdAt: new Date().toISOString(),
    };
    db.tasks.push(newTask);
    // Push system notification for the assigned employee
    db.notifications.unshift({
        id: `not_${Date.now()}`,
        companyId: req.user.companyId,
        userId: assignedEmployeeId,
        title: "مهمة عمل جديدة مسندة إليك",
        message: `قام ${req.user.name} بتعيين مهمة جديدة لك: "${title}". تاريخ التسليم: ${dueDate}`,
        read: false,
        createdAt: new Date().toISOString(),
    });
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "إسناد مهمة جديدة", `تم إسناد مهمة: "${title}" للموظف.`);
    res.status(201).json(newTask);
});
app.put("/api/tasks/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const db = loadDB();
    const index = db.tasks.findIndex((t) => t.id === id && t.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "المهمة غير موجودة." });
    const task = db.tasks[index];
    const { status, completionPercentage, checklist, title, description, priority, dueDate, assignedEmployeeId, requiredFiles, tags, category } = req.body;
    // Track state change
    const oldStatus = task.status;
    const oldProgress = task.completionPercentage;
    // Permissions validation
    if (req.user.role === UserRole.EMPLOYEE) {
        // Employees can only update status, progress, checklist and comments
        if (status)
            task.status = status;
        if (completionPercentage !== undefined)
            task.completionPercentage = Number(completionPercentage);
        if (checklist)
            task.checklist = checklist;
    }
    else {
        // Managers/Supervisors can update everything
        if (status)
            task.status = status;
        if (completionPercentage !== undefined)
            task.completionPercentage = Number(completionPercentage);
        if (checklist)
            task.checklist = checklist;
        if (title)
            task.title = title;
        if (description !== undefined)
            task.description = description;
        if (priority)
            task.priority = priority;
        if (dueDate)
            task.dueDate = dueDate;
        if (assignedEmployeeId)
            task.assignedEmployeeId = assignedEmployeeId;
        if (requiredFiles !== undefined)
            task.requiredFiles = requiredFiles;
        if (tags)
            task.tags = tags;
        if (category)
            task.category = category;
    }
    // Audit history
    let auditAction = "";
    if (oldStatus !== task.status) {
        auditAction = `تغيير حالة المهمة من (${oldStatus}) إلى (${task.status})`;
    }
    else if (oldProgress !== task.completionPercentage) {
        auditAction = `تحديث نسبة الإنجاز إلى ${task.completionPercentage}%`;
    }
    else {
        auditAction = "تحديث تفاصيل المهمة";
    }
    task.history.unshift({
        id: `hist_${Date.now()}`,
        action: auditAction,
        performedBy: req.user.id,
        performedByName: req.user.name,
        createdAt: new Date().toISOString(),
    });
    // If status changed to UNDER_REVIEW, notify supervisor/manager
    if (task.status === TaskStatus.UNDER_REVIEW && oldStatus !== TaskStatus.UNDER_REVIEW) {
        // Notify creator/manager
        db.notifications.unshift({
            id: `not_${Date.now()}`,
            companyId: req.user.companyId,
            userId: task.assignedById,
            title: "مهمة مكتملة قيد المراجعة",
            message: `قام الموظف ${req.user.name} بتسليم مهمة "${task.title}" للمراجعة.`,
            read: false,
            createdAt: new Date().toISOString(),
        });
    }
    // If status changed to COMPLETED (approved by manager)
    if (task.status === TaskStatus.COMPLETED && oldStatus !== TaskStatus.COMPLETED) {
        db.notifications.unshift({
            id: `not_${Date.now()}`,
            companyId: req.user.companyId,
            userId: task.assignedEmployeeId,
            title: "تهانينا! تم اعتماد مهمتك",
            message: `تمت الموافقة واعتماد مهمتك المكتملة: "${task.title}" من قبل الإدارة.`,
            read: false,
            createdAt: new Date().toISOString(),
        });
    }
    // If status changed to REJECTED (needs modification)
    if (task.status === TaskStatus.REJECTED && oldStatus !== TaskStatus.REJECTED) {
        db.notifications.unshift({
            id: `not_${Date.now()}`,
            companyId: req.user.companyId,
            userId: task.assignedEmployeeId,
            title: "تم رفض تسليم المهمة - تتطلب تعديل",
            message: `تم رفض تسليم مهمة "${task.title}" من قبل الإدارة وتتطلب تعديلاً. يرجى الاطلاع على التعليقات.`,
            read: false,
            createdAt: new Date().toISOString(),
        });
    }
    db.tasks[index] = task;
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "تحديث مهمة", `تم تحديث المهمة "${task.title}": ${auditAction}`);
    res.json(task);
});
app.post("/api/tasks/:id/comments", authMiddleware, (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    if (!text)
        return res.status(400).json({ error: "محتوى التعليق مطلوب." });
    const db = loadDB();
    const index = db.tasks.findIndex((t) => t.id === id && t.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "المهمة غير موجودة." });
    const comment = {
        id: `comm_${Date.now()}`,
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        text,
        createdAt: new Date().toISOString(),
    };
    db.tasks[index].comments.push(comment);
    db.tasks[index].history.unshift({
        id: `hist_${Date.now()}`,
        action: `إضافة تعليق جديد: "${text.substring(0, 30)}..."`,
        performedBy: req.user.id,
        performedByName: req.user.name,
        createdAt: new Date().toISOString(),
    });
    saveDB(db);
    res.status(201).json(comment);
});
app.delete("/api/tasks/:id", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ error: "صلاحية حذف المهام تقتصر على مدير الشركة." });
    }
    const { id } = req.params;
    const db = loadDB();
    const index = db.tasks.findIndex((t) => t.id === id && t.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "المهمة غير موجودة." });
    const deletedTask = db.tasks[index];
    db.tasks.splice(index, 1);
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "حذف مهمة", `تم حذف مهمة: "${deletedTask.title}"`);
    res.json({ success: true, message: "تم حذف المهمة بنجاح." });
});
// 7. Daily Evaluations
app.get("/api/evaluations", authMiddleware, (req, res) => {
    const db = loadDB();
    let list = db.evaluations.filter((e) => e.companyId === req.user.companyId);
    // Employees can only view their own evaluations
    if (req.user.role === UserRole.EMPLOYEE) {
        list = list.filter((e) => e.employeeId === req.user.id);
    }
    res.json(list);
});
app.post("/api/evaluations", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER && req.user.role !== UserRole.SUPERVISOR) {
        return res.status(403).json({ error: "تقتصر صلاحية تقييم الموظفين على المدراء والمشرفين." });
    }
    const { employeeId, date, taskQuality, speed, commitment, attendance, communication, problemSolving, cooperation, notes } = req.body;
    if (!employeeId || !date) {
        return res.status(400).json({ error: "الموظف والتاريخ حقول مطلوبة للتقييم." });
    }
    // Calculate scores
    const q = Number(taskQuality) || 10;
    const s = Number(speed) || 10;
    const com = Number(commitment) || 10;
    const att = Number(attendance) || 10;
    const comm = Number(communication) || 10;
    const prob = Number(problemSolving) || 10;
    const coop = Number(cooperation) || 10;
    const overallRating = Math.round(((q + s + com + att + comm + prob + coop) / 7) * 10) / 10;
    const finalScore = Math.round(overallRating * 10); // Out of 100%
    const db = loadDB();
    // Check if evaluation for this employee on this date already exists. If yes, overwrite or error.
    const existingIndex = db.evaluations.findIndex((e) => e.employeeId === employeeId && e.date === date);
    const evaluationObj = {
        id: existingIndex !== -1 ? db.evaluations[existingIndex].id : `eval_${Date.now()}`,
        companyId: req.user.companyId,
        employeeId,
        evaluatorId: req.user.id,
        date,
        taskQuality: q,
        speed: s,
        commitment: com,
        attendance: att,
        communication: comm,
        problemSolving: prob,
        cooperation: coop,
        overallRating,
        notes: notes || "",
        finalScore,
    };
    if (existingIndex !== -1) {
        db.evaluations[existingIndex] = evaluationObj;
    }
    else {
        db.evaluations.push(evaluationObj);
    }
    // Update user's aggregate performance score
    const empIndex = db.users.findIndex((u) => u.id === employeeId);
    if (empIndex !== -1) {
        const empEvals = db.evaluations.filter((e) => e.employeeId === employeeId);
        const sum = empEvals.reduce((acc, curr) => acc + curr.finalScore, 0);
        db.users[empIndex].performanceScore = Math.round(sum / empEvals.length);
    }
    // Push notification for employee
    db.notifications.unshift({
        id: `not_${Date.now()}`,
        companyId: req.user.companyId,
        userId: employeeId,
        title: "تم نشر تقييم الأداء اليومي الخاص بك",
        message: `تم نشر تقييمك ليوم ${date} بمعدل إجمالي ${finalScore}%. يمكنك الاطلاع على تفاصيل التقييم وملاحظات الإدارة الآن.`,
        read: false,
        createdAt: new Date().toISOString(),
    });
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "تقييم أداء موظف", `تم تسجيل تقييم أداء للموظف ذي المعرف ${employeeId} ليوم ${date}`);
    res.status(201).json(evaluationObj);
});
// 8. Attendance (Clock-In, Clock-Out, Leave Requests, Vacation)
app.get("/api/attendance", authMiddleware, (req, res) => {
    const db = loadDB();
    let list = db.attendance.filter((a) => a.companyId === req.user.companyId);
    if (req.user.role === UserRole.EMPLOYEE) {
        list = list.filter((a) => a.employeeId === req.user.id);
    }
    res.json(list);
});
app.post("/api/attendance/clock-in", authMiddleware, (req, res) => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = new Date().toTimeString().split(" ")[0]; // HH:MM:SS
    const db = loadDB();
    // Check if clockIn already exists for today
    const existing = db.attendance.find((a) => a.employeeId === req.user.id && a.date === todayStr);
    if (existing && existing.clockIn) {
        return res.status(400).json({ error: "لقد قمت بتسجيل الحضور مسبقاً لهذا اليوم." });
    }
    // Check if late (e.g., standard starting hour is 08:30:00)
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const isLate = currentHour > 8 || (currentHour === 8 && currentMinute > 30);
    const newAttendance = {
        id: existing ? existing.id : `att_${Date.now()}`,
        companyId: req.user.companyId,
        employeeId: req.user.id,
        date: todayStr,
        clockIn: timeStr,
        lateArrival: isLate,
        status: isLate ? "late" : "present",
    };
    if (existing) {
        Object.assign(existing, newAttendance);
    }
    else {
        db.attendance.push(newAttendance);
    }
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "تسجيل الحضور", `قام الموظف بتسجيل الحضور في تمام الساعة ${timeStr}`);
    res.json(newAttendance);
});
app.post("/api/attendance/clock-out", authMiddleware, (req, res) => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const timeStr = new Date().toTimeString().split(" ")[0]; // HH:MM:SS
    const db = loadDB();
    const attendanceRecord = db.attendance.find((a) => a.employeeId === req.user.id && a.date === todayStr);
    if (!attendanceRecord || !attendanceRecord.clockIn) {
        return res.status(400).json({ error: "لا يمكنك تسجيل الانصراف دون تسجيل الحضور أولاً." });
    }
    if (attendanceRecord.clockOut) {
        return res.status(400).json({ error: "لقد قمت بتسجيل الانصراف مسبقاً لهذا اليوم." });
    }
    attendanceRecord.clockOut = timeStr;
    // Calculate working hours
    const [inH, inM, inS] = attendanceRecord.clockIn.split(":").map(Number);
    const [outH, outM, outS] = timeStr.split(":").map(Number);
    const inDate = new Date(2026, 6, 18, inH, inM, inS);
    const outDate = new Date(2026, 6, 18, outH, outM, outS);
    const hours = Math.round(((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60)) * 100) / 100;
    attendanceRecord.workingHours = hours;
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "تسجيل الانصراف", `قام الموظف بتسجيل الانصراف في تمام الساعة ${timeStr}. ساعات العمل: ${hours}`);
    res.json(attendanceRecord);
});
app.post("/api/attendance/leave-request", authMiddleware, (req, res) => {
    const { date, status, leaveReason } = req.body; // status can be vacation, leave
    if (!date || !status) {
        return res.status(400).json({ error: "التاريخ ونوع الإجازة مطلوبان." });
    }
    const db = loadDB();
    const newLeave = {
        id: `att_${Date.now()}`,
        companyId: req.user.companyId,
        employeeId: req.user.id,
        date,
        status,
        lateArrival: false,
        leaveReason: leaveReason || "",
    };
    db.attendance.push(newLeave);
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "طلب إجازة", `تم تسجيل طلب إجازة (${status}) لتاريخ ${date}`);
    res.json(newLeave);
});
// 9. Files Management (Upload, Download, Approve)
app.get("/api/files", authMiddleware, (req, res) => {
    const db = loadDB();
    let list = db.files.filter((f) => f.companyId === req.user.companyId);
    // Employees can only view files they uploaded, or general approved files
    if (req.user.role === UserRole.EMPLOYEE) {
        list = list.filter((f) => f.userId === req.user.id || f.approvedByManager);
    }
    res.json(list);
});
app.post("/api/files/upload", authMiddleware, (req, res) => {
    const { name, size, type, contentBase64, taskId } = req.body;
    if (!name || !contentBase64) {
        return res.status(400).json({ error: "اسم الملف ومحتواه بصيغة Base64 مطلوبان." });
    }
    const db = loadDB();
    const fileId = `file_${Date.now()}`;
    // In a real server we would save the base64 string to a file, let's write it to local folder
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFileName = `${fileId}_${name}`;
    const localFilePath = path.join(uploadDir, localFileName);
    try {
        const buffer = Buffer.from(contentBase64.split(",")[1] || contentBase64, "base64");
        fs.writeFileSync(localFilePath, buffer);
    }
    catch (err) {
        console.error("Error writing base64 file to disk", err);
    }
    const newFile = {
        id: fileId,
        companyId: req.user.companyId,
        userId: req.user.id,
        userName: req.user.name,
        name,
        size: size || "1.2 MB",
        type: type || "pdf",
        url: `/uploads/${localFileName}`, // serve via Express static
        uploadedAt: new Date().toISOString(),
        approvedByManager: req.user.role === UserRole.MANAGER || req.user.role === UserRole.SUPERVISOR,
    };
    db.files.push(newFile);
    // If taskId provided, append this file to task attachments automatically
    if (taskId) {
        const taskIndex = db.tasks.findIndex((t) => t.id === taskId && t.companyId === req.user.companyId);
        if (taskIndex !== -1) {
            db.tasks[taskIndex].attachments.push({
                name,
                url: newFile.url,
                size: newFile.size,
                type: newFile.type,
            });
            db.tasks[taskIndex].history.unshift({
                id: `hist_${Date.now()}`,
                action: `رفع مستند جديد للمهمة: ${name}`,
                performedBy: req.user.id,
                performedByName: req.user.name,
                createdAt: new Date().toISOString(),
            });
        }
    }
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "رفع مستند جديد", `قام برفع ملف: ${name}`);
    res.status(201).json(newFile);
});
app.put("/api/files/:id/approve", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ error: "صلاحية اعتماد الملفات تقتصر على المدير." });
    }
    const { id } = req.params;
    const db = loadDB();
    const index = db.files.findIndex((f) => f.id === id && f.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "الملف غير موجود." });
    db.files[index].approvedByManager = true;
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "اعتماد ملف", `تم اعتماد الملف: ${db.files[index].name}`);
    res.json(db.files[index]);
});
app.delete("/api/files/:id", authMiddleware, (req, res) => {
    const { id } = req.params;
    const db = loadDB();
    const index = db.files.findIndex((f) => f.id === id && f.companyId === req.user.companyId);
    if (index === -1)
        return res.status(404).json({ error: "الملف غير موجود." });
    // Only the creator or the Manager can delete
    if (req.user.role !== UserRole.MANAGER && db.files[index].userId !== req.user.id) {
        return res.status(403).json({ error: "غير مصرح لك بحذف هذا الملف." });
    }
    const deletedFile = db.files[index];
    db.files.splice(index, 1);
    saveDB(db);
    // Try to delete local file on disk
    const localFileName = deletedFile.url.split("/uploads/")[1];
    if (localFileName) {
        const localFilePath = path.join(process.cwd(), "uploads", localFileName);
        if (fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            }
            catch (err) {
                console.error("Error deleting local file on disk", err);
            }
        }
    }
    logActivity(req.user.id, req.user.username, req.user.companyId, "حذف ملف", `تم حذف ملف: ${deletedFile.name}`);
    res.json({ success: true, message: "تم حذف الملف بنجاح." });
});
// Serve local uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// 10. Chat & Messaging (Task discussion & general company chat)
app.get("/api/messages", authMiddleware, (req, res) => {
    const db = loadDB();
    const list = db.chatMessages.filter((m) => m.companyId === req.user.companyId);
    res.json(list);
});
app.post("/api/messages", authMiddleware, (req, res) => {
    const { message, receiverId } = req.body;
    if (!message)
        return res.status(400).json({ error: "نص الرسالة مطلوب." });
    const db = loadDB();
    const newMsg = {
        id: `msg_${Date.now()}`,
        companyId: req.user.companyId,
        senderId: req.user.id,
        senderName: req.user.name,
        receiverId: receiverId || "all", // 'all' indicates general discussion wall
        message,
        createdAt: new Date().toISOString(),
    };
    db.chatMessages.push(newMsg);
    saveDB(db);
    res.status(201).json(newMsg);
});
// 11. Announcements
app.get("/api/announcements", authMiddleware, (req, res) => {
    const db = loadDB();
    const list = db.announcements.filter((a) => a.companyId === req.user.companyId);
    res.json(list);
});
app.post("/api/announcements", authMiddleware, (req, res) => {
    if (req.user.role !== UserRole.MANAGER) {
        return res.status(403).json({ error: "صلاحية نشر الإعلانات تقتصر على مدير الشركة." });
    }
    const { title, content, priority } = req.body;
    if (!title || !content)
        return res.status(400).json({ error: "العنوان ومحتوى الإعلان حقول مطلوبة." });
    const db = loadDB();
    const newAnn = {
        id: `ann_${Date.now()}`,
        companyId: req.user.companyId,
        title,
        content,
        createdBy: req.user.name,
        createdAt: new Date().toISOString(),
        priority: priority || "normal",
    };
    db.announcements.unshift(newAnn);
    // Trigger notification for all active employees in company
    db.users.forEach((user) => {
        if (user.companyId === req.user.companyId && user.id !== req.user.id) {
            db.notifications.unshift({
                id: `not_${Date.now()}_${user.id.substring(4)}`,
                companyId: req.user.companyId,
                userId: user.id,
                title: "إعلان إداري هام جديد",
                message: `نشر المدير العام إعلاناً جديداً بعنوان: "${title}". يرجى الاطلاع على التفاصيل.`,
                read: false,
                createdAt: new Date().toISOString(),
            });
        }
    });
    saveDB(db);
    logActivity(req.user.id, req.user.username, req.user.companyId, "نشر إعلان مؤسسي", `تم نشر إعلان: "${title}" لجميع الموظفين.`);
    res.status(201).json(newAnn);
});
// 12. Notifications
app.get("/api/notifications", authMiddleware, (req, res) => {
    const db = loadDB();
    const list = db.notifications.filter((n) => n.userId === req.user.id && n.companyId === req.user.companyId);
    res.json(list);
});
app.put("/api/notifications/:id/read", authMiddleware, (req, res) => {
    const { id } = req.params;
    const db = loadDB();
    const index = db.notifications.findIndex((n) => n.id === id && n.userId === req.user.id);
    if (index !== -1) {
        db.notifications[index].read = true;
        saveDB(db);
    }
    res.json({ success: true });
});
app.put("/api/notifications/read-all", authMiddleware, (req, res) => {
    const db = loadDB();
    db.notifications.forEach((n) => {
        if (n.userId === req.user.id) {
            n.read = true;
        }
    });
    saveDB(db);
    res.json({ success: true });
});
// 13. System Activity Logs (Audit log)
app.get("/api/activity-logs", authMiddleware, (req, res) => {
    const db = loadDB();
    let list = db.activityLogs;
    if (req.user.role !== UserRole.SUPER_ADMIN) {
        // Managers/Supervisors only see their company logs
        list = list.filter((l) => l.companyId === req.user.companyId);
    }
    res.json(list);
});
// ----------------------------------------------------
// AI GEMINI POWERED ENDPOINTS
// ----------------------------------------------------
// 1. AI Assistant Daily Evaluation Writer
app.post("/api/gemini/generate-evaluation", authMiddleware, async (req, res) => {
    const { employeeName, position, taskQuality, speed, commitment, attendance, communication, notes } = req.body;
    const prompt = `
أنت خبير موارد بشرية ومستشار تطوير أداء قيادي متميز في الشرق الأوسط.
المهمة: كتابة صياغة أداء وتقييم يومي باللغة العربية بأسلوب احترافي ومحفز وموضوعي للغاية ليتم إدراجه في السجل المهني الرسمي للموظف.

تفاصيل الموظف:
- الاسم: ${employeeName}
- المسمى الوظيفي: ${position}

درجات التقييم (من 10):
- جودة المهام: ${taskQuality}/10
- السرعة في التنفيذ: ${speed}/10
- الالتزام بالوقت والجدول: ${commitment}/10
- الحضور والانضباط: ${attendance}/10
- مهارات التواصل: ${communication}/10

ملاحظات عامة مضافة من المدير:
"${notes || "لا توجد ملاحظات إضافية"}"

المطلوب: صياغة فقرة شاملة بليغة باللغة العربية الفصحى للمدير العام تحتوي على:
1. إشادة موضوعية دقيقة بنقاط القوة المتمثلة في درجاته المرتفعة.
2. نصيحة عملية وتوجيه مهني راقٍ وبناء لتطوير الجوانب المتوسطة أو الضعيفة إن وجدت.
3. عبارة تحفيزية ختامية تلهم الموظف لتقديم الأفضل.
اجعل الصياغة مهنية تليق بشركات تقنية واستشارية رائدة، ومباشرة بدون مقدمات زائدة أو حشو.
  `;
    try {
        const ai = getAIClient();
        if (!ai) {
            return res.json({
                text: `أداء متميز وجدية واضحة من الزميل ${employeeName} في تنفيذ مهامه كـ ${position}. يظهر التزاماً كبيراً في العمل والتواجد اليومي بالقسم. يرجى الاستمرار على هذا المستوى العالي والعمل على زيادة وتيرة التواصل لمشاركة التحديات وحلها أولاً بأول.`
            });
        }
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
        });
        res.json({ text: response.text });
    }
    catch (error) {
        console.error("Gemini Daily Evaluation API Error:", error);
        res.status(500).json({ error: "فشل استدعاء الذكاء الاصطناعي لإنشاء التقييم. يرجى المحاولة لاحقاً." });
    }
});
// 2. AI Executive Departmental Report Generator
app.post("/api/gemini/generate-report", authMiddleware, async (req, res) => {
    const { departmentName, totalEmployees, totalTasks, completedTasks, pendingTasks, lateTasks, avgPerformance } = req.body;
    const prompt = `
أنت المدير التنفيذي لشركة استشارية كبرى ومحلل بيانات أعمال متميز.
المهمة: تحليل مؤشرات الأداء الحالية لقسم "${departmentName}" وصياغة ملخص تنفيذي (Executive Summary) مهني باللغة العربية بالكامل يقدم لمجلس الإدارة.

مؤشرات الأداء للقسم:
- إجمالي عدد الموظفين: ${totalEmployees} موظفاً
- إجمالي المهام الموكلة: ${totalTasks} مهمة
- المهام المكتملة بنجاح: ${completedTasks} مهمة
- المهام المعلقة/قيد التنفيذ: ${pendingTasks} مهمة
- المهام المتأخرة والحرجة: ${lateTasks} مهمة
- متوسط التقييم الإجمالي للقسم: ${avgPerformance}%

المطلوب صياغته باللغة العربية الفصحى والأرقام التحليلية:
1. تقييم سريع للوضع الراهن للقسم ومعدل كفاءة إنجاز المهام.
2. تحديد التحديات أو مواطن الخلل (خاصة إذا كان هناك عدد مهام متأخرة أو متوسط تقييم منخفض) بشكل علمي ومنهجي.
3. ثلاث توصيات استراتيجية عاجلة وملموسة وقابلة للتطبيق لتحسين مؤشرات الأداء في الربع القادم.
اجعل الأسلوب رسمياً، دقيقاً، ومركزاً جداً على لغة الأرقام والتخطيط الاستراتيجي.
  `;
    try {
        const ai = getAIClient();
        if (!ai) {
            return res.json({
                text: `ملخص تنفيذي لقسم ${departmentName}:\n\nيُظهر القسم استقراراً تشغيلياً بمعدل تقييم إجمالي يبلغ ${avgPerformance}%. مع إنجاز ${completedTasks} مهمة من أصل ${totalTasks}، ينبغي تعزيز مهارات التخطيط وجدولة المهام لتلافي المتأخرات الحرجة وتوزيع الأعباء الوظيفية بأسلوب متوازن بين الكفاءات لرفع الانتاجية.`
            });
        }
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
        });
        res.json({ text: response.text });
    }
    catch (error) {
        console.error("Gemini Report Generation API Error:", error);
        res.status(500).json({ error: "فشل استدعاء الذكاء الاصطناعي لإنشاء التقرير التحليلي." });
    }
});
// ----------------------------------------------------
// Standalone Server Starter
// ----------------------------------------------------
async function startServer() {
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Enterprise Management System] Standalone API Backend is active on http://0.0.0.0:${PORT}`);
    });
}
startServer();
