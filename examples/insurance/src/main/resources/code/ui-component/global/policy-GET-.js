flow
    .thenSet("policy", a => a.services.data.getRepository("policy","ALL").findOne(a.params.get("policyId")!= null ? a.params.get("policyId") + '' : -1))
    .thenSet("client", a => a.services.data.getRepository("client","ALL").findOne(a.model.get("policy") !== null ? a.model.get("policy").getClientId() : -1))
    .thenSet("agent", a => a.services.data.getRepository("agent","ALL").findOne(a.model.get("policy") !== null ? a.model.get("policy").getAgentId() : -1))