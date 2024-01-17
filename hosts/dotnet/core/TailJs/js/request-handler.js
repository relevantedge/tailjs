((requestHandler) => ({
        async postEvents(tracker, eventsJson) {
            await requestHandler.postEvents(tracker, eventsJson);
        },
        async processRequest(request) {
            return await requestHandler.processRequest(request);
        },

        getClientCookies(tracker) {
            return requestHandler.getClientCookies(tracker);
        },

        getClientScripts(tracker) {
            return requestHandler.getClientScripts(tracker);
        },

        getVariable(tracker, name) {
            return JSON.stringify(tracker.vars[name] ?? null);
        },
        setVariable(tracker, name, value) {
            if (value === null) {
                delete tracker.vars[name];
            } else {
                tracker.vars[name] = JSON.parse(value);
            }
        },
        getVariables(tracker) {
            return Object.entries(tracker.vars).map(
                ([key, value]) => ({key, value: JSON.stringify(value ?? null)}));
        },

        stringify(value) {
            if (Array.isArray(value)) {
                return value.map(JSON.stringify)
            }
            return JSON.stringify(value);
        },
        parse(json) {
            return JSON.parse(json);
        }

    })
)
