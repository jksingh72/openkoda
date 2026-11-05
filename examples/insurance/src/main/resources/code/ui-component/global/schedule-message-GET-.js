flow
    .thenSet("client", a=> a.services.data.getRepository("client","ALL").findOne(a.params.get("clientId")!= null ? a.params.get("clientId") + '' : -1))
    .thenSet("policies", a => a.services.data.getRepository("policy","ALL").search( (root, query, cb) => {
        let clientId = a.params.get("clientId") !== null ? a.params.get("clientId") : -1;
        return cb.equal(root.get("clientId"), clientId);
    }))
    .thenSet("payments", a => a.services.data.getRepository("payment","ALL").search( (root, query, cb) => {
        let policies = a.model.get("policies");
        let policiesIds = [];
        if (policies !== null && policies !== '') {
            for (const policy of policies) {
                policiesIds.push(policy.getId());
            }
        }
        return cb.in(root.get("policyId"), policiesIds);
    },0,10,'paymentDueDate','DESC'))
    .thenSet("clientFixedDates", a=> {
        let dates = {};
        let client = a.model.get("client");
        let policies = a.model.get("policies");
        let payments = a.model.get("payments");
        if (client !== null && client !== '') {
            dates['Client\' Birth Date'] = client.getDateOfBirth();
        }
        if (policies !== null && policies !== '') {
            for (const policy of policies) {
                dates['End date of: ' + policy.getPolicyName()] = policy.getEndDate();
            }
        }
        if (payments !== null && payments !== '') {
            for (const payment of payments) {
                let relatedPolicy = policies.find(policy => policy.getId() === payment.getPolicyId());
                dates['Nearest payment due date of: ' + relatedPolicy.getPolicyName()] = payment.getPaymentDueDate();
            }
        }
        return dates;
    })
    .thenSet("client_id", a=> a.params.get("clientId"))