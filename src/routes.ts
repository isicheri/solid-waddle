import { Router } from "express";
import authRouter from "./modules/auth/auth";
import dashboardRouter from "./modules/dashboard/dashboard";

const indexRouter: Router = Router();

indexRouter.use("/auth", authRouter)
indexRouter.use("/dashboard", dashboardRouter)

export default indexRouter;