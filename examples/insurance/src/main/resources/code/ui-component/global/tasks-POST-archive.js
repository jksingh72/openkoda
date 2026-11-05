flow
    .thenSet("task", a=> a.services.data.getRepository("task", "ALL").findOne(a.params.get("id")))
    .then(a=> {
        let task = a.model.get("task");
        if (task !== null) {
            task.setArchived(true);
            a.services.data.getRepository("task", "ALL").saveOne(task);
        }
    })