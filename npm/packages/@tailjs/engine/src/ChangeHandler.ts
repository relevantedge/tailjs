export interface ChangeHandler<T> {
  (path: string, data: () => Promise<T | null>): Promise<void | boolean>;
}
