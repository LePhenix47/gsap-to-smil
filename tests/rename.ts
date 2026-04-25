import fs from "node:fs";

function iterateFolders(dir: string = "./") {
  const dirs: fs.Dirent[] = fs.readdirSync(dir, {
    encoding: "utf-8",
    withFileTypes: true,
  });

  for (const dirent of dirs) {
    if (dirent.isDirectory()) {
      iterateFolders(`${dir}/${dirent.name}`);

      continue;
    }

    if (
      !dirent.isFile() ||
      !dirent.name.endsWith(".ts") ||
      dirent.name === "rename.ts"
    ) {
      continue;
    }

    console.log(`${dir}/${dirent.name}`);
    fs.renameSync(`${dir}/${dirent.name}`, `${dir}/${dirent.name}.test.ts`);
  }
}

iterateFolders();
