window.history.replaceState(
  {},
  window.document.title,
  window.location.pathname,
);

window.document.querySelector("body>div.topAnchor>button").onclick = (_) => {
  navigator.share({
    title: window.document.title,
    url: window.location.href,
  });
};

document.querySelectorAll("pre>code.language-mermaid")
  .forEach((element) => {
    if (element.tagName === "CODE") {
      element = element.parentElement;
      element.outerHTML = `<div class="mermaid">${element.textContent}</div>`;
    }
  });

if (document.querySelectorAll('script[src="/mermaid/index.js"]').length === 1) {
  mermaid.initialize({
    "logLevel": "error",
    "securityLevel": "loose",
    "theme": "dark",
    "themeVariables": {
      "fontFamily": "monospace",
      "primaryTextColor": "#ffffff",
      "secondaryTextColor": "#ffffff",
      "tertiaryTextColor": "#ffffff",
      "noteTextColor": "#ffffff",
      "textColor": "#ffffff",
    },
  });
}

let PAGEFIND_INIT = false;
let PAGEFIND_UUID = "";
let pagefind = null;
document.querySelector("body>div.topAnchor>div.search>input").disabled = false;
document.querySelector("body>div.topAnchor>div.search>input").onkeyup = async (_) => {
  function error() {
    document.querySelector("body>div.topAnchor>div.search>div").innerHTML =
      "<br>Something went wrong. Please try again.";
  }
  document.querySelector("body>div.topAnchor>div.search>div").innerHTML = "";
  PAGEFIND_UUID = crypto.randomUUID();
  const PAGEFIND_THIS_UUID = PAGEFIND_UUID;
  const TEXT =
    document.querySelector("body>div.topAnchor>div.search>input").value;
  if (TEXT.toString() === "") {
    return null;
  }
  document.querySelector("body>div.topAnchor>div.search>div").innerHTML =
    `<br>Searching for ${TEXT}...<br>`;
  if (PAGEFIND_INIT === false) {
    await import("/pagefind/pagefind.js").then((value) => {
      pagefind = value;
      PAGEFIND_INIT = true;
    }).catch((_) => {
      error();
    });
  }
  if (PAGEFIND_INIT !== true) {
    return null;
  }
  const search = await pagefind.search(TEXT);
  if (search["results"].length === 0 && PAGEFIND_THIS_UUID === PAGEFIND_UUID) {
    document.querySelector("body>div.topAnchor>div.search>div").innerHTML =
      `<br><div>Sorry, no results found. Try searching again with different keywords.</div>`;
  } else {
    if (PAGEFIND_THIS_UUID === PAGEFIND_UUID) {
      document.querySelector("body>div.topAnchor>div.search>div").innerHTML =
        `<br>${
          search["results"].length.toLocaleString()
        } results for ${TEXT}<br>`;
    }
  }
  for (let i = 0; i < search["results"].length; i++) {
    if (PAGEFIND_THIS_UUID === PAGEFIND_UUID) {
      const data = await search["results"][i].data();
      if (PAGEFIND_THIS_UUID === PAGEFIND_UUID) {
        document.querySelector("body>div.topAnchor>div.search>div")
          .insertAdjacentHTML(
            "beforeend",
            `<br><div>${
              `<a href="${
                data["raw_url"].endsWith("/index.html")
                  ? data["raw_url"].slice(0, -10)
                  : data["raw_url"]
              }">` + data["meta"]["title"] + `</a><br>${data["excerpt"]}`
            }</div>`,
          );
      } else {
        break;
      }
    } else {
      break;
    }
  }
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}
