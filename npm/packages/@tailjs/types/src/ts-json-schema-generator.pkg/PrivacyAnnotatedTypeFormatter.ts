import {
  AnnotatedType,
  AnnotatedTypeFormatter,
  Definition,
} from "ts-json-schema-generator";
import { getPrivacyAnnotations, parsePrivacyTokens } from "@tailjs/types";

export class PrivacyAnnotatedTypeFormatter extends AnnotatedTypeFormatter {
  getDefinition(type: AnnotatedType): Definition {
    const privacy = type.getAnnotations()?.privacy;
    const definition = super.getDefinition(type);
    if (privacy) {
      const classifications = parsePrivacyTokens(privacy);
      Object.assign(definition, getPrivacyAnnotations(classifications));

      delete (definition as any).privacy;
    }

    return definition;
  }
}
