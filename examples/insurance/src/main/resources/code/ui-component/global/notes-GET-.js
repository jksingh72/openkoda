flow.thenSet("notes", a => a.services.data.getRepository("note","ALL").search( (root, query, cb) => {
	let clientId = a.params.get("clientId") !== null && a.params.get("clientId") !== '' ? a.params.get("clientId") + '' : -1;
    let policyId = a.params.get("policyId") !== null && a.params.get("policyId") !== '' ? a.params.get("policyId") + '' : -1;
	return cb.or(cb.equal(root.get("clientId"), clientId), cb.equal(root.get("policyId"), policyId));
},0,10,'createdOn','DESC'))
.thenSet("clientId", a => a.params.get("clientId"))
.thenSet("policyId", a => a.params.get("policyId"))