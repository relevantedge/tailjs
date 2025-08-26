import { mapTags } from '@tailjs/types';

const getRouteItem = (layoutData)=>{
    var _layoutData_sitecore;
    const page = layoutData === null || layoutData === void 0 ? void 0 : (_layoutData_sitecore = layoutData.sitecore) === null || _layoutData_sitecore === void 0 ? void 0 : _layoutData_sitecore.route;
    return (page === null || page === void 0 ? void 0 : page.itemId) ? {
        id: page.itemId,
        name: page.name,
        language: page.itemLanguage,
        version: "" + page.itemVersion,
        source: "sitecore"
    } : undefined;
};

const p13n = "_tp13n";
const DEFAULT_VARIANT = "_default";
function mapExperience(variantId, experience, original) {
    const get = (aspect)=>{
        const value = experience[aspect];
        return value && (experience === original || value !== original[aspect]) ? value : "";
    };
    var _experience_uid;
    return [
        variantId,
        (_experience_uid = experience.uid) !== null && _experience_uid !== void 0 ? _experience_uid : "",
        get("dataSource"),
        get("componentName")
    ];
}
function getPagePersonalization(layout) {
    var _layout_sitecore_context, _layout_sitecore;
    const pageVariantId = layout === null || layout === void 0 ? void 0 : (_layout_sitecore = layout.sitecore) === null || _layout_sitecore === void 0 ? void 0 : (_layout_sitecore_context = _layout_sitecore.context) === null || _layout_sitecore_context === void 0 ? void 0 : _layout_sitecore_context.variantId;
    if (!pageVariantId) return;
    if (pageVariantId !== DEFAULT_VARIANT) {
        return [
            {
                definition: getRouteItem(layout),
                variants: [
                    {
                        id: pageVariantId,
                        default: pageVariantId === DEFAULT_VARIANT,
                        eligible: true,
                        selected: true,
                        itemType: "segment",
                        source: "sitecore-personalize"
                    }
                ]
            }
        ];
    }
}
function getComponentPersonalization(layout, rendering) {
    var _layout_p13n;
    const indices = rendering === null || rendering === void 0 ? void 0 : rendering[p13n];
    if (!indices) return;
    const set = (_layout_p13n = layout[p13n]) === null || _layout_p13n === void 0 ? void 0 : _layout_p13n[indices[0]];
    const selected = set === null || set === void 0 ? void 0 : set[indices[1]];
    if (!selected) return;
    const mapChoice = (data)=>{
        const choice = {
            id: data[0],
            default: data[0] === DEFAULT_VARIANT,
            selected: data === selected,
            eligible: data === selected || data[0] === DEFAULT_VARIANT,
            itemType: "segment",
            source: "sitecore-personalize",
            sources: [
                {
                    personalizationType: "data-source",
                    id: data[2]
                },
                {
                    personalizationType: "component",
                    id: data[3]
                }
            ].filter((item)=>item.id)
        };
        return choice;
    };
    const personalization = {
        definition: getRouteItem(layout),
        variants: set.map(mapChoice)
    };
    if (selected[1]) {
        personalization.tags = [
            {
                tag: "p13n:renderxml:uid",
                value: selected[1]
            }
        ];
    }
    return [
        personalization
    ];
}
function traversePersonalization(layoutData) {
    var _layoutData_sitecore_route, _layoutData_sitecore;
    traverse(layoutData[p13n] = [], layoutData === null || layoutData === void 0 ? void 0 : (_layoutData_sitecore = layoutData.sitecore) === null || _layoutData_sitecore === void 0 ? void 0 : (_layoutData_sitecore_route = _layoutData_sitecore.route) === null || _layoutData_sitecore_route === void 0 ? void 0 : _layoutData_sitecore_route.placeholders);
    function traverse(data, placeholders) {
        if (!placeholders) return;
        for (const rendering of Object.entries(placeholders).flatMap(([, renderings])=>renderings)){
            const experiences = rendering["experiences"];
            if (experiences && Object.keys(experiences).some((key)=>key !== DEFAULT_VARIANT)) {
                data.push(Object.entries({
                    ...experiences,
                    [DEFAULT_VARIANT]: rendering
                }).map(([id, experience], i)=>mapExperience(id, (experience[p13n] = [
                        data.length,
                        i
                    ], experience), rendering)));
            }
            traverse(data, rendering["placeholders"]);
        }
    }
}

const UUID_REGEX = /\{?([a-fA-F0-9]{8})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{4})\-?([a-fA-F0-9]{12})\}?/g;
const sitecoreJss = ({ debug = false, tagsField = "Tags" } = {})=>{
    let componentMap = {};
    let componentTypeCounts = {};
    let layoutData;
    return (currentState, type, props)=>{
        let data = null;
        if (props.layoutData) {
            var _layoutData_sitecore_route, _layoutData_sitecore, _layoutData_sitecore_context, _layoutData_sitecore1;
            layoutData = props.layoutData;
            traversePersonalization(layoutData);
            buildComponentMap(layoutData, layoutData === null || layoutData === void 0 ? void 0 : (_layoutData_sitecore_route = layoutData.sitecore.route) === null || _layoutData_sitecore_route === void 0 ? void 0 : _layoutData_sitecore_route.placeholders);
            if (debug && typeof window !== "undefined") {
                console.groupCollapsed("SC layout data");
                console.debug(JSON.stringify({
                    layout: layoutData,
                    components: componentMap
                }, null, 2));
                console.groupEnd();
            }
            const route = (_layoutData_sitecore = layoutData.sitecore) === null || _layoutData_sitecore === void 0 ? void 0 : _layoutData_sitecore.route;
            const mode = (_layoutData_sitecore1 = layoutData.sitecore) === null || _layoutData_sitecore1 === void 0 ? void 0 : (_layoutData_sitecore_context = _layoutData_sitecore1.context) === null || _layoutData_sitecore_context === void 0 ? void 0 : _layoutData_sitecore_context.pageState;
            if (route === null || route === void 0 ? void 0 : route.itemId) {
                (data !== null && data !== void 0 ? data : data = []).push({
                    view: {
                        definition: {
                            id: route.itemId,
                            name: route.name,
                            preview: mode === "preview" || mode === "edit",
                            language: route.itemLanguage,
                            version: "" + route.itemVersion,
                            personalization: getPagePersonalization(layoutData),
                            source: "sitecore"
                        }
                    }
                });
            }
        }
        if (componentMap) {
            var _props_rendering;
            const renderingUid = normalizeUuids((_props_rendering = props.rendering) === null || _props_rendering === void 0 ? void 0 : _props_rendering.uid);
            if (renderingUid) {
                const componentData = componentMap[renderingUid];
                if (componentData) {
                    (data !== null && data !== void 0 ? data : data = []).push(componentData);
                }
            }
        }
        const matchedContent = content(props);
        if (matchedContent === null || matchedContent === void 0 ? void 0 : matchedContent.length) {
            (data !== null && data !== void 0 ? data : data = []).push({
                content: matchedContent
            });
        }
        return data ? [
            currentState,
            data
        ] : data;
    };
    function content(props) {
        const tryFindIdContainer = (props)=>{
            var _props_value;
            return !props || typeof props !== "object" ? {} : props.id ? props : ((_props_value = props.value) === null || _props_value === void 0 ? void 0 : _props_value.id) ? props.value : props.field ? tryFindIdContainer(props.field) : {};
        };
        return (props ? [
            props,
            ...Object.values(props)
        ] : []).map((value)=>{
            const { id, name, ...props } = tryFindIdContainer(value);
            return typeof id === "string" && id.match(UUID_REGEX) ? {
                id,
                name,
                source: "sitecore"
            } : undefined;
        }).filter(Boolean);
    }
    function buildComponentMap(layoutData, placeholders) {
        if (!placeholders) return;
        for (const [placeholder, layout] of Object.entries(placeholders)){
            for (const rendering of layout){
                if ("componentName" in rendering) {
                    if (!rendering.uid) continue;
                    const component = {
                        ...mapComponent(layoutData, rendering),
                        track: {
                            promote: true
                        }
                    };
                    componentMap[rendering.uid] = {
                        components: [
                            component
                        ],
                        area: placeholder
                    };
                    var _componentTypeCounts_component_id;
                    component.instanceNumber = componentTypeCounts[component.id] = ((_componentTypeCounts_component_id = componentTypeCounts[component.id]) !== null && _componentTypeCounts_component_id !== void 0 ? _componentTypeCounts_component_id : 0) + 1;
                    buildComponentMap(layoutData, rendering.placeholders);
                }
            }
        }
    }
    function normalizeUuids(text) {
        return typeof text === "string" ? text.replace(UUID_REGEX, (m0, m1, m2, m3, m4, m5)=>[
                m1,
                m2,
                m3,
                m4,
                m5
            ].join("-").toLowerCase()) : text;
    }
    function mapComponent(layoutData, component) {
        var _component_fields, _component_params;
        const tags = tagsField ? mapTags([
            (_component_fields = component.fields) === null || _component_fields === void 0 ? void 0 : _component_fields[tagsField],
            (_component_params = component.params) === null || _component_params === void 0 ? void 0 : _component_params[tagsField]
        ].flatMap((value)=>{
            var _value_value;
            value = (_value_value = value === null || value === void 0 ? void 0 : value.value) !== null && _value_value !== void 0 ? _value_value : value;
            return typeof value === "string" && value ? value.split(/&/) : [];
        })) : undefined;
        const mapped = {
            instanceId: normalizeUuids(component.uid),
            id: component.componentName,
            name: component.componentName,
            dataSource: component.dataSource ? {
                id: normalizeUuids(component.dataSource)
            } : void 0,
            source: "sitecore",
            tags: (tags === null || tags === void 0 ? void 0 : tags.length) ? tags : undefined,
            personalization: getComponentPersonalization(layoutData, component)
        };
        return mapped;
    }
};

export { sitecoreJss };
