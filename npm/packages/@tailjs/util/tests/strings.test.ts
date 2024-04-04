import { changeCase, changeIdentifierCaseStyle } from "../src";

describe("strings.ts", () => {
  it("Can convert between casing styles.", () => {
    // kebab_case
    expect(changeIdentifierCaseStyle("Foo", "kebab")).toBe("foo");
    expect(changeIdentifierCaseStyle("$Foo", "kebab")).toBe("$foo");
    expect(changeIdentifierCaseStyle("$$Foo", "kebab")).toBe("$$foo");
    expect(changeIdentifierCaseStyle("Foo$Bar", "kebab")).toBe("foo_$bar");
    expect(changeIdentifierCaseStyle("FooBarID", "kebab")).toBe("foo_bar_id");
    expect(changeIdentifierCaseStyle("camelCase123", "kebab")).toBe(
      "camel_case123"
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
      "camel-case123"
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
});
