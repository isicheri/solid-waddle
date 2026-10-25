import path from "path";
import crypto from "crypto";
import multer from "multer";

// Store uploaded files on disk under /uploads/identity‑docs
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve(__dirname, "../../../uploads/identity-docs"));
    },
    filename: (req, file, cb) => {
        // generate a random 12‑byte hex string + original extension
        const ext = path.extname(file.originalname);
        const random = crypto.randomBytes(12).toString("hex");
        cb(null, `${random}${ext}`);
    }
});

// Only accept images (jpeg, png) and limit size to ~5 MB per file
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG/PNG images are allowed"));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});
