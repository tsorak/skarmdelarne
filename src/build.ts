export async function buildClient() {
  const cmd = new Deno.Command("bun", {
    args: ["run", "build"],
    cwd: "./solid/",
    stdout: "inherit",
    stderr: "piped",
  });

  console.log("Building client...");

  const proc = await cmd.output();

  if (proc.success) {
    console.log("\n✔  Client built successfully\n");
  } else {
    console.log(new TextDecoder().decode(proc.stderr));

    throw new Error(`Build process exited with code: ${proc.code}`);
  }
}
