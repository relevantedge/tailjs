import { Content, Personalizable } from ".";

export interface View extends Content, Personalizable {
  /**
   * The page was shown in preview/staging mode.
   */
  preview?: boolean;
}
