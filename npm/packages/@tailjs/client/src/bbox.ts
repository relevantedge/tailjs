type BBoxContext = {
  siblingIndex: number;
  depth: number;
  nextId: [number];
  minDim: number;
  colors: [string, string][];
};

function drawRect(rect: DOMRect, label: string, color: string) {
  const rectEl = document.createElement("div");
  rectEl.style.cssText = `position:absolute;top:${rect.top}px;right:${rect.right}px;bottom:${rect.bottom}px;left:${rect.left}px;border:2px solid ${color};`;
  document.body.append(rectEl);

  const labelEl = document.createElement("div");
  labelEl.style.cssText = `position: absolute;right:${rect.right};top:${rect.top}px;font-size:9px;font-weight:bold;color:${color};text-shadow:-1px -1px 0 white,1px -1px 0 white,-1px 1px 0 white,1px 1px 0 white;`;
  labelEl.innerText = label;
  document.body.append(labelEl);
}

function overlaps(p1: number, p2: number) {
  return Math.abs(p1 - p2) <= 2;
}

function drawBoxes(el: Element, context: BBoxContext) {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0) return;
  const style = window.getComputedStyle(el);

  let { depth, siblingIndex, minDim } = context;
  let draw = rect.width >= minDim && rect.height >= minDim;
  for (const child of el.children) {
    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    const childRect = child.getBoundingClientRect();
    const childStyle = window.getComputedStyle(child);
    if (
      overlaps(
        childRect.left,
        rect.left +
          parseFloat(style.paddingLeft) +
          parseFloat(childStyle.marginLeft)
      ) &&
      overlaps(
        childRect.left,
        rect.right -
          parseFloat(style.paddingRight) -
          parseFloat(childStyle.marginRight)
      ) &&
      overlaps(
        childRect.top,
        rect.top +
          parseFloat(style.paddingTop) +
          parseFloat(childStyle.marginTop)
      ) &&
      overlaps(
        childRect.top,
        rect.bottom -
          parseFloat(style.paddingBottom) -
          parseFloat(childStyle.marginBottom)
      )
    ) {
      draw = false;
      drawBoxes(child, context); // No depth or sibling change.
    } else {
      drawBoxes(child, {
        ...context,
        depth: depth + 1,
        siblingIndex: siblingIndex++,
      });
    }
  }

  if (draw) {
    const depthColors = context.colors[depth % context.colors.length];
    const color = depthColors[siblingIndex % depthColors.length];
    drawRect(rect, `${context.nextId[0]++}`, color);
  }
}

drawBoxes(document.body, {
  colors: [
    ["blue", "pink"],
    ["yellow", "green"],
  ],
  minDim: 50,
  depth: 0,
  siblingIndex: 0,
  nextId: [0],
});
