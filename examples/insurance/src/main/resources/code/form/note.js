a => a.textarea("content")
    .manyToOne("clientId", "client")
    .manyToOne("policyId", "policy")
    .validateForm(f => f.dto.get("policyId") == '' && f.dto.get("clientId") == '' ?  new Map([['clientId', 'not.empty'],['policyId', 'not.empty']]) : null) 