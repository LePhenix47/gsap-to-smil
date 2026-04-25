import fs from "node:fs";

function rename(file: File, newValue: string) {
  fs.rename(file.name, newValue, (err) => {
    if (err) throw err;
  });
}

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

    if (dirent.isFile()) {
      rename(dirent, dirent.name.replace(".ts", ".test.ts"));
    }

    console.log(`${dir}/${dirent.name}`);
  }
}

fs.readdir(
  "./",
  {
    encoding: "utf-8",
    withFileTypes: true,
  },
  (err, files) => {
    if (err) throw err;
    console.log(files);

    console.log(files);

    for (const file of files) {
      if (file.isDirectory()) {
        continue;
      }

      console.log(file.name);

      fs.rename(file.name, file.name.replace(".ts", ".test.ts"), (err) => {
        if (err) throw err;
      });
    }
  },
);
