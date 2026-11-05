flow
    .thenSet("agentId", a => a.params.get("agentId") !== null ? a.params.get("agentId") : -1)
    .thenSet("policies", a => {
        let dateNow = a.services.util.dateNow();
        let dateEnd = dateNow.plusDays(15);

        return a.services.data.getRepository("policy", "ALL").search((root, query, cb) => {
            return cb.and(
                cb.equal(root.get("agentId"), a.model.get("agentId")), 
                cb.lessThanOrEqualTo(root.get("endDate"), dateEnd),    
                cb.greaterThanOrEqualTo(root.get("endDate"), dateNow) 
            );
        });
    })
    .thenSet("clients", a => a.model.get("policies").reduce(function ( total, policy ) {
        total[ policy.getClientId() ] = a.services.data.getRepository("client", "ALL").findOne(policy.clientId);
        return total;
    }, {}))