import { JsonSchemaAnnotations, TypeScriptAnnotations } from "@constants";
import { DataPurposes, parseSchemaDataUsageKeywords } from "@tailjs/types";
import {
  AnnotatedType,
  AnnotatedTypeFormatter,
  Definition,
} from "ts-json-schema-generator";

export class PrivacyAnnotatedTypeFormatter extends AnnotatedTypeFormatter {
  getDefinition(type: AnnotatedType): Definition {
    const definition = super.getDefinition(type);
    const annotations = type.getAnnotations();
    if (!annotations) {
      return definition;
    }

    const {
      [TypeScriptAnnotations.privacy]: privacy,
      [TypeScriptAnnotations.abstract]: abstract,
      [TypeScriptAnnotations.access]: access,
      [TypeScriptAnnotations.system_type]: systemType,
      [TypeScriptAnnotations.variables]: variables,
      [TypeScriptAnnotations.event]: event,
      [TypeScriptAnnotations.version]: version,
    } = annotations;
    if (privacy || access) {
      const usage = parseSchemaDataUsageKeywords([privacy, access], true);
      usage.classification &&
        (definition[JsonSchemaAnnotations.Classification] =
          usage.classification);
      usage.purposes &&
        (definition[JsonSchemaAnnotations.Purposes] = DataPurposes.parse(
          usage.purposes,
          { names: true, includeDefault: false }
        ));

      (usage.readonly || usage.visibility || usage.dynamic) &&
        (definition[JsonSchemaAnnotations.Access] = [
          usage.readonly && "readonly",
          usage.dynamic && "dynamic",
          usage.visibility,
        ].filter((item) => item));
    }
    if (systemType) {
      definition[JsonSchemaAnnotations.SystemType] = systemType;
    }
    if (abstract) {
      definition.not = {}; // Means the type cannot be instantiated itself.
      definition[JsonSchemaAnnotations.Abstract] = true; // Easier to read.
    }

    if (version) {
      definition[JsonSchemaAnnotations.Version] = version;
    }

    if (event) {
      definition[JsonSchemaAnnotations.Event] = true;
    }
    if (variables) {
      definition[JsonSchemaAnnotations.Variables] = true;
    }

    for (const annotation in TypeScriptAnnotations) {
      delete (definition as any)[TypeScriptAnnotations[annotation]];
    }

    return definition;
  }
}
