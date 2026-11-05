flow
    .thenSet("client", a=> a.services.data.getRepository("client","ALL").findOne(a.params.get("clientId")!= null ? a.params.get("clientId") + '' : -1))
    .thenSet("sendOnDates", a=> {
        let pattern = a.params.get("pattern");
        let dates = [];
        let times;
        let dateNow = a.services.util.dateNow();
        switch (pattern) {
            case 'D':
                times = 365*10; // repeat for the next 10 years
                for (let i = 1; i <= times; i++) {
                    let date = dateNow.plusDays(i);
                    dates.push(date);
                }
                break;
            case 'W':
                times = 52*10; // repeat for the next 10 years
                for (let i = 1; i <= times; i++) {
                    let date = dateNow.plusWeeks(i);
                    dates.push(date);
                }
                break;
            case 'M':
                times = 12*10; // repeat for the next 10 years
                for (let i = 1; i <= times; i++) {
                    let date = dateNow.plusMonths(i);
                    dates.push(date);
                }
                break;
            case 'Y':
                times = 1*10; // repeat for the next 10 years
                for (let i = 1; i <= times; i++) {
                    let date = dateNow.plusYears(i);
                    dates.push(date);
                }
                break;
            default:
                dates = [];
        }
        return dates;
    })
    .thenSet("sendOn", a=> {
        const findFirstNull = (...args) => args.find(arg => arg !== null);
        let dateNow = a.services.util.dateNow();
        let dateTimeNow = a.services.util.dateTimeNow();

        // send before
        let howMany = a.params.get("howMany") === "" ? null : a.services.util.parseInt(a.params.get("howMany"));
        let howManyWhat = a.params.get("howManyWhat") === "" ? null : a.params.get("howManyWhat");
        let fixedDate = a.params.get("fixedDate") === null ? null : a.services.util.parseDate(a.params.get("fixedDate"));
        let sendBeforeFixedDate = null;
        if (fixedDate !==null) {
            switch (howManyWhat) {
                case 'D':
                    sendBeforeFixedDate = fixedDate.minusDays(howMany).atStartOfDay();
                    break;
                case 'M':
                    sendBeforeFixedDate = fixedDate.minusMonths(howMany).atStartOfDay();
                    break;
                default:
                    sendBeforeFixedDate = null;
            }
        }

        // send on
        let customDate = a.params.get("customDate") === "" ? null : a.services.util.parseDate(a.params.get("customDate"));
        let customTime = a.params.get("customTime") === "" ? null : a.services.util.parseTime(a.params.get("customTime"));
        let sendOnCustomDate = customDate !==null ? customDate.atTime(customTime) : null;

        // send after
        let sendAfterHours = a.params.get("hours") === "" ? null : dateTimeNow.plusHours(a.services.util.parseInt(a.params.get("hours")));
        let sendAfterDays = a.params.get("days") === "" ? null : dateNow.plusDays(a.services.util.parseInt(a.params.get("days"))).atStartOfDay();

        return findFirstNull(sendBeforeFixedDate, sendOnCustomDate, sendAfterHours, sendAfterDays);
    })
    .then(a=> {
        let sendOnDates = a.model.get("sendOnDates");
        if (sendOnDates.length > 0) {
            for (const sendOnDate of sendOnDates) {
                a.services.messages.sendEmail(a.model.get("client").getEmail(),"Reminder",a.params.get("message"), null, sendOnDate.atStartOfDay())
            }
        } else {
            a.services.messages.sendEmail(a.model.get("client").getEmail(),"Reminder",a.params.get("message"), null, a.model.get("sendOn"))
        }

    });