flow
    .thenSet("title", a=> "Send Email")
    .thenSet("isDisabled", a=> a.params.get("clientId") == null)
    .thenSet("client_id", a=> a.params.get("clientId"))