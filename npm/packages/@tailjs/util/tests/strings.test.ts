import {
  TextStats,
  changeCase,
  changeIdentifierCaseStyle,
  getTextStats,
} from "../src";

describe("strings.ts", () => {
  it("Can convert between casing styles", () => {
    // kebab_case
    expect(changeIdentifierCaseStyle("Foo", "kebab")).toBe("foo");
    expect(changeIdentifierCaseStyle("$Foo", "kebab")).toBe("$foo");
    expect(changeIdentifierCaseStyle("$$Foo", "kebab")).toBe("$$foo");
    expect(changeIdentifierCaseStyle("Foo$Bar", "kebab")).toBe("foo_$bar");
    expect(changeIdentifierCaseStyle("FooBarID", "kebab")).toBe("foo_bar_id");
    expect(changeIdentifierCaseStyle("camelCase123", "kebab")).toBe(
      "camel_case_123"
    );
    expect(changeIdentifierCaseStyle("test123Test3", "kebab")).toBe(
      "test_123_test_3"
    );
    expect(changeIdentifierCaseStyle("ID", "kebab")).toBe("id");
    expect(changeIdentifierCaseStyle("ID_id", "kebab")).toBe("id_id");
    expect(changeIdentifierCaseStyle("kebab", "kebab")).toBe("kebab");
    expect(changeIdentifierCaseStyle("_kebab", "kebab")).toBe("_kebab");
    expect(changeIdentifierCaseStyle("_-two-snakes", "kebab")).toBe(
      "__two_snakes"
    );
    expect(changeIdentifierCaseStyle("_two_kebabs", "kebab")).toBe(
      "_two_kebabs"
    );

    // snake-case
    expect(changeIdentifierCaseStyle("Foo", "snake")).toBe("foo");
    expect(changeIdentifierCaseStyle("$Foo", "snake")).toBe("$foo");
    expect(changeIdentifierCaseStyle("$$Foo", "snake")).toBe("$$foo");
    expect(changeIdentifierCaseStyle("Foo$Bar", "snake")).toBe("foo-$bar");
    expect(changeIdentifierCaseStyle("FooBarID", "snake")).toBe("foo-bar-id");
    expect(changeIdentifierCaseStyle("camelCase123", "snake")).toBe(
      "camel-case-123"
    );
    expect(changeIdentifierCaseStyle("test123Test3", "snake")).toBe(
      "test-123-test-3"
    );
    expect(changeIdentifierCaseStyle("ID", "snake")).toBe("id");
    expect(changeIdentifierCaseStyle("ID_id", "snake")).toBe("id-id");
    expect(changeIdentifierCaseStyle("kebab", "snake")).toBe("kebab");
    expect(changeIdentifierCaseStyle("_kebab", "snake")).toBe("-kebab");
    expect(changeIdentifierCaseStyle("_-two-snakes", "snake")).toBe(
      "--two-snakes"
    );
    expect(changeIdentifierCaseStyle("_two_kebabs", "snake")).toBe(
      "-two-kebabs"
    );

    // PascalCase
    expect(changeIdentifierCaseStyle("Foo", "pascal")).toBe("Foo");
    expect(changeIdentifierCaseStyle("$Foo", "pascal")).toBe("$Foo");
    expect(changeIdentifierCaseStyle("$$Foo", "pascal")).toBe("$$Foo");
    expect(changeIdentifierCaseStyle("Foo$Bar", "pascal")).toBe("Foo$Bar");
    expect(changeIdentifierCaseStyle("FooBarID", "pascal")).toBe("FooBarID");
    expect(changeIdentifierCaseStyle("camelCase123", "pascal")).toBe(
      "CamelCase123"
    );
    expect(changeIdentifierCaseStyle("test123Test3", "pascal")).toBe(
      "Test123Test3"
    );
    expect(changeIdentifierCaseStyle("ID", "pascal")).toBe("ID");
    expect(changeIdentifierCaseStyle("ID_id", "pascal")).toBe("IDId");
    expect(changeIdentifierCaseStyle("kebab", "pascal")).toBe("Kebab");
    expect(changeIdentifierCaseStyle("_kebab", "pascal")).toBe("_Kebab");
    expect(changeIdentifierCaseStyle("_-two-snakes", "pascal")).toBe(
      "__TwoSnakes"
    );
    expect(changeIdentifierCaseStyle("_two_kebabs", "pascal")).toBe(
      "_TwoKebabs"
    );

    // camelCase
    expect(changeIdentifierCaseStyle("Foo", "camel")).toBe("foo");
    expect(changeIdentifierCaseStyle("$Foo", "camel")).toBe("$foo");
    expect(changeIdentifierCaseStyle("$$Foo", "camel")).toBe("$$foo");
    expect(changeIdentifierCaseStyle("Foo$Bar", "camel")).toBe("foo$Bar");
    expect(changeIdentifierCaseStyle("FooBarID", "camel")).toBe("fooBarID");
    expect(changeIdentifierCaseStyle("camelCase123", "camel")).toBe(
      "camelCase123"
    );
    expect(changeIdentifierCaseStyle("test123Test3", "camel")).toBe(
      "test123Test3"
    );
    expect(changeIdentifierCaseStyle("ID", "camel")).toBe("id");
    expect(changeIdentifierCaseStyle("ID_id", "camel")).toBe("idId");
    expect(changeIdentifierCaseStyle("kebab", "camel")).toBe("kebab");
    expect(changeIdentifierCaseStyle("_kebab", "camel")).toBe("_kebab");
    expect(changeIdentifierCaseStyle("_-two-snakes", "camel")).toBe(
      "__twoSnakes"
    );
    expect(changeIdentifierCaseStyle("_two_kebabs", "camel")).toBe(
      "_twoKebabs"
    );

    //expect(changeIdentifierCaseStyle("FooBar", "pascal")).toBe("id");
  });

  it("Text statistics checks out.", () => {
    expect(getTextStats("abcd")).toEqual({
      text: "abcd",
      length: 4,
      characters: 4,
      words: 1,
      sentences: 1,
      lix: 1,
      readingTime: 252,
      boundaries: [
        {
          offset: 0,
          readingTime: 0,
          wordsBefore: 0,
        },
        {
          offset: 1,
          readingTime: 0,
          wordsBefore: 0,
        },
        {
          offset: 2,
          readingTime: 0,
          wordsBefore: 0,
        },
        {
          offset: 3,
          readingTime: 0,
          wordsBefore: 0,
        },
        {
          offset: 4,
          readingTime: 0,
          wordsBefore: 0,
        },
      ],
    } as TextStats);

    expect(getTextStats("This is a test")).toEqual({
      text: "This is a test",
      length: 14,
      characters: 11,
      words: 4,
      lix: 4,
      readingTime: 1008,
      sentences: 1,
      boundaries: [
        {
          offset: 0,
          readingTime: 0,
          wordsBefore: 0,
        },
        {
          offset: 2,
          readingTime: 0,
          wordsBefore: 0,
        },
        {
          offset: 6,
          readingTime: 252,
          wordsBefore: 1,
        },
        {
          offset: 11,
          readingTime: 252,
          wordsBefore: 1,
        },
        {
          offset: 14,
          readingTime: 0,
          wordsBefore: 0,
        },
      ],
    });

    // 29 characters.
    // Boundary limits: 0, 7, 14, 21, 29
    // This is a test. Yes? Yes it is!    90 Period
    // 0123 45 6 7890  123  456 78 90     12 345678
    expect(
      getTextStats("   \n   This is a test. Yes? Yes it is!    90 Period   ")
    ).toEqual({
      text: "   \n   This is a test. Yes? Yes it is!    90 Period   ",
      length: 54,
      characters: 29,
      words: 10,
      lix: 3,
      readingTime: 2521,
      sentences: 4,
      boundaries: [
        {
          offset: 7,
          readingTime: 0,
          wordsBefore: 0,
        },
        {
          offset: 16,
          readingTime: 756,
          wordsBefore: 3,
        },
        {
          offset: 26,
          readingTime: 504,
          wordsBefore: 2,
        },
        {
          offset: 37,
          readingTime: 756,
          wordsBefore: 3,
        },
        {
          offset: 51,
          readingTime: 504,
          wordsBefore: 2,
        },
      ],
    });

    // Examples from https://readabilityformulas.com/the-lix-readability-formula/
    expect(
      getTextStats(
        "Where the amount of the annuity derived by the taxpayer during a year of income is more than, or less than, the amount payable for a whole year, the amount to be exclude from the amount so derived is the amount which bears to the amount which, but for this sub-section, would be the amount to be so, excluded the same proportion as the amount so derived bears to the amount payable for the whole year."
      ).lix
    ).toBe(91);

    expect(
      getTextStats(
        "I went to sleep with gum in my mouth and now there’s gum in my hair and when I got out of bed this morning I tripped on my skateboard and by mistake I dropped my sweater in the sink while the water was running and I could tell it was going to be a terrible, horrible, no good, very bad day. I think I’ll move to Australia"
      ).lix
    ).toBe(50);
  });
});
