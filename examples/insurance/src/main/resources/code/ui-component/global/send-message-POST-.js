flow
    .thenSet("client", a=> a.services.data.getRepository("client","ALL").findOne(a.params.get("clientId")!= null ? a.params.get("clientId") + '' : -1))
    .then(a=> a.services.messages.sendEmail(a.model.get("client").getEmail(),"Reminder",a.params.get("message"),null));