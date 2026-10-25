import { Router } from "express";
import { upload } from "./multerConfig";
import { IdashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import authMiddleware from "../../middleware/auth.middleware";
import { responseHandler } from "../../utils/resposeHandler";

const dashboardRouter: Router = Router();
const dashboardService = new DashboardService()
const dashboardController = IdashboardController(dashboardService)


dashboardRouter.post(
    "/verify",
    authMiddleware,
    upload.fields([
        { name: "documentFront", maxCount: 1 },
        { name: "documentBack", maxCount: 1 },
    ]),
    responseHandler(dashboardController.verifyAccount)
);


export default dashboardRouter;