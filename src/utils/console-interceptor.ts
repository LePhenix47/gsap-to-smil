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
  static install(options?: ConsoleInterceptorOptions): void {
    const { levels, serverUrl = "http://localhost:3456" } = options ?? {};
    const activeLevels: readonly ConsoleLevel[] = levels ?? ALL_CONSOLE_LEVELS;
    const page: string = window.location.pathname;

    fetch(`${serverUrl}/console/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    }).catch(() => {});

    for (const level of activeLevels) {
      const original = console[level].bind(console);

      console[level] = (...callArguments: unknown[]) => {
        original(...callArguments);

        const serializedArguments: string[] = callArguments.map((argument) =>
          typeof argument === "object"
            ? JSON.stringify(argument)
            : String(argument),
        );

        fetch(`${serverUrl}/console`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, level, args: serializedArguments }),
        }).catch(() => {});
      };
    }
  }
}
