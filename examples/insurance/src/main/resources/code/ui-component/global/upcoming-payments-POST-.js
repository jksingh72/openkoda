flow
    .thenSet("policy", a => a.services.data.getRepository("policy","ALL").findOne(a.params.get("policyId")!= null ? a.params.get("policyId") + '' : -1))
    .thenSet("client", a => a.model.get("policy") != null ? a.services.data.getRepository("client","ALL").findOne(a.model.get("policy").getClientId()) : null)
    .then(a=> a.model.get("client") != null ? a.services.messages.sendEmail(a.model.get("client").getEmail(),"Policy " + a.model.get("policy").getPolicyName() ,a.params.get("message"),null) : null )
    .thenSet("redirectUrl", a => "/html/cn/upcoming-payments?__view=plain&policyId=" + a.model.get("policy").getId());