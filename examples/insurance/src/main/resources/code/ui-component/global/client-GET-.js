flow.thenSet("client", a => a.services.data.getRepository("client","ALL").findOne(a.params.get("clientId")!= null ? a.params.get("clientId") + '' : -1))
