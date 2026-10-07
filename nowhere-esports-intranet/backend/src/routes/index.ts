import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes   from './auth.routes';
import userRoutes   from './user.routes';
import adminRoutes  from './admin.routes';
import employeeRoutes from './employee.routes';
import departmentRoutes from './department.routes';
import officeRoutes from './office.routes';
import teamRoutes from './team.routes';
import directoryRoutes from './directory.routes';
import announcementRoutes from './announcement.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import playerRoutes from './player.routes';
import coachRoutes from './coach.routes';
import tournamentRoutes from './tournament.routes';
import matchRoutes from './match.routes';
import practiceRoutes from './practice.routes';
import statisticsRoutes from './statistics.routes';
import { config }   from '../config/app';

// ---------------------------------------------------------------------------
// Central route registry — mounts all route groups.
// ---------------------------------------------------------------------------

const router = Router();

// ── Health (no versioning — for load balancers & orchestrators) ────────────
router.use('/health', healthRoutes);

// ── API v1 ─────────────────────────────────────────────────────────────────
const apiBase = `/api/${config.server.apiVersion}`;

router.use(`${apiBase}/auth`,          authRoutes);
router.use(`${apiBase}/users`,         userRoutes);
router.use(`${apiBase}/admin`,         adminRoutes);
router.use(`${apiBase}/employees`,     employeeRoutes);
router.use(`${apiBase}/departments`,   departmentRoutes);
router.use(`${apiBase}/offices`,       officeRoutes);
router.use(`${apiBase}/teams`,         teamRoutes);
router.use(`${apiBase}/directory`,     directoryRoutes);
router.use(`${apiBase}/announcements`, announcementRoutes);
router.use(`${apiBase}/notifications`, notificationRoutes);
router.use(`${apiBase}/dashboard`,     dashboardRoutes);
router.use(`${apiBase}/players`,       playerRoutes);
router.use(`${apiBase}/coaches`,       coachRoutes);
router.use(`${apiBase}/tournaments`,   tournamentRoutes);
router.use(`${apiBase}/matches`,       matchRoutes);
router.use(`${apiBase}/practices`,     practiceRoutes);
router.use(`${apiBase}/statistics`,    statisticsRoutes);

export { config };
export default router;
