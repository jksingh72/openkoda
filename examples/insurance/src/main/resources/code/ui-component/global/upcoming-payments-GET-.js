flow
.thenSet("policyId", a => a.params.get("policyId") !== null ? a.params.get("policyId") : -1)
.thenSet("policy", a => a.services.data.getRepository("policy","ALL").findOne(a.model.get("policyId")))
.thenSet("payments", a => a.services.data.getRepository("payment","ALL").search( (root, query, cb) => {
	let dateEnd = a.services.util.dateNow().plusMonths(1);
    query.orderBy(cb.asc(root.get("paymentDueDate")));
	return cb.and(cb.equal(root.get("policyId"), a.model.get("policyId") + ''), 
    				cb.isNull(root.get("paymentDate")), 
                    cb.between(root.get("paymentDueDate"), a.services.util.dateNow(), dateEnd),
                    cb.or(cb.isNull(root.get("paymentStatus")), cb.equal(root.get("paymentStatus"), ""), cb.not(cb.equal(root.get("paymentStatus"), "PAID"))));
}))