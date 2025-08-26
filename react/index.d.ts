import React$1, { ComponentClass, PropsWithChildren, FunctionComponent, Component, ComponentType as ComponentType$1, ComponentProps } from 'react';
import { ExtendedTrackingBoundaryData, UserConsent, TrackingBoundaryData, TrackingBehavior, FormFieldTrackingLevel, DataClassification } from '@tailjs/types';
import { ProvisionalTracker, ClientVariableKey, ClientVariable, TrackerAttributes } from '@tailjs/client/external';
export { tail } from '@tailjs/client/external';
import { Falsish } from '@tailjs/util';

type ComponentType = (ComponentClass<any, any> | React.FunctionComponent<any>) & {
    $$typeof?: any;
};
type ElementType = string | ComponentType;
type StateMapperResult = ExtendedTrackingBoundaryData | StateMapperResult[] | Falsish;
type UpdateStateOptions = {
    uniqueIds?: boolean;
    mergeExtensions?: (target: ExtendedTrackingBoundaryData, update: ExtendedTrackingBoundaryData) => ExtendedTrackingBoundaryData;
};
type StateMapper = (
/** The result from the previous state mapper, when state mappers are chained in the configuration. */
currentState: ExtendedTrackingBoundaryData<true> | undefined, 
/** The type of the rendering component. */
type: ComponentType, 
/** The properties of the rendering component.  */
props: Record<string, any>) => StateMapperResult;
type StateMapperCollection = Voidish | false | StateMapper | StateMapperCollection[];
type StateMapperConfiguration = StateMapperCollection | {
    state: StateMapperCollection;
    /**
     * Override the default behavior that maps the boundary data to tailjs commands.
     *
     * return `false` to suppress default behavior.
     */
    ref?: ElementStateMapper;
};
type ElementStateMapper = (tail: ProvisionalTracker, el: Element, data: ExtendedTrackingBoundaryData) => void | boolean;
interface JsxConfiguration$1 {
    /**
     * The script to inject in the the page's `<head>` section.
     *
     * @default false
     */
    script?: {
        src?: string;
        async?: boolean;
        attrs?: Record<string, any>;
    } | false;
    /** Maps component types and properties to boundary data (views, components etc.) */
    map?: StateMapperConfiguration;
    disabled?: false;
    /**
     * Include React components with a `displayName` in tracking. Works well with something like `webpack-react-component-name`.
     *
     * @default true
     */
    trackJsx?: boolean | ((type: ComponentType) => string | Nullish$1);
    /** The key the tracker requires to accept commands (if configured on the tracker). */
    key?: string;
}
type Nullish$1 = null | undefined;
type Voidish = void | Nullish$1;

interface JsxConfiguration {
    tracker: JsxConfiguration$1;
}

declare const MapState: (props: PropsWithChildren<any>) => any;

type Nullish = null | undefined;
type ExcludeRule = (type: any) => boolean;
type IncludeExcludeRules = (RegExp | string | FunctionComponent<any> | Component<any> | Nullish | {
    match: ExcludeRule;
})[];
declare const concatRules: (first: IncludeExcludeRules | Nullish, second: IncludeExcludeRules | Nullish) => IncludeExcludeRules | undefined;
declare const compileIncludeExcludeRules: (include: IncludeExcludeRules | Nullish, exclude: IncludeExcludeRules | Nullish) => ExcludeRule | undefined;

declare const Tracker: (props: any) => any;

type ConsentPatcher = (current: UserConsent) => UserConsent;
declare function useConsent(): [
    value: UserConsent | undefined,
    update: (patch: ConsentPatcher) => Promise<void>,
    updating: boolean
];

type TrackerVariablePollOptions = boolean | {
    poll: boolean;
    refresh?: boolean;
};
declare function useTrackerVariable<T extends {} = any>(key: ClientVariableKey, poll?: TrackerVariablePollOptions): [
    value: ClientVariable<T> | undefined,
    update: (value: T | undefined) => Promise<void>,
    refresh: () => Promise<ClientVariable<T> | undefined>
];

declare function useTracking(update: (current: TrackingBoundaryData | null) => TrackingBoundaryData): void;
declare function useTracking(data: TrackingBoundaryData): void;

interface TrackingBoundaryProps {
    children: any;
    state?: ExtendedTrackingBoundaryData;
}
declare class TrackingBoundary$1 extends React$1.Component<TrackingBoundaryProps> {
    constructor(props: any);
    render(): React$1.ReactNode;
    _bindState(): void;
    componentDidMount(): void;
    componentDidUpdate(): void;
}
type TrackingBoundaryType = typeof TrackingBoundary$1;

type PropertyMapper<P> = (props: Readonly<P>) => ExtendedTrackingBoundaryData | null | undefined | void;
type WithTrackingFunction = {
    <C, P extends object>(Component: FunctionComponent<P> & C, mapState: PropertyMapper<P>): C;
    <T extends ComponentType$1<any>>(Component: T, mapState: PropertyMapper<ComponentProps<T>>): T;
};

declare const isComponent: {
    (): any;
};
declare const updateConfig: (update: (current: JsxConfiguration | undefined) => JsxConfiguration | undefined) => void;
declare const TrackingBoundary: TrackingBoundaryType;
declare const withTracking: WithTrackingFunction;
declare const tracking: {
    (track: TrackingBehavior): {
        "data-tailjs": {
            track: TrackingBehavior;
        };
    };
    form(values: FormFieldTrackingLevel, privacy?: DataClassification): {
        "data-tailjs": {
            track: TrackingBehavior;
        };
    };
    field(values: FormFieldTrackingLevel, privacy?: DataClassification): {
        "data-tailjs": {
            track: TrackingBehavior;
        };
    };
};
declare module "react" {
    interface DOMAttributes<T> extends TrackerAttributes {
        ["data-tailjs"]?: TrackingBoundaryData;
    }
    interface HTMLAttributes<T> extends TrackerAttributes, React$1.DOMAttributes<T> {
        ["data-tailjs"]?: TrackingBoundaryData;
    }
    interface Attributes {
        ["data-tailjs"]?: TrackingBoundaryData;
    }
}

export { type ComponentType, type ElementStateMapper, type ElementType, type ExcludeRule, type IncludeExcludeRules, type JsxConfiguration, MapState, type StateMapper, type StateMapperCollection, type StateMapperConfiguration, type StateMapperResult, Tracker, type JsxConfiguration$1 as TrackerConfiguration, type TrackerVariablePollOptions, TrackingBoundary, type UpdateStateOptions, compileIncludeExcludeRules, concatRules, isComponent, tracking, updateConfig, useConsent, useTrackerVariable, useTracking, withTracking };
