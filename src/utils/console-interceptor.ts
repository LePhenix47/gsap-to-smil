type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

export type ConsoleInterceptorOptions = {
  levels?: ConsoleLevel[];
  serverUrl?: string;
};

const ALL_CONSOLE_LEVELS: readonly ConsoleLevel[] = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
];

export class ConsoleInterceptor {
  private static consoleOverride() {}

  static install(options?: ConsoleInterceptorOptions): void {
    const { levels, serverUrl = "http://localhost:3456" } = options ?? {};
    const activeLevels: readonly ConsoleLevel[] = levels ?? ALL_CONSOLE_LEVELS;
    const page: string = window.location.pathname;

    fetch(`${serverUrl}/console/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    }).catch(() => {});

    window.console = new Proxy(console, {
      get(target, prop) {
        const original: unknown = Reflect.get(target, prop);

        if (
          typeof prop !== "string" ||
          !activeLevels.includes(prop as ConsoleLevel) ||
          typeof original !== "function"
        ) {
          return typeof original === "function"
            ? original.bind(target)
            : original;
        }

        return (...callArguments: unknown[]) => {
          (original as (...args: unknown[]) => void).apply(
            target,
            callArguments,
          );

          const serializedArguments: string[] = callArguments.map((argument) =>
            typeof argument === "object"
              ? JSON.stringify(argument)
              : String(argument),
          );

          fetch(`${serverUrl}/console`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page,
              level: prop,
              args: serializedArguments,
            }),
          }).catch(() => {});
        };
      },
    });
  }
}
