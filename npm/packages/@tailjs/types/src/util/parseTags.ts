import {
  Falsish,
  forEach,
  isIterable,
  isString,
  match,
  MaybeUndefined,
  Nullish,
  tryCatch,
} from "@tailjs/util";
import { BoundaryDataTag, ParsableTags, Tag, TagMap, uniqueTags } from "..";

const ESCAPED_CHAR = /%[A-F0-9]{2}/i;
const maybeDecode = <S extends string | Nullish>(s: S): S =>
  s && ESCAPED_CHAR.test(s)
    ? tryCatch(() => decodeURIComponent(s), s)
    : (s as any);

export type MapTagOptions = {
  prefix?: string;
  ns?: string;
  eventType?: string;
};

export const mapTags: {
  (
    tags: ParsableTags<Tag>,
    options?: MapTagOptions & { eventType?: undefined }
  ): Tag[] | undefined;
  (tags: ParsableTags, options?: MapTagOptions): BoundaryDataTag[] | undefined;
} = (tags: ParsableTags<BoundaryDataTag>, options?: MapTagOptions) =>
  uniqueTags(collectTags(tags, options), false) as any;

const TAG_GRAMMAR =
  /(?:^|[\s,&#])(?:([^\s,:="'&#~]+)::)?([^\s,='"&#~]+)(?:\s*=\s*(?:"((?:\\.|[^"\\]+)*)"?|'((?:\\.|[^'\\]+)*)'?|((?:\s*[^,~&#\s]+)+)))?(?:~\s*((?:\d*\.\d)?\d*))?/g;

const NS_AND_TAG = /^(?:([^:]+)::)?(.*)$/;
const STRIP_EXTRA_COLONS = /^:+|:+$|(:):*/g;

/**
 * Parses tags from a string or array of strings and collects them in a map to avoid duplicates.
 *
 * Syntax #?[namespace::][tag][=value][~weight][,&].
 * Namespace and tags may contain any characters except whitespace, `,`, `=`, `"`, `~` and `&`.
 * Value must be quoted (`"value"` or `'value'`) if it contains any of the characters `,`, `~`, `&` or `~`. Escape the quote character with backslash (`\"` or `\'`) if needed.
 * The score may be any floating point number.
 *
 * Multi-level tags have their levels separated by `:` by convention.
 */
export const collectTags = <Input extends ParsableTags>(
  parsableTag: Input,
  options?: MapTagOptions,
  collected?: Tag[]
): MaybeUndefined<Input, Tag[]> => {
  if (parsableTag) {
    if (isIterable(parsableTag)) {
      forEach(
        parsableTag,
        (input) => (collected = collectTags(input, options, collected))
      ) as any;
    } else if (typeof parsableTag === "object" && !("tag" in parsableTag)) {
      collected = parseTagMap(parsableTag, options, collected) as any;
    } else if (isString(parsableTag)) {
      match(
        parsableTag,
        TAG_GRAMMAR,
        (
          _,
          ns,
          localName: string,
          doubleQuoted,
          singleQuoted,
          unquoted,
          score
        ) => {
          collected = addValidatedTag(
            collected,
            {
              tag: maybeDecode(localName),
              value: maybeDecode(
                (doubleQuoted ?? singleQuoted)?.replace(/\\(.)/g, (_, p) =>
                  p === "r" ? "\r" : p === "n" ? "\n" : p === "t" ? "\t" : p
                ) ?? unquoted
              ),
              score: score ? parseFloat(score) : undefined,
              eventType: options?.eventType,
            },
            options?.prefix,
            maybeDecode(ns) || options?.ns
          );
        }
      );
    } else {
      collected = addValidatedTag(
        collected,
        parsableTag as BoundaryDataTag,
        options?.prefix,
        options?.ns
      );
    }
  }

  return collected as any;
};

export const encodeTag = <T extends Tag | null | undefined>(
  tag: T
): T extends Tag ? string : null | undefined =>
  tag == null
    ? (tag as any)
    : tag.tag +
      (tag.value
        ? "=" +
          (/[,&,#~"]/.test(tag.value)
            ? '"' + tag.value.replace(/"/, '\\"') + '"'
            : tag.value)
        : "") +
      (tag.score && tag.score !== 1 ? "~" + tag.score : "");

const parseTagName = (
  qualifiedName: string,
  appendPrefix?: string,
  nsOnly = false
): [ns: string | undefined, localName: string] => {
  let [_, ns, localName] = qualifiedName.match(NS_AND_TAG)!;
  return [
    ns,
    (appendPrefix ? `${appendPrefix}:${localName}` : localName).replace(
      STRIP_EXTRA_COLONS,
      "$1"
    ),
  ];
};
const addValidatedTag = (
  target: BoundaryDataTag[] | undefined,
  boundaryTag: BoundaryDataTag | undefined,
  prefix?: string,
  ns?: string
) => {
  if (!boundaryTag) {
    return target;
  }

  let [localNs = ns, tag] = parseTagName(boundaryTag.tag, prefix);
  if (tag) {
    if (localNs) {
      tag = localNs + "::" + tag;
    }
    (target ??= []).push(
      tag !== boundaryTag.tag || boundaryTag.value === ""
        ? { ...boundaryTag, tag, value: boundaryTag.value || undefined }
        : boundaryTag
    );
  }
  return target;
};

const TAG_VALUE_PROPS = { value: true, score: true, eventType: true };

const extractTags = (
  target: BoundaryDataTag[] | undefined,
  map: TagMap | Falsish,
  ns: string | undefined,
  eventType: string | undefined,
  prefix: string
) => {
  if (map) {
    if ("value" in map || "score" in map || "eventType" in map) {
      target = addValidatedTag(
        target,
        { tag: "", eventType, ...map },
        prefix,
        ns
      );
    } else {
      for (let prop in map) {
        const value = map[prop];
        if (!value || TAG_VALUE_PROPS[prop]) {
          continue;
        }

        const [localNs = ns, localName] = parseTagName(prop);
        if (typeof value === "object") {
          target = extractTags(
            target,
            value as any,
            localNs,
            eventType,
            `${prefix}:${localName}`
          );
        } else {
          target = addValidatedTag(
            target,
            {
              tag: localName,
              value: value === true ? undefined : value,
              eventType,
            },
            prefix,
            localNs
          );
        }
      }
    }
  }
  return target;
};

const parseTagMap = (
  map: Falsish | TagMap,
  options: MapTagOptions | undefined,
  target: BoundaryDataTag[] | undefined
) =>
  extractTags(
    target,
    map,
    options?.ns,
    options?.eventType,
    options?.prefix ? options.prefix + ":" : ""
  );
