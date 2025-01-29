import { join2, throwError } from "@tailjs/util";

export type QualifiedSchemaTypeName = {
  namespace?: string;
  name: string;
  version?: string;
};

export const parseQualifiedTypeName = (
  qualifiedName: string
): QualifiedSchemaTypeName => {
  const [, namespace, name, version] =
    qualifiedName.match(/^(?:([^#]*)#)?([^#@]+)(?:@(.*))?$/) ??
    throwError(`${qualifiedName} is not a valid qualified type name.`);
  return {
    namespace: namespace || undefined,
    name,
    version: version === "*" || !version ? undefined : version,
  };
};

export const formatQualifiedTypeName = ({
  namespace,
  name,
  version,
}: QualifiedSchemaTypeName) =>
  join2([namespace && namespace + "#", name, version && "@" + version]);
