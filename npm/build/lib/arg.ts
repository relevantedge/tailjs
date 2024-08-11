let parsedArgs: Record<string, string>;

export const arg = (...names: string[]) => {
  if (!parsedArgs) {
    parsedArgs = {};
    const parse = (args: string[] | undefined) => {
      if (!args) return;
      args.forEach((arg, i) => {
        if (arg.startsWith("-")) {
          parsedArgs![arg] =
            args[i + 1]?.startsWith("-") === false ? args[i + 1] : "1";
        }
      });
    };
    parse(process.env["BUILD_ARGS"]?.split(/\s+/));
    parse(process.argv.slice(2));
  }
  for (const name of names) {
    if (parsedArgs[name]) {
      return parsedArgs[name];
    }
  }
  return undefined;
};
