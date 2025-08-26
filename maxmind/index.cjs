'use strict';

var maxmind = require('maxmind');

function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
class ClientLocation {
    registerTypes(schema) {
        schema.registerSchema({
            namespace: "urn:tailjs:maxmind",
            variables: {
                session: {
                    mx: {
                        visibility: "trusted-only",
                        primitive: "string"
                    },
                    country: {
                        primitive: "string"
                    }
                }
            }
        });
    }
    async patch({ events }, next, tracker) {
        if (!tracker.session) return next(events);
        if (!this._initialized) throw new Error("Not initialized");
        //if (!tracker.consent?.active) return events;
        const env = tracker.env;
        let country = "NA";
        const ip = tracker.clientIp;
        if (ip) {
            // Send a new location event whenever the consent changes.
            // The new consent may influence how much data gets tracked.
            const clientHash = env.hash(ip + JSON.stringify(tracker.consent));
            if (await tracker.get({
                scope: "session",
                key: "mx"
            }).value() !== clientHash) {
                var _this__reader, _location_country;
                const location = this.filterNames((_this__reader = this._reader) === null || _this__reader === void 0 ? void 0 : _this__reader.get(ip));
                tracker.getRequestItems(this).set(ClientLocation.name, this.filterNames(location, this._language));
                if (location) {
                    var _location_location, _location_postal, _location_location1, _location_location2, _this__reader_metadata_buildEpoch, _this__reader1;
                    var _this__reader_metadata_buildEpoch_toString;
                    events = [
                        ...events,
                        {
                            type: "session_location",
                            accuracy: (_location_location = location.location) === null || _location_location === void 0 ? void 0 : _location_location.accuracy_radius,
                            city: location.city ? {
                                name: location.city.names[this._language],
                                geonames: location.city.geoname_id,
                                confidence: location.city.confidence
                            } : undefined,
                            zip: (_location_postal = location.postal) === null || _location_postal === void 0 ? void 0 : _location_postal.code,
                            subdivision: location.subdivisions ? location.subdivisions.map((sub)=>({
                                    name: sub.names[this._language],
                                    geonames: sub.geoname_id,
                                    iso: sub.iso_code,
                                    confidence: sub.confidence
                                }))[0] : undefined,
                            country: location.country ? {
                                name: location.country.names[this._language],
                                geonames: location.country.geoname_id,
                                iso: location.country.iso_code
                            } : undefined,
                            continent: location.continent ? {
                                name: location.continent.names[this._language],
                                geonames: location.continent.geoname_id,
                                iso: location.continent.code
                            } : undefined,
                            lat: (_location_location1 = location.location) === null || _location_location1 === void 0 ? void 0 : _location_location1.latitude,
                            lng: (_location_location2 = location.location) === null || _location_location2 === void 0 ? void 0 : _location_location2.longitude,
                            tags: [
                                {
                                    tag: "maxmind:build-epoch",
                                    value: (_this__reader_metadata_buildEpoch_toString = (_this__reader1 = this._reader) === null || _this__reader1 === void 0 ? void 0 : (_this__reader_metadata_buildEpoch = _this__reader1.metadata.buildEpoch) === null || _this__reader_metadata_buildEpoch === void 0 ? void 0 : _this__reader_metadata_buildEpoch.toString()) !== null && _this__reader_metadata_buildEpoch_toString !== void 0 ? _this__reader_metadata_buildEpoch_toString : "(unknown)"
                                }
                            ]
                        }
                    ];
                }
                var _location_country_names_this__language;
                country = (_location_country_names_this__language = location === null || location === void 0 ? void 0 : (_location_country = location.country) === null || _location_country === void 0 ? void 0 : _location_country.names[this._language]) !== null && _location_country_names_this__language !== void 0 ? _location_country_names_this__language : "NA";
                await tracker.set([
                    {
                        scope: "session",
                        key: "mx",
                        value: clientHash,
                        force: true
                    },
                    {
                        scope: "session",
                        key: "country",
                        value: country,
                        force: true
                    }
                ]);
            }
        }
        return await next(events);
    }
    filterNames(parent, language = "en") {
        if (typeof parent !== "object") return;
        for(const p in parent){
            const value = parent[p];
            if (typeof value !== "object") continue;
            if (p === "names") {
                var _value_language;
                const primaryName = (_value_language = value[language]) !== null && _value_language !== void 0 ? _value_language : value["en"];
                if (primaryName) {
                    parent[p] = {
                        [language]: value[language]
                    };
                }
                continue;
            }
            this.filterNames(value);
        }
        return parent;
    }
    async initialize(host) {
        if (this._initialized == (this._initialized = true)) {
            return;
        }
        const createReader = async (watch)=>{
            let data = this._mmdbPath ? await host.read(this._mmdbPath, watch ? async ()=>await createReader(false) : undefined) : null;
            if (data == null) {
                if (this._mmdbSource) {
                    var _find, _this;
                    const { fileName = "GeoLite2-City.mmdb", url, headers } = this._mmdbSource;
                    host.log(this, `'${this._mmdbPath}' could not be loaded, downloading from ${url}.`);
                    const responseData = await host.request({
                        url,
                        headers,
                        binary: true
                    });
                    if (responseData == null) {
                        host.error(this, `Downloading mmdb from ${url} failed.`);
                        return;
                    }
                    var _find_data;
                    data = (_find_data = (_this = await host.decompress(responseData.body, "tar.gz")) === null || _this === void 0 ? void 0 : (_find = _this.find((entry)=>entry.name.endsWith(fileName))) === null || _find === void 0 ? void 0 : _find.data) !== null && _find_data !== void 0 ? _find_data : null;
                    if (data == null) {
                        host.error(this, `The downloaded file from ${url} is not a valid tar.gz file, or does not contain the mmdb file '${fileName}'.`);
                        return;
                    }
                }
                if (this._mmdbPath) {
                    if (data === null) {
                        host.error(this, `'${this._mmdbPath}' could not be loaded.`);
                        return;
                    }
                    await host.write(this._mmdbPath, data);
                }
            }
            this._reader = data ? new maxmind.Reader(Buffer.from(data)) : null;
            if (this._reader == null) {
                host.warn(this, "The mmdb file could not be loaded. Geo information will not be available.");
            }
        };
        await createReader(true);
    }
    constructor({ language = "en", mmdb = "maxmind/GeoLite2-City.mmdb", source } = {}){
        _define_property(this, "_language", void 0);
        _define_property(this, "_mmdbPath", void 0);
        _define_property(this, "_mmdbSource", void 0);
        _define_property(this, "_initialized", false);
        _define_property(this, "_reader", void 0);
        _define_property(this, "id", "ClientLocation");
        this._language = language;
        this._mmdbPath = mmdb;
        this._mmdbSource = source;
    }
}

exports.ClientLocation = ClientLocation;
