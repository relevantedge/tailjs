'use client';
'use strict';

var React = require('react');

const validateFiber = (fiber)=>{
    if (!fiber) {
        console.error("The component does not have a fiber (React breaking change?).");
        return false;
    }
    return true;
};
let visitModule;
const resolveVisitModule = ()=>visitModule !== null && visitModule !== void 0 ? visitModule : visitModule = require("./bootstrap.js").bootstrap();
const bindFiberState = (fiber, state)=>state && findRelatedDomNodes(fiber).forEach((element)=>resolveVisitModule().bindState(element, state));
const mapChildComponentState = (fiber)=>{
    if (!validateFiber(fiber)) {
        return;
    }
    const wrappedComponent = fiber.child;
    if (wrappedComponent === null || wrappedComponent === void 0 ? void 0 : wrappedComponent.type) {
        var _wrappedComponent_memoizedProps;
        bindFiberState(wrappedComponent, resolveVisitModule().getStateFromProps(wrappedComponent.type, (_wrappedComponent_memoizedProps = wrappedComponent.memoizedProps) !== null && _wrappedComponent_memoizedProps !== void 0 ? _wrappedComponent_memoizedProps : {}));
    }
};
const findRelatedDomNodes = (fiber)=>{
    const collected = [];
    if (!validateFiber(fiber)) {
        return collected;
    }
    collectedRelatedTreeDomNodes(fiber, true, collected);
    if (fiber.alternate) {
        // The alternate (supposedly, work-in-progress) tree may sometimes contain the current dom nodes.
        // Scan that too.
        collectedRelatedTreeDomNodes(fiber.alternate, true, collected);
    }
    return collected;
};
const collectedRelatedTreeDomNodes = (fiber, root = true, collected)=>{
    var _fiber_stateNode;
    if (((_fiber_stateNode = fiber.stateNode) === null || _fiber_stateNode === void 0 ? void 0 : _fiber_stateNode.nodeType) === 1 && fiber.stateNode.isConnected) {
        collected.push(fiber.stateNode);
    } else if (fiber.child) {
        collectedRelatedTreeDomNodes(fiber.child, false, collected);
    }
    if (!root && fiber.sibling) {
        collectedRelatedTreeDomNodes(fiber.sibling, false, collected);
    }
    return collected;
};
class TrackingBoundary extends React.Component {
    render() {
        return this.props.children;
    }
    _bindState() {
        if (!this.props.state) {
            var _this;
            mapChildComponentState((_this = this) === null || _this === void 0 ? void 0 : _this._reactInternals);
        } else {
            var _this1;
            bindFiberState((_this1 = this) === null || _this1 === void 0 ? void 0 : _this1._reactInternals, this.props.state);
        }
    }
    componentDidMount() {
        this._bindState();
    }
    componentDidUpdate() {
        this._bindState();
    }
    constructor(props){
        super(props);
    }
}

exports.TrackingBoundary = TrackingBoundary;
exports.mapChildComponentState = mapChildComponentState;
