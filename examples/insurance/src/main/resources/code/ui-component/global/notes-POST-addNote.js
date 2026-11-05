flow.thenSet("note", a => a.services.data.saveForm(a.form))
.thenSet("notes", a => a.services.data.getRepository("note","ALL").search( (root, query, cb) => {
	let clientId = a.params.get("clientId") !== null ? a.params.get("clientId") : -1;
    let policyId = a.params.get("policyId") !== null ? a.params.get("policyId") : -1;
	return cb.or(cb.equal(root.get("clientId"), clientId), cb.equal(root.get("policyId"), policyId));
}))
.thenSet("clientId", a => a.form.dto.get("clientId") + '')
.thenSet("policyId", a => a.form.dto.get("policyId") + '')
.thenSet("clientParam", a => a.form.dto.get("clientId") != null ? "clientId=" + a.form.dto.get("clientId") : '')
.thenSet("policyParam", a => a.form.dto.get("policyId") != null ? "policyId=" + a.form.dto.get("policyId") : '')
.thenSet("noteContent", a => a.model.get("note").getContent())
