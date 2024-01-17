export const commandTest =
  <T = any>(...name: any[]) =>
  (command: any): command is T =>
    command === name[0] ||
    name.some(
      (name) => typeof name === "string" && command?.[name] !== undefined
    );
