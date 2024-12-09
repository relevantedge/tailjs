import {
  flatMap2,
  forEach2,
  get2,
  skip2,
  throwError,
  update2,
} from "@tailjs/util";
import {
  SchemaDefinition,
  SchemaObjectTypeDefinition,
  SchemaTypeDefinition,
} from "../../../..";

export type ParseContext = {
  schema?: SchemaDefinition;
  node: any;
  refPaths: string[];
  schemas: SchemaDefinition[];
  types: Map<string, SchemaTypeDefinition & ParsedJsonSchemaTypeDefinition>;
  refs: {
    add(ref: string, id: string, type: SchemaTypeDefinition): void;
    resolve(
      ref: string,
      callback: (id: string, type: SchemaTypeDefinition) => void
    ): void;
    pending(): string[];
  };
} & (
  | { parent?: ParseContext; key?: undefined }
  | { parent: ParseContext; key: string | number }
);

export const sourceJsonSchemaSymbol = Symbol();
export interface ParsedJsonSchemaTypeDefinition
  extends SchemaObjectTypeDefinition {
  [sourceJsonSchemaSymbol]: { schema: SchemaDefinition; remove: () => void };
}

export const createRootContext = (root: any): ParseContext => {
  const typeRefs = new Map<string, [id: string, type: SchemaTypeDefinition]>();

  const refCallbacks = new Map<
    string,
    ((id: string, type: SchemaTypeDefinition) => void)[]
  >();

  return {
    node: root,
    refPaths: [],
    schemas: [],
    types: new Map(),
    refs: {
      add: (ref, id, type) => {
        update2(typeRefs, ref, (current) =>
          current
            ? throwError(`A type with the id '${id}' is already registered `)
            : [id, type]
        );
        forEach2(refCallbacks.get(ref)?.splice(0), (callback) =>
          callback(id, type)
        );
      },
      resolve: (ref, callback) => {
        const current = typeRefs.get(ref);
        if (current) {
          callback(current[0], current[1]);
          return;
        }
        get2(refCallbacks, ref, () => []).push(callback);
      },

      pending: () =>
        flatMap2(refCallbacks, ([ref, values]) =>
          values?.length ? ref : skip2
        ),
    },
  };
};

export const getPath = (context: ParseContext) =>
  context.key ? `${getPath(context.parent)}/${context.key}` : "";

export const contextError = (context: ParseContext, message: string) =>
  throwError(`${getPath(context)}: ${message}`);

export const navigateContext = (parent: ParseContext, key: string | number) => {
  const node = parent.node[key];
  if (!node || typeof node !== "object") {
    return contextError(parent, `Property '${key}' is not an object or array.`);
  }

  const ownRefPaths = parent ? [key] : [];

  const childContext: ParseContext = {
    ...parent,
    parent: parent,
    key,
    refPaths: ownRefPaths.flatMap(
      (fragment) => parent?.refPaths.map((path) => path + "/" + fragment) ?? []
    ),
    node,
  };

  return childContext;
};
