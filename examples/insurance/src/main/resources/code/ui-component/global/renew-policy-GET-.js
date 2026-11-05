flow.thenSet("organizationRelatedForm", a=> a.services.data.getForm("quote"))
.thenSet("policy", a => a.services.data.getRepository("policy","ALL").findOne(a.params.get("policyId")))
.then(a => a.model.get("organizationRelatedForm").dto.put("clientId",a.model.get("policy") != null ? a.model.get("policy").clientId : null))
