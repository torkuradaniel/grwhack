function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return String(error);
}

async function run(): Promise<void> {
  const command = process.argv[2] ?? "all";
  const { runAll, runSocial, runWeb } = await import("./index.js");

  if (command === "all" || command === "start") {
    await runAll();
    return;
  }

  if (command === "social") {
    await runSocial();
    return;
  }

  if (command === "web") {
    await runWeb();
    return;
  }

  throw new Error(`Unknown command: ${command}. Expected one of: all, social, web.`);
}

run().catch((error) => {
  console.error("[main] fatal startup error:", formatError(error));
  process.exit(1);
});
