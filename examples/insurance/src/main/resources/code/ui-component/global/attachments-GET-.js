flow.thenSet("object", a => {
	if(a.params.get("clientId")!= null) {
    	return a.services.data.getRepository("client","ALL").findOne(a.params.get("clientId") + '');
    } else if (a.params.get("policyId")!= null) {
    	return a.services.data.getRepository("policy","ALL").findOne(a.params.get("policyId") + '');
    }
})
