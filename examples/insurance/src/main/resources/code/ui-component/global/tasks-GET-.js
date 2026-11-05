flow.thenSet("client_id", a=> a.params.get("clientId"))
    .thenSet("taskForm", a => a.services.data.getForm("task"))
    .thenSet("pageNumber", a => a.params.get("task_page") != null ? a.params.get("task_page") : 0)
    .thenSet("itemsPerPage", a => a.params.get("task_size") != null ? a.params.get("task_size") : 2)
    .thenSet("tasks", a => a.services.data.getRepository("task","ALL").search( (root, query, cb) => {
        let clientId = a.params.get("clientId") != null ? a.params.get("clientId") + '' : -1;
        
        return cb.and(
            cb.equal(root.get("archived"), false),
            cb.equal(root.get("clientId"), clientId));
    }, +a.model.get("pageNumber"), +a.model.get("itemsPerPage"), "createdOn", "DESC"))