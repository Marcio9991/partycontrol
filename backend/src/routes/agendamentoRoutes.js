const express = require("express");
const controller = require("../controllers/agendamentoController");

const router = express.Router();

router.get("/", controller.listar);
router.get("/:id", controller.buscar);
router.post("/", controller.criar);
router.put("/:id", controller.atualizar);
router.delete("/:id", controller.excluir);

module.exports = router;
