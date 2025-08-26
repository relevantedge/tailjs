import React$1, { ComponentClass } from 'react';
import { TrackingBoundaryData, ExtendedTrackingBoundaryData } from '@tailjs/types';
import { TrackerAttributes } from '@tailjs/client/external';
import { Falsish } from '@tailjs/util';

type ComponentType = (ComponentClass<any, any> | React.FunctionComponent<any>) & {
    $$typeof?: any;
};
type StateMapperResult = ExtendedTrackingBoundaryData | StateMapperResult[] | Falsish;
type StateMapper = (
/** The result from the previous state mapper, when state mappers are chained in the configuration. */
currentState: ExtendedTrackingBoundaryData<true> | undefined, 
/** The type of the rendering component. */
type: ComponentType, 
/** The properties of the rendering component.  */
props: Record<string, any>) => StateMapperResult;
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

interface SitecoreJssOptions {
    debug?: boolean;
    tagsField?: string | null | undefined | false;
}
declare const sitecoreJss: ({ debug, tagsField, }?: SitecoreJssOptions) => StateMapper;

export { type SitecoreJssOptions, sitecoreJss };
