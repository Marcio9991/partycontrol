const express = require("express");
const controller = require("../controllers/authController");
const { exigirLogin } = require("../middlewares/autenticacao");

const router = express.Router();

router.post("/registrar", controller.registrar);
router.post("/login", controller.login);
router.post("/logout", exigirLogin, controller.logout);
router.get("/sessao", exigirLogin, controller.sessao);

module.exports = router;
