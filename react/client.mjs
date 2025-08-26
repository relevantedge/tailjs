'use client';
import { tail } from '@tailjs/client/external';
import { useState, useRef, useEffect } from 'react';
import { isVariableResult, formatVariableResult } from '@tailjs/types';

const updateConsent = (consent, callback)=>tail({
        consent: {
            set: {
                consent,
                callback
            }
        }
    });
function useConsent() {
    var _useRef;
    let [{ consent, updating }, notifyChanged] = useState({
        consent: undefined,
        updating: false
    });
    var _current;
    const state = (_current = (_useRef = useRef(null)).current) !== null && _current !== void 0 ? _current : _useRef.current = {
        updating: false
    };
    useEffect(()=>{
        tail({
            consent: {
                get: (consent)=>{
                    if (state.pendingPatch) {
                        // We have a pending patch because consent has not yet been initialized.
                        // Don't change the updating flag.
                        state.pendingPatch(consent);
                        state.pendingPatch = undefined;
                    } else {
                        notifyChanged({
                            consent,
                            updating: false
                        });
                    }
                    return true;
                }
            }
        });
    }, []);
    return [
        consent,
        (patch)=>{
            return new Promise((resolve)=>{
                notifyChanged({
                    consent,
                    updating: true
                });
                if (!consent) {
                    state.pendingPatch = (consent)=>updateConsent(patch(consent), resolve);
                } else {
                    updateConsent(patch(consent), resolve);
                }
            });
        },
        updating
    ];
}

function useTrackerVariable(key, poll = true) {
    var _state_current;
    var _useRef;
    let [, notifyChanged] = useState();
    var _current;
    const state = (_current = (_useRef = useRef(null)).current) !== null && _current !== void 0 ? _current : _useRef.current = {};
    if (typeof poll === "boolean") {
        poll = {
            poll
        };
    }
    state.polling = poll.poll;
    useEffect(()=>{
        if (!state.wired) {
            let loadedSynchronously = true;
            var _poll_refresh;
            tail({
                get: {
                    ...key,
                    refresh: (_poll_refresh = poll.refresh) !== null && _poll_refresh !== void 0 ? _poll_refresh : false,
                    callback: (current)=>{
                        var _state_current;
                        if (!state.current || current !== ((_state_current = state.current) === null || _state_current === void 0 ? void 0 : _state_current[0])) {
                            state.current = [
                                current
                            ];
                            // Don't update the state if we got the variable result instantly from cache or whatever.
                            !loadedSynchronously && notifyChanged(state.current[0]);
                        }
                        if (state.polling) {
                            return true;
                        } else {
                            // This handler will be unbound, so we need to create a new one next time.
                            state.wired = false;
                        }
                    }
                }
            });
            loadedSynchronously = false;
            state.wired = true;
        }
    }, [
        state.wired
    ]);
    return [
        (_state_current = state.current) === null || _state_current === void 0 ? void 0 : _state_current[0],
        (value)=>new Promise((resolve)=>tail({
                    set: {
                        ...key,
                        value,
                        callback: ()=>resolve()
                    }
                })),
        ()=>new Promise((resolve, reject)=>{
                tail({
                    get: {
                        ...key,
                        refresh: true,
                        callback: (current)=>{
                            isVariableResult(current, false) // Cannot be status NotModified because refresh and no conditional cache headers.
                             ? resolve((notifyChanged(current.value && current), current)) : reject(Error(formatVariableResult(current)));
                        }
                    }
                });
            })
    ];
}

export { useTrackerVariable as a, useConsent as u };
