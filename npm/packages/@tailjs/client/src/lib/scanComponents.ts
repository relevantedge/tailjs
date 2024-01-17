import type { Component, ExternalReference } from "@tailjs/types";
import {
  F,
  T,
  attr,
  document,
  get,
  hashSet,
  map,
  nil,
  parseInt,
  push,
  set,
  split,
  str,
} from ".";
import type { BoundaryCommand } from "..";

type MappedComponent = [
  command: {
    component?: Component;
    content?: ExternalReference;
    area?: string;
  },
  elements: HTMLElement[]
];
export function scanAttributes(
  attributeName: string,
  references: MappedComponent[0][]
): BoundaryCommand[] {
  if (!references) return [];
  const commands: BoundaryCommand[] = [];

  const seen = hashSet<any>();
  document.querySelectorAll(`[${attributeName}]`).forEach((el) => {
    if (get(seen, el)) {
      return;
    }

    const stack: any[] = [];

    while (attr(el, attributeName) != nil) {
      set(seen, el);
      const delta = split(attr(el, attributeName)!, "|");
      attr(el, attributeName, nil);
      for (let i = 0; i < delta.length; i++) {
        let item: any = delta[i];
        if (item === "") {
          continue; // If the attribute starts with "|" it means "keep stack". Splitting the array on "|" will give an empty item.
        }
        const number = item === "-" ? -1 : parseInt(str(item, F) ?? "", 36);
        if (number < 0) {
          stack.length += number;
          continue;
        } else if (i === 0) {
          stack.length = 0; // The first item has an value to replace the stack since not preceded by neither "|" nor an negative number (pop).
        }

        if (isNaN(number) && /^["\[{]/.test(item)) {
          // Poor man's parser. If the JSON contains '|'s keep going until it works.
          let json = "";
          for (; i < delta.length; i++) {
            try {
              item = JSON.parse((json += delta[i]));
              break;
            } catch (e) {}
          }
        }

        if (number >= 0 && references[number]) {
          item = references[number];
        }
        stack.push(item);
      }
      push(
        commands,
        ...map(stack, (data) => ({ add: T, ...data, boundary: el }))
      );
      const next = el.nextElementSibling!; // Ignore TS null error.
      if (el.tagName === "WBR") {
        el.parentNode?.removeChild(el);
      }
      el = next;
    }
  });

  return commands;
}
