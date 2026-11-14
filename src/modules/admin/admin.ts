import { Router } from "express";
import { AdminController } from "./admin.controller";

const adminRouter: Router = Router();

// Secure all admin API endpoints with Admin Key
adminRouter.use(AdminController.checkAuth);

adminRouter.get("/verifications", AdminController.getAllVerifications);
adminRouter.patch("/verify/:id/status", AdminController.updateStatus);
adminRouter.get("/document/:filename", AdminController.serveDocument);

export default adminRouter;

