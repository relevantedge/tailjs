((storage) => ({
        // initialize(environment) {
        //     return storage.initialize(environment);
        // },
        //
        //
        // get(keysJson){
        //     return storage.get(JSON.parse(keysJson));
        // },
        //
        // head(filtersJson, optionsJson){
        //     return storage.head(JSON.parse(filtersJson), JSON.parse(optionsJson));
        // },
        //
        // query(filtersJson, optionsJson){
        //     return storage.head(JSON.parse(filtersJson), JSON.parse(optionsJson));
        // },
        //
        // renew(scope, targetIdsJson){
        //     return storage.renew(scope, JSON.parse(targetIdsJson));
        // },
        //
        // set(variablesJson){
        //    
        // }

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
