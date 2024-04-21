import { isNumber, isString } from "@tailjs/util";
import {
  BaseType,
  Context,
  Definition,
  EnumNodeParser,
  EnumType,
  EnumTypeFormatter,
  UnionType,
  UnionTypeFormatter,
  ts,
} from "ts-json-schema-generator";

const descriptionsSymbol = Symbol();
export class EnumDescriptionNodeParser extends EnumNodeParser {
  override createType(
    node: ts.EnumDeclaration | ts.EnumMember,
    context: Context
  ): BaseType {
    const type = super.createType(node, context);

    const descriptions: Record<string, any> = {};
    ts.SyntaxKind.AbstractKeyword;
    if (ts.isEnumDeclaration(node)) {
      for (const member of node.members) {
        const comment = ts
          .getJSDocCommentsAndTags(member)
          .map((node) => node.comment)
          .filter((comment) => comment)
          .map((node) =>
            (isString(node)
              ? node
              : (node as any as ts.Node[])
                  .map((node) => node.getText())
                  .join("\n")
            )
              .replace(/^(\s*[\/\*]+\s*)*/gm, "")
              .replace(/(\r\n|\r)/g, "\n")
          )

          .join("\n\n");

        const value = member.initializer?.getText();
        if (comment && value) {
          descriptions[value] = comment;
        }
      }
    }
    type[descriptionsSymbol] = descriptions;
    return type;
  }
}

export class EnumDescriptionFormatter extends EnumTypeFormatter {
  override getDefinition(type: EnumType): Definition {
    const def = super.getDefinition(type);
    const descriptions = type[descriptionsSymbol] as Record<string, string>;
    if (descriptions) {
      return {
        anyOf: def.enum?.map((value) => ({
          const: value,
          description: descriptions["" + value],
        })),
      };
    }
    return def;
  }
}

export class EnumNameDescriptionFormatter extends UnionTypeFormatter {
  override getDefinition(type: UnionType): Definition {
    const def = super.getDefinition(type);

    const anyOf = def.anyOf as any[];
    if (anyOf) {
      const consts = anyOf.filter((item) => isNumber(item.const));
      if (consts.length) {
        const stringIndex = anyOf.findIndex(
          (item) => item.type === "string" && item.enum
        );

        if (stringIndex > -1) {
          const strings = anyOf[stringIndex].enum as string[];
          if (strings?.length === consts?.length) {
            strings.forEach((string, index) => {
              consts[index].enum = [string, consts[index].const];
              delete consts[index].const;
            });
            (def.anyOf as any[]).splice(stringIndex, 1);
          }
        }
      }
    }
    return def;
  }
}
