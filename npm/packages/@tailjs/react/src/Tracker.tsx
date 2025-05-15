export const Tracker = (props: any) => {
  console.warn(
    "The `Tracker~ component is obsolete. Use the `TailJsPlugin` from `@tailjs/react/webpack` instead."
  );
  return ((props: any) => props.children) as any;
};
