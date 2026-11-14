import { Router } from "express";
import authRouter from "./modules/auth/auth";
import dashboardRouter from "./modules/dashboard/dashboard";
import adminRouter from "./modules/admin/admin";

const indexRouter: Router = Router();

indexRouter.use("/auth", authRouter);
indexRouter.use("/dashboard", dashboardRouter);
indexRouter.use("/admin", adminRouter);

export default indexRouter;
