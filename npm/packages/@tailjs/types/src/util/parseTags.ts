import {
  MaybeUndefined,
  Nullish,
  forEach2,
  isIterable,
  isString,
  map,
  match,
} from "@tailjs/util";
import { ParsableTags, Tag } from "..";

const maybeDecode = <S extends string | Nullish>(s: S): S =>
  // It qualifies:
  s &&
  /^(%[A-F0-9]{2}|[^%])*$/gi.test(s) &&
  // It needs it:
  /[A-F0-9]{2}/gi.test(s)
    ? decodeURIComponent(s)
    : (s as any);

export type TagCollection = Map<string, Tag>;

export const parseTags = <Input extends ParsableTags>(
  tagString: Input,
  prefix?: string
): MaybeUndefined<Input, Tag[]> =>
  map(collectTags(tagString, prefix)?.values()) as any;

export const parseTagValue = <Value extends string | Nullish>(
  value: string | (string | null)[] | null | undefined,
  tagName = "tag"
): Value => parseTags(tagName + value)?.[0] as any;

let key: string;
let current: Tag | undefined;
const collect = (collected: TagCollection, tag: Tag | Nullish) =>
  tag &&
  (!(current = collected.get((key = tag.tag + (tag.value ?? "")))) ||
    (current.score ?? 1) < (tag.score ?? 1)) &&
  collected.set(key, tag);

/**
 * Parses tags from a string or array of strings and collects them in a map to avoid duplicates.
 * In case of ties between tags with the same names and values but with different scores, the highest wins.
 */
export const collectTags = <Input extends ParsableTags>(
  tagString: Input,
  prefix = "",
  collected: TagCollection = new Map()
): MaybeUndefined<Input, TagCollection> => {
  if (!tagString) return undefined as any;
  if (isIterable(tagString)) {
    forEach2(tagString, (input) => collectTags(input, prefix, collected));
    return collected as any;
  }

  /**
   * [namespace::]name[ws*][(:|=)[ws*]value][`~`score] [( |,|;|&|#) more tags]
   *
   * The parts of a tail.j tag are:
   * 1. Optional namespace (utm, ai, cms).
   *   - Anything not whitespace, colon (`:`) or tilde (`~`) followed by double colon `::`.
   * 2. Tag name:
   *   - Anything not whitespace, colon (`:`), tilde `~` or equality (`=`).
   * 3. Optional value.
   *   - Anything not a separator a other whitespace than space (` `).
   *   - If the value is supposed to contain one of these characters it must be quoted in either single (`\`) or double quotes (`"`).
   *   - The tag name and value are separated by either:
   *     - `:` - Follows normal writing convention in many languages (`country: Denmark, name: Glottal sound`), or
   *     - `=` - Is what you typically write in programming.
   *   - Escaping values within quotes is not required. The last quote followed by a terminator or score ends the value. (`tag1: "This "value" contains" quotes" tag2=...`)
   * 4. Optional score. How much the tag applies to the target (for example audience:investors~9 audience:consumers~3 - very relevant for investors, a little bit for consumers).
   *   - You can use decimals in the score (e.g. 5.343).
   *   - The parsed score gets divided by 10, so you should generally aim for values between 0 and 10 since that corresponds to a percentage between 0 and 100%.
   *     This also means that if you output machine generated scores (could be from an algorithm) they tend to already be between 0 and 1, so here you must multiply them with 10 when encoding the tag to get the intended result.
   *   - The default is 10 (100 %).
   *
   *  Tags are separated by either:
   *     - Space (` `) (input friendly)
   *     - Hash tag (`#`) - Some people might do that without thinking about it since that is how they normally write tags
   *     - Comma (`,`) - How most would intuitively join strings in code),
   *     - Semicolon (`;`) - CSS style
   *     - Ampersand - URL query string style.
   *     - Repeated separators gets ignored so don't worry about empty entries if you write something like `tag1,,,,tag2`.
   *
   *   Both namespace, name and value will be URI decoded if they contain %xx anywhere in them.
   */

  isString(tagString)
    ? match(
        tagString,
        /(?:([^\s:~]+)::(?![ :=]))?([^\s~]+?)(?:\s*[:=]\s*(?:"((?:"[^"]*|.)*?)(?:"|$)|'((?:'[^'~]*|.)*?)(?:'|$)|((?: *(?:(?:[^,&;#\s~])))*))\s*)?(?: *~ *(\d*(?:\.\d*)?))?(?:[\s,&;#~]+|$)/g,
        (_, ns, localName: string, quoted1, quoted2, unquoted, score) => {
          const name =
            (ns ? maybeDecode(ns) + "::" : "") +
            prefix +
            maybeDecode(localName);

          let tag: Tag = {
            tag: name,
            value: maybeDecode(quoted1 ?? quoted2 ?? unquoted),
          };
          score &&
            parseFloat(score) !== 10 &&
            (tag.score = parseFloat(score) / 10);
          collect(collected, tag);
        }
      )
    : collect(collected, tagString);

  return collected as any;
};

export const encodeTag = <T extends Tag | null | undefined>(
  tag: T
): T extends Tag ? string : null | undefined =>
  tag == null
    ? (tag as any)
    : tag.tag +
      (tag.value
        ? ":" + (/[,&;#~]/.test(tag.value) ? '"' + tag.value + '"' : tag.value)
        : "") +
      (tag.score && tag.score !== 1 ? "~" + tag.score * 10 : "");
