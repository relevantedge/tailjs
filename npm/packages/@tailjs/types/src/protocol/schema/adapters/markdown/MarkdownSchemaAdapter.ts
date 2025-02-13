import { sort2, topoSort2 } from "@tailjs/util";
import {
  DataPurposes,
  Schema,
  SchemaAdapter,
  SchemaDefinition,
  SchemaObjectType,
  SchemaPropertyType,
} from "../../../..";

const formatTypeName = (type: SchemaPropertyType) => {
  if ("primitive" in type) {
    if ("format" in type.source) {
      return type.source.format;
    }
    return type.primitive;
  }
  if ("item" in type) {
    return `Array\\<${formatTypeName(type.item)}\\>`;
  }
  if ("key" in type) {
    return `Map\\<${formatTypeName(type.key)}, ${formatTypeName(
      type.value
    )}\\>`;
  }
  if ("union" in type) {
    return type.union.map((type) => formatTypeName(type)).join(" or ");
  }

  return typeRef(type, "link");
};

const typeRef = (type: SchemaObjectType, format?: "id" | "anchor" | "link") =>
  format === "anchor"
    ? `{#${typeRef(type)}}`
    : format === "link"
    ? `[${type.name}](#${typeRef(type)})`
    : `type--${type.id.replace(/[^a-zA-Z0-9_]/g, "-")}`;

const md = (md: string | null | undefined) =>
  md
    ? md
        .replace(/\s*\{@link([^}]*)\}/g, "`$1`")
        .replace(/[<>]/g, "\\$1")
        //.replace(/([\\`*_{}[\]#\|])/g, "\\$1")
        .trim()
        .replace(/ +/g, " ")
    : //.replace(/\s*(\r?\n)/g, "<br>")
      "";

export class MarkdownSchemaAdapter implements SchemaAdapter {
  parse(source: any): SchemaDefinition[] {
    throw new Error("Not supported");
  }
  serialize(schemas: readonly Schema[]): string | undefined {
    const lines: string[] = [];
    for (const schema of schemas) {
      const types = topoSort2(
        sort2(schema.types.values(), (type) => type.name),
        (type) => type.extends
      );

      const eventType = types.find((type) => type.system === "event");
      const eventTypes: SchemaObjectType[] = [];
      const otherTypes: SchemaObjectType[] = [];
      for (const type of types) {
        (type === eventType || (eventType && type.extendsAll.has(eventType!))
          ? eventTypes
          : otherTypes
        ).push(type);
      }

      const typeGroups = [
        { name: "Events", types: eventTypes },
        { name: "Other types", types: otherTypes },
      ];

      for (const { name, types } of typeGroups) {
        if (!types.length) continue;
        lines.push("", `# ${name}`);
        for (const type of types) {
          if (type.system === "patch") {
            continue;
          }

          lines.push("", `## ${md(type.name)} ${typeRef(type, "anchor")}`);
          const topTable: [string, string][] = [];

          if (type.extends.length) {
            topTable.push([
              "Extends",
              type.extends.map((type) => typeRef(type, "link")).join(", "),
            ]);
          }
          if (type.usage.classification !== "anonymous") {
            topTable.push(["privacy", type.usage.classification]);
          }

          topTable.push([
            "purposes",
            DataPurposes.parse(type.usage.purposes, {
              names: true,
            }).join(", "),
          ]);

          if (topTable.length) {
            //lines.push("<table>");
            for (const [label, value] of topTable) {
              //lines.push(`<tr><td>*${label}*</td><td>${value}</td></tr>`);
              lines.push(`*${label}*: ${value}`);
            }
            //lines.push("</table>");
          }

          if (type.description) {
            lines.push("", md(type.description));
          }

          const properties = Object.values(type.ownProperties);
          if (properties.length) {
            lines.push(
              "",
              "|Name|Type|Privacy|Purposes|Description|",
              "|-|-|-|-|-|"
              // "<table>",
              // "<tr><th>Name</th><th>Type</th><th>Privacy</th><th>Purposes</th><th>Description</th></tr>"
            );
            for (const property in type.ownProperties) {
              const prop = type.ownProperties[property];
              lines.push(
                [
                  "",
                  md(prop.name),
                  formatTypeName(prop.type),
                  prop.usage?.classification !== "anonymous"
                    ? prop.usage?.classification ?? ""
                    : "",
                  DataPurposes.parse(prop.usage?.purposes, {
                    names: true,
                    includeDefault: false,
                  })?.join(", ") ?? "",
                  md(prop.description).replace(/\r?\n/g, "<br>"),
                  "",
                ].join("|")
              );
            }
          }
        }
      }
    }

    return lines.join("\n");
  }
}
