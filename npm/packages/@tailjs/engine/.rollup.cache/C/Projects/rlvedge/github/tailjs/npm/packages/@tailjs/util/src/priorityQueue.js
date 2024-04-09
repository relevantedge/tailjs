const parent = (i) => ((i + 1) >>> 1) - 1;
const left = (i) => (i << 1) + 1;
const right = (i) => (i + 1) << 1;
export const priorityQueue = () => {
    const heap = [];
    const map = new Map();
    const set = (item, index) => (map.set(item[0], index), item);
    const swap = (i, j) => ([heap[i], heap[j]] = [set(heap[j], i), set(heap[i], j)]);
    const gt = (i, j) => i < size() && heap[i][1] > heap[j][1];
    const siftUp = (node = size() - 1) => {
        while (node > 0 && gt(node, parent(node)))
            swap(node, (node = parent(node)));
    };
    let selected, l, r;
    const siftDown = (node = 0) => {
        while (((l = left(node)), (r = right(node)), gt(l, node) || gt(r, node)))
            swap(node, (node = gt(r, l) ? r : l));
        heap[node][1] < 0 && pop();
    };
    const size = () => heap.length;
    const peek = () => heap[0];
    const push = (value, priority) => (selected = map.get(value)) != null
        ? priority > (heap[selected][1] = priority)
            ? siftUp(selected)
            : siftDown(selected && parent(selected))
        : priority > 0 &&
            map.set(value, heap.push([value, priority]) - 1) &&
            siftUp();
    const pop = () => {
        const poppedValue = peek();
        const bottom = size() - 1;
        if (bottom > 0) {
            swap(0, bottom);
        }
        heap.pop();
        map.delete(poppedValue[0]);
        siftDown();
        return poppedValue;
    };
    return {
        size,
        //  peek,
        push,
        pop,
        expand: () => [...heap],
    };
};
//# sourceMappingURL=priorityQueue.js.map