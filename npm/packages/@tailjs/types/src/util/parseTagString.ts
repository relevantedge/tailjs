import { join } from "@tailjs/util";

export type ParsedTag = { ranks: string[]; value?: string };

const splitRanks = (ranks?: string) =>
  ranks
    ?.toLowerCase()
    .replace(/[^a-zA-Z0-9:.-]/g, "_")
    .split(":")
    .filter((rank) => rank) ?? [];

/**
 * Parses the tags out of a string
 */
export const parseTagString = (
  input: string | (string | null)[] | null | undefined,
  baseRank?: string,
  target?: Set<string>
) => {
  if (!input) return [];
  if (Array.isArray(input)) input = join(input);
  // We have an unescaped percentage sign followed by an uppercase two-digit hexadecimal number. Smells like URI encoding!
  if (/(?<!(?<!\\)\\)%[A-Z0-9]{2}/.test(input)) {
    try {
      input = decodeURIComponent(
        input.replace(
          // Change ampersands to commas (as they are value separators), and quote all values just to be sure nothing gets out of control.
          // That is, `tag=test&tag2&tag3=Encoded%3A%20%22%F0%9F%A5%B3%22` becomes `tag="test",tag2,tag3="Encoded: \"🥳\""
          /([^=&]+)(?:\=([^&]+))?(&|$)/g,
          (_, name, value, sep) =>
            [
              name,
              value && `="${value.replace(/(?<!(?<!\\)\\)("|%22)/g, '\\"')}"`, // Escape double quotes (both encoded `%22` and non-encoded `"`"), but ignore quotes that are already escaped (yes, why not?).
              sep && ",",
            ].join("")
        )
      );
      // Need to catch exceptions. `decodeURIComponent` will fail on invalid surrogate code points. `%80` is one of those.
    } catch {}
  }

  let tags: ParsedTag[] = [],
    parsedTag: ParsedTag,
    baseRanks = splitRanks(baseRank);

  input.replace(
    // Explained:
    // 1. Tag (group 1): (\s*(?=\=)|(?:\\.|[^,=\r\n])+). It means "skip leading white-space", then either"
    //   1.1. \s*(?=\=) is "nothing but a `=`": a blank tag name causing the expression to skip to the actual value. ("=80,=43" are techincally supported but will get omitted unless the are base ranks (*))
    //   2.1. (?:\\.|[^,=\r\n])+ is "something not a linebreak including escaped characters such as \=":
    // 2. Value: (?:\=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|((?:\\.|\s*[^,\s])*)))?. Anything that starts with a `=` until we find a (non-escaped) comma
    //  2.1: (group 2) "((?:\\.|[^"])*)" is any double-quoted ()`"`) value, can contain commas, anything escaped, or whatever. Goes well with JSON.
    //  2.2: (group 3) is same as 2.1 just with a single quote (`'`).
    //  2.3: (group 4) is anything but a non-escaped comma (`,`)
    // 3. The end. (?:[,\s]+|$). This is the tag separator or end of string.
    //        Since tags cannot have line-breaks in them, this technically allows tags to be separated by line-breaks instead of comma.
    //        This should not be documented as values can very much have line-breaks, and that syntax will then bite you in the money-maker at some point.
    //        In the scary example below we get "tag1", "tag21:tag22" and then "tag3" with the value "value\tag4=value"(!).
    //        `tag1
    //        tag21:tag22
    //        tag3=value
    //        tag4=value`
    /\s*(\s*(?=\=)|(?:\\.|[^,=\r\n])+)\s*(?:\=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|((?:\\.|[^,])*)))?\s*(?:[,\s]+|$)/g,
    (_0, tag, quote1, quote2, unquoted) => {
      let value = quote1 || quote2 || unquoted;
      let ranks = splitRanks(tag);

      baseRanks.length &&
        // If we have base ranks (that, is a "prefix"), a single tag value is interpreted as a value. E.g. `<a data-name="foo"...` becomes `data:name=foo`.
        // We have this situation if there is exactly one rank, and no value.
        // Other examples: `<a data-employee="foo:test" ...` gives `data:employee:foo:test`. `data-employee="=test"` gives us `data:employee=test`, and
        //    `data-employee="id=80"` gives us `data:employee:id=80`.
        (ranks.length === 1 && !value && (value = ranks.pop()),
        (ranks = baseRanks.concat(ranks))),
        // If we don't have any ranks (only a value), we don't have a tag.
        ranks.length && // * cf. expression explanition 1.1
          (tags.push(
            (parsedTag = {
              ranks,
              value: value || undefined,
            })
          ),
          target?.add(encodeTag(parsedTag)));
      return ""; // This is a trick. We are not really replacing anything, we are instead using replace as a for loop.
    }
  );
  return tags;
};

export const encodeTag = <T extends ParsedTag | null | undefined>(
  tag: T
): T extends ParsedTag ? string : null | undefined =>
  tag == null
    ? (tag as any)
    : `${tag.ranks.join(":")}${
        tag.value ? `=${tag.value.replace(/,/g, "\\,")}` : ""
      }`;
