import { Router } from "express";
import{ changethumbnail, changevideo, deletevideo, getallvideo, getvideobytitle, uploadvideo} from "../controllers/video.controllers.js"
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route("/uploadVideo").post(verifyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnail",
            maxCount: 1
        }
    ]),
    uploadvideo)

router.route("/changeVideo").patch(upload.single("videoFile"), changevideo)

router.route("/changeThumbnail").patch(verifyJWT, upload.single("thumbnail"), changethumbnail)

router.route("/deleteVideo").delete(verifyJWT, deletevideo)

router.route("/allVideo").get(getallvideo)

router.route("/getvideobytitle").get(getvideobytitle)

export default router