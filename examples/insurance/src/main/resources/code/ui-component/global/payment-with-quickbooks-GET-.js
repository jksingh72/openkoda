flow
.thenSet("paymentId", a => a.params.get("paymentId") != null ? a.params.get("paymentId") : a.params.get("state"))
.thenSet("payment", a => a.model.get("paymentId") != null ? a.services.data.getRepository("payment","ALL").findOne(a.model.get("paymentId")) : null)
.thenSet("paymentForm", a=> a.services.data.getForm("payment",a.result))