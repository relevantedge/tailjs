const parent = (i: number) => ((i + 1) >>> 1) - 1;
const left = (i: number) => (i << 1) + 1;
const right = (i: number) => (i + 1) << 1;

export const priorityQueue = <T>() => {
  type HeapItem = [value: T, priority: number];

  const heap: HeapItem[] = [];
  const map = new Map<T, number>();

  const set = (item: HeapItem, index: number) => (
    map.set(item[0], index), item
  );

  const swap = (i: number, j: number) =>
    ([heap[i], heap[j]] = [set(heap[j], i), set(heap[i], j)]);

  const gt = (i: number, j: number) => i < size() && heap[i][1] > heap[j][1];

  const siftUp = (node = size() - 1) => {
    while (node > 0 && gt(node, parent(node)))
      swap(node, (node = parent(node)));
  };

  let selected: number, l: number, r: number;
  const siftDown = (node = 0) => {
    while (((l = left(node)), (r = right(node)), gt(l, node) || gt(r, node)))
      swap(node, (node = gt(r, l) ? r : l));
    heap[node][1] < 0 && pop();
  };

  const size = () => heap.length;
  const peek = () => heap[0];
  const push = (value: T, priority: number) =>
    (selected = map.get(value)!) != null
      ? //priority < 0 && (priority = heap[heap.length - 1][1] - 1);
        priority > (heap[selected][1] = priority)
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
