flow
    .thenSet("task", a=> a.services.data.getRepository("task", "ALL").findOne(a.params.get("id")))
    .then(a=> {
        let task = a.model.get("task");
        if (task !== null) {
            let currentStatus = a.params.get("status");
            if (currentStatus === 'DONE') task.setStatus("TODO");
            else task.setStatus("DONE");
            a.services.data.getRepository("task", "ALL").saveOne(task);
        }
    })
