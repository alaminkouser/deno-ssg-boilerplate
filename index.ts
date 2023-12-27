import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import * as pagefind from "npm:pagefind";

const SOURCE = "./source/";
const DOCUMENTS = "./documents/";
const MERMAID_VERSION = "10.6.1";
const WORKBOX_VERSION = "7.0.0";

function getFileList(source: string): Promise<Array<string>> {
  const FILE_LIST: Array<string> = [];
  async function getFilesRecursively(source: string): Promise<Array<string>> {
    for await (const entry of Deno.readDir(source)) {
      if (entry.isFile) FILE_LIST.push(source + entry.name);
      if (entry.isDirectory) {
        await getFilesRecursively(source + entry.name + "/")
          .catch((error) => {
            return error;
          });
      }
    }
    return FILE_LIST;
  }
  return new Promise((resolve, reject) => {
    if (!source.endsWith("/")) {
      reject(
        "SOURCE IS NOT A DIRECTORY.",
      );
    }
    Deno.stat(source)
      .then((value) => {
        if (value.isDirectory) {
          getFilesRecursively(source)
            .then((v) => {
              resolve(v);
            });
        } else {
          reject(
            "SOURCE IS NOT A DIRECTORY.",
          );
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function makeDirectoryForFile(filePath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const DIRECTORY_PATH = filePath.split("/").slice(0, -1).join("/");
    function makeDirectory() {
      Deno.mkdir(DIRECTORY_PATH, { recursive: true }).then(() => {
        resolve(true);
      }).catch((_) => {
        reject(false);
      });
    }
    Deno.stat(DIRECTORY_PATH).then((value) => {
      if (value.isDirectory === true) {
        resolve(true);
      } else {
        makeDirectory();
      }
    }).catch((_) => {
      makeDirectory();
    });
  });
}

function getHTMLFromMarkdown(markdown: string): string {
  function addTargetBlank(html: string) {
    const regex = /<a href="(http[^"]+)"([^>]+)>/g;
    return html.replace(regex, (_match, url, rest) => {
      return `<a href="${url}" target="_blank"${rest}>`;
    });
  }
  const CONTENT: string = addTargetBlank(marked.parse(markdown));
  const TITLE = /<h1>(.*?)<\/h1>/.exec(CONTENT)![1];
  const MERMAID = CONTENT.includes('<pre><code class="language-mermaid">')
    ? true
    : false;
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
        <title>${TITLE}</title>
        <meta name="description" content="AL AMIN KOUSER">
        <link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png">
        <link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png">
        <link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png">
        <link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png">
        <link rel="apple-touch-icon" sizes="114x114" href="/apple-icon-114x114.png">
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-icon-120x120.png">
        <link rel="apple-touch-icon" sizes="144x144" href="/apple-icon-144x144.png">
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-icon-152x152.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-icon-180x180.png">
        <link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
        <link rel="manifest" href="/manifest.json">
        <meta name="msapplication-TileColor" content="#000000">
        <meta name="msapplication-TileImage" content="/ms-icon-144x144.png">
        <meta name="view-transition" content="same-origin" />
        <meta name="theme-color" content="#000000">
        <link rel="stylesheet" href="/index.css">
    </head>
    
    <body>
        <div class="topAnchor">
            <a href="/">
                <img src="/website.svg" alt="HOME" width="32" height="32">
            </a>
            <div class="search">
                <input type="text" placeholder="SEARCH" disabled spellcheck="false">
                <div></div>
            </div>
            <button>
                <img src="/share.svg" alt="SHARE" width="32" height="32">
            </button>
        </div>
        <div class="content">
            ${CONTENT}
        </div>
        ${MERMAID ? `<script src="/mermaid/index.js"></script>` : ""}
        <script src="/index.js"></script>
    </body>
    </html>`;
}

function getRemoteFiles(): Promise<boolean> {
  const FILE_LIST: Array<{ URL: string; PATH: string }> = [];
  FILE_LIST.push({
    "URL":
      `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.min.js`,
    "PATH": "mermaid/index.js",
  });
  [
    "workbox-sw",
    "workbox-cacheable-response.prod",
    "workbox-core.prod",
    "workbox-expiration.prod",
    "workbox-precaching.prod",
    "workbox-recipes.prod",
    "workbox-routing.prod",
    "workbox-strategies.prod",
  ].forEach((value) => {
    FILE_LIST.push({
      "URL":
        `https://storage.googleapis.com/workbox-cdn/releases/${WORKBOX_VERSION}/${value}.js`,
      "PATH": `workbox/${value}.js`,
    });
    FILE_LIST.push({
      "URL":
        `https://storage.googleapis.com/workbox-cdn/releases/${WORKBOX_VERSION}/${value}.js.map`,
      "PATH": `workbox/${value}.js.map`,
    });
  });
  ["docx", "epub", "odt", "pdf", "rtf", "txt"].forEach((value) => {
    FILE_LIST.push({
      "URL":
        `https://docs.google.com/document/d/1svQJnUtHh8z1UUGw9lHrTLF4j1zMo4AkBawzmvz1eec/export?format=${value}`,
      "PATH": `resume/AL AMIN KOUSER.${value}`,
    });
  });
  async function _getRemoteFiles(): Promise<boolean> {
    const ERROR_LIST: Array<{ URL: string; PATH: string }> = [];
    async function getSingleFile(file: { URL: string; PATH: string }): Promise<boolean> {
      return await fetch(file.URL).then(async (response) => {
        const blob = await response.blob();
        await makeDirectoryForFile(DOCUMENTS + file.PATH);
        return await Deno.writeFile(
          DOCUMENTS + file.PATH,
          new Uint8Array(await blob.arrayBuffer()),
        ).then((_) => {
          return Promise.resolve(true);
        });
      }).catch((_) => {
        return Promise.reject(false);
      });
      
    }
    await Promise.all(FILE_LIST.map(async (value) => {
      try {
        await getSingleFile(value);
        return await Promise.resolve(true);
      } catch (_) {
        ERROR_LIST.push(value);
        return await Promise.reject(false);
      }
    }));
    if (ERROR_LIST.length === 0) {
      return Promise.resolve(true);
    } else {
      return Promise.reject(false);
    }
  }
  return new Promise((resolve, reject) => {
    _getRemoteFiles().then((_) => {
      resolve(true);
    }).catch((_) => {
      reject(false);
    });
  });
}

function runPagefind(): Promise<boolean> {
  async function _runPagefind(): Promise<boolean> {
    const { index } = await pagefind.createIndex({
      "rootSelector": "html",
      "excludeSelectors": [],
      "forceLanguage": "en",
      "verbose": true,
      "keepIndexUrl": false,
    });

    await index!.addDirectory({
      path: DOCUMENTS,
    });
    return await index!.writeFiles({
      outputPath: DOCUMENTS + "pagefind",
    }).then((_) => {
      return Promise.resolve(true);
    }).catch((_) => {
      return Promise.reject(false);
    });
  }
  return new Promise((resolve, reject) => {
    _runPagefind().then((_) => {
      Deno.readTextFile(DOCUMENTS + "pagefind/pagefind.js").then((value) => {
        Deno.writeTextFile(
          DOCUMENTS + "pagefind/pagefind.js",
          value.replace("?ts=${Date.now()}", ""),
        );
      }).then((_) => {
        resolve(true);
      }).catch((_) => {
        reject(false);
      });
    }).catch((_) => {
      reject(false);
    });
  });
}

if (DOCUMENTS.endsWith("/")) {
  Deno.stat(DOCUMENTS).then(async (value) => {
    if (value.isDirectory === true) {
      await Deno.remove(DOCUMENTS, { recursive: true });
      await Deno.mkdir(DOCUMENTS);
    }
  }).catch(async (_) => {
    await Deno.mkdir(DOCUMENTS);
  }).finally(() => {
    const POST_PAGEFIND: Array<string> = [];
    getFileList(SOURCE).then(async (fileList) => {
      for (let i = 0; i < fileList.length; i++) {
        const filePath = fileList[i].replace(SOURCE, "");
        switch (filePath) {
          case "_/404/README.md":
            POST_PAGEFIND.push(filePath);
            break;
          case "_/offline/README.md":
            POST_PAGEFIND.push(filePath);
            break;
          default:
            if (filePath.startsWith("_/")) {
              await makeDirectoryForFile(
                DOCUMENTS + filePath.replace("_/", ""),
              );
              await Deno.copyFile(
                SOURCE + filePath,
                DOCUMENTS + filePath.replace("_/", ""),
              );
            } else {
              await makeDirectoryForFile(DOCUMENTS + filePath);
              if (filePath.endsWith("README.md")) {
                await Deno.readTextFile(SOURCE + filePath)
                  .then(async (value) => {
                    const HTML = getHTMLFromMarkdown(value);
                    const indexPath = (DOCUMENTS + filePath)
                      .split("/")
                      .slice(0, -1)
                      .join("/") + "/index.html";
                    await Deno.writeTextFile(indexPath, HTML);
                  });
              } else {
                await Deno.copyFile(
                  SOURCE + filePath,
                  DOCUMENTS + filePath,
                );
              }
            }
        }
      }
      await getRemoteFiles();
      await runPagefind();
      POST_PAGEFIND.forEach(async (value) => {
        let DOCUMENT_PATH = "";
        switch (value) {
          case "_/404/README.md":
            DOCUMENT_PATH = DOCUMENTS + "404.html";
            break;
          case "_/offline/README.md":
            DOCUMENT_PATH = DOCUMENTS + "offline/index.html";
            break;
        }
        await makeDirectoryForFile(DOCUMENT_PATH);
        makeDirectoryForFile(DOCUMENT_PATH);
        await Deno.readTextFile(SOURCE + value)
          .then(async (value) => {
            const HTML = getHTMLFromMarkdown(value);
            const indexPath = DOCUMENT_PATH;
            await Deno.writeTextFile(indexPath, HTML);
          });
      });
    }).catch((_) => {
      console.error("SOURCE: ERROR");
    });
  });
} else {
  console.error("DOCUMENTS: ERROR");
}
