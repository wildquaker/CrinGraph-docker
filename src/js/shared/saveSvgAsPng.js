/**
 * Save SVG as PNG (or SVG) library
 * Exports functions to serialize, convert to data URI, and download inline SVG elements as PNG or SVG files.
 */
(function () {
  "use strict";

  const root =
    typeof globalThis !== "undefined"
      ? globalThis
      : typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
          ? global
          : this;

  const out$ =
    (typeof exports !== "undefined" && exports) ||
    (typeof define !== "undefined" && {}) ||
    root;

  if (typeof define === "function" && define.amd) {
    define("save-svg-as-png", [], () => out$);
  }
  out$.default = out$;

  const xmlNs = "http://www.w3.org/2000/xmlns/";
  const xhtmlNs = "http://www.w3.org/1999/xhtml";
  const svgNs = "http://www.w3.org/2000/svg";
  const doctype =
    '<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [<!ENTITY nbsp "&#160;">]>';
  const urlRegex = /url\(["']?(.+?)["']?\)/;
  const fontFormats = {
    woff2: "font/woff2",
    woff: "font/woff",
    otf: "application/x-font-opentype",
    ttf: "application/x-font-ttf",
    eot: "application/vnd.ms-fontobject",
    sfnt: "application/font-sfnt",
    svg: "image/svg+xml",
  };

  /**
   * Check whether an object is a valid DOM HTMLElement or SVGElement.
   * @param {*} obj
   * @returns {boolean}
   */
  const isElement = (obj) =>
    obj &&
    (obj instanceof HTMLElement ||
      obj instanceof SVGElement ||
      obj.nodeType === 1);

  const requireDomNode = (el) => {
    if (!isElement(el)) {
      throw new Error(`An HTMLElement or SVGElement is required; got ${el}`);
    }
  };

  const requireDomNodePromise = (el) =>
    new Promise((resolve, reject) => {
      if (isElement(el)) {
        resolve(el);
      } else {
        reject(
          new Error(`An HTMLElement or SVGElement is required; got ${el}`),
        );
      }
    });

  const isExternal = (url) => {
    if (!url || typeof window === "undefined" || !window.location) return false;
    return url.startsWith("http") && !url.includes(window.location.host);
  };

  const getFontMimeTypeFromUrl = (fontUrl) => {
    const ext = Object.keys(fontFormats).find((extension) =>
      fontUrl.includes(`.${extension}`),
    );
    if (ext) return fontFormats[ext];
    console.warn(
      `Unknown font format for ${fontUrl}. Fonts may not be working correctly.`,
    );
    return "application/octet-stream";
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const getDimension = (el, clone, dim) => {
    const attrVal = clone.getAttribute(dim);
    const v =
      el.viewBox?.baseVal?.[dim] ||
      (attrVal !== null &&
        !attrVal.endsWith("%") &&
        parseFloat(attrVal)) ||
      el.getBoundingClientRect()?.[dim] ||
      parseFloat(clone.style[dim]) ||
      (typeof window !== "undefined"
        ? parseFloat(window.getComputedStyle(el).getPropertyValue(dim))
        : 0);

    return typeof v === "undefined" || v === null || Number.isNaN(parseFloat(v))
      ? 0
      : v;
  };

  const getDimensions = (el, clone, width, height) => {
    if (el.tagName === "svg") {
      return {
        width: width || getDimension(el, clone, "width"),
        height: height || getDimension(el, clone, "height"),
      };
    }
    if (el.getBBox) {
      const { x, y, width: bboxWidth, height: bboxHeight } = el.getBBox();
      return {
        width: x + bboxWidth,
        height: y + bboxHeight,
      };
    }
    return { width: 0, height: 0 };
  };

  const reEncode = (data) =>
    decodeURIComponent(
      encodeURIComponent(data).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        const c = String.fromCharCode(parseInt(p1, 16));
        return c === "%" ? "%25" : c;
      }),
    );

  const uriToBlob = (uri) => {
    const [header, base64Data] = uri.split(",");
    const byteString = window.atob(base64Data);
    const mimeString = header.split(":")[1]?.split(";")[0] || "image/png";
    const bytes = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeString });
  };

  const query = (el, selector) => {
    if (!selector) return null;
    try {
      return (
        el.querySelector(selector) ||
        (el.parentNode && el.parentNode.querySelector(selector))
      );
    } catch (err) {
      console.warn(`Invalid CSS selector "${selector}"`, err);
      return null;
    }
  };

  const detectCssFont = (rule, href) => {
    const match = rule.cssText.match(urlRegex);
    const url = (match && match[1]) || "";
    if (!url || url.startsWith("data:") || url === "about:blank") return null;

    let fullUrl = url;
    if (href) {
      if (url.startsWith("../")) {
        fullUrl = `${href}/../${url}`;
      } else if (url.startsWith("./")) {
        fullUrl = `${href}/.${url}`;
      }
    }

    return {
      text: rule.cssText,
      format: getFontMimeTypeFromUrl(fullUrl),
      url: fullUrl,
    };
  };

  const inlineImages = (el) =>
    Promise.all(
      Array.from(el.querySelectorAll("image")).map((image) => {
        const href =
          image.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
          image.getAttribute("href");

        if (!href || isExternal(href)) return Promise.resolve(null);

        return new Promise((resolve, reject) => {
          const canvas = document.createElement("canvas");
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = href;
          img.onerror = () => reject(new Error(`Could not load ${href}`));
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
            }
            image.setAttributeNS(
              "http://www.w3.org/1999/xlink",
              "href",
              canvas.toDataURL("image/png"),
            );
            resolve(true);
          };
        });
      }),
    );

  const cachedFonts = {};
  const inlineFonts = (fonts) =>
    Promise.all(
      fonts.map(
        (font) =>
          new Promise((resolve) => {
            if (cachedFonts[font.url]) return resolve(cachedFonts[font.url]);

            const req = new XMLHttpRequest();
            req.addEventListener("load", () => {
              const fontInBase64 = arrayBufferToBase64(req.response);
              const fontUri =
                font.text.replace(
                  urlRegex,
                  `url("data:${font.format};base64,${fontInBase64}")`,
                ) + "\n";
              cachedFonts[font.url] = fontUri;
              resolve(fontUri);
            });
            req.addEventListener("error", (e) => {
              console.warn(`Failed to load font from: ${font.url}`, e);
              cachedFonts[font.url] = null;
              resolve(null);
            });
            req.addEventListener("abort", (e) => {
              console.warn(`Aborted loading font from: ${font.url}`, e);
              resolve(null);
            });
            req.open("GET", font.url);
            req.responseType = "arraybuffer";
            req.send();
          }),
      ),
    ).then((fontCss) => fontCss.filter(Boolean).join(""));

  let cachedRules = null;
  const styleSheetRules = () => {
    if (cachedRules) return cachedRules;
    if (typeof document === "undefined" || !document.styleSheets) return [];
    return (cachedRules = Array.from(document.styleSheets).map((sheet) => {
      try {
        return { rules: sheet.cssRules, href: sheet.href };
      } catch (e) {
        console.warn(`Stylesheet could not be loaded: ${sheet.href}`, e);
        return {};
      }
    }));
  };

  const inlineCss = (el, options) => {
    const { selectorRemap, modifyStyle, modifyCss, fonts } = options || {};
    const generateCss =
      modifyCss ||
      ((selector, properties) => {
        const sel = selectorRemap ? selectorRemap(selector) : selector;
        const props = modifyStyle ? modifyStyle(properties) : properties;
        return `${sel}{${props}}\n`;
      });
    const css = [];
    const detectFonts = typeof fonts === "undefined";
    const fontList = fonts ? [...fonts] : [];

    styleSheetRules().forEach(({ rules, href }) => {
      if (!rules) return;
      Array.from(rules).forEach((rule) => {
        if (typeof rule.style !== "undefined") {
          if (query(el, rule.selectorText)) {
            css.push(generateCss(rule.selectorText, rule.style.cssText));
          } else if (detectFonts && rule.cssText.startsWith("@font-face")) {
            const font = detectCssFont(rule, href);
            if (font) fontList.push(font);
          } else {
            css.push(rule.cssText);
          }
        }
      });
    });

    return inlineFonts(fontList).then((fontCss) => css.join("\n") + fontCss);
  };

  const downloadOptions = () => {
    if (
      typeof navigator !== "undefined" &&
      !navigator.msSaveOrOpenBlob &&
      typeof document !== "undefined" &&
      !("download" in document.createElement("a"))
    ) {
      return { popup: window.open() };
    }
  };

  /**
   * Prepares and serializes an SVG element for rendering or downloading.
   * @param {SVGElement|HTMLElement} el
   * @param {object} [options={}]
   * @param {Function} [done]
   * @returns {Promise<{src: string, width: number, height: number}>}
   */
  out$.prepareSvg = (el, options = {}, done) => {
    requireDomNode(el);
    const {
      left = 0,
      top = 0,
      width: w,
      height: h,
      scale = 1,
      responsive = false,
      backgroundColor,
    } = options;

    return inlineImages(el).then(() => {
      let clone = el.cloneNode(true);
      clone.style.backgroundColor =
        backgroundColor || el.style.backgroundColor;
      const { width, height } = getDimensions(el, clone, w, h);

      if (el.tagName !== "svg") {
        if (el.getBBox) {
          const transformAttr = clone.getAttribute("transform");
          if (transformAttr !== null) {
            clone.setAttribute(
              "transform",
              transformAttr.replace(/translate\(.*?\)/, ""),
            );
          }
          const svg = document.createElementNS(svgNs, "svg");
          svg.appendChild(clone);
          clone = svg;
        } else {
          console.error("Attempted to render non-SVG element", el);
          return null;
        }
      }

      clone.setAttribute("version", "1.1");
      clone.setAttribute("viewBox", `${left} ${top} ${width} ${height}`);
      if (!clone.getAttribute("xmlns")) {
        clone.setAttributeNS(xmlNs, "xmlns", svgNs);
      }
      if (!clone.getAttribute("xmlns:xlink")) {
        clone.setAttributeNS(
          xmlNs,
          "xmlns:xlink",
          "http://www.w3.org/1999/xlink",
        );
      }

      if (responsive) {
        clone.removeAttribute("width");
        clone.removeAttribute("height");
        clone.setAttribute("preserveAspectRatio", "xMinYMin meet");
      } else {
        clone.setAttribute("width", String(width * scale));
        clone.setAttribute("height", String(height * scale));
      }

      Array.from(clone.querySelectorAll("foreignObject > *")).forEach(
        (foreignObject) => {
          foreignObject.setAttributeNS(
            xmlNs,
            "xmlns",
            foreignObject.tagName === "svg" ? svgNs : xhtmlNs,
          );
        },
      );

      return inlineCss(el, options).then((css) => {
        const style = document.createElement("style");
        style.setAttribute("type", "text/css");
        style.innerHTML = `<![CDATA[\n${css}\n]]>`;

        const defs = document.createElement("defs");
        defs.appendChild(style);
        clone.insertBefore(defs, clone.firstChild);

        const outer = document.createElement("div");
        outer.appendChild(clone);
        const src = outer.innerHTML.replace(
          /NS\d+:href/gi,
          'xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href',
        );

        const result = { src, width, height };
        if (typeof done === "function") {
          done(src, width, height);
        }
        return result;
      });
    });
  };

  /**
   * Converts SVG element to a Base64 data URI.
   * @param {SVGElement|HTMLElement} el
   * @param {object} [options={}]
   * @param {Function} [done]
   * @returns {Promise<string>}
   */
  out$.svgAsDataUri = (el, options = {}, done) => {
    requireDomNode(el);
    return out$.prepareSvg(el, options).then(({ src, width, height }) => {
      const svgXml = `data:image/svg+xml;base64,${window.btoa(reEncode(doctype + src))}`;
      if (typeof done === "function") {
        done(svgXml, width, height);
      }
      return svgXml;
    });
  };

  /**
   * Converts SVG element to a PNG Base64 data URI.
   * @param {SVGElement|HTMLElement} el
   * @param {object} [options={}]
   * @param {Function} [done]
   * @returns {Promise<string>}
   */
  out$.svgAsPngUri = (el, options = {}, done) => {
    requireDomNode(el);
    const {
      encoderType = "image/png",
      encoderOptions = 0.8,
      canvg,
    } = options;

    const convertToPng = ({ src, width, height }) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${canvas.width}px`;
      canvas.style.height = `${canvas.height}px`;

      if (canvg) {
        canvg(canvas, src);
      } else if (context) {
        context.drawImage(src, 0, 0);
      }

      let png;
      try {
        png = canvas.toDataURL(encoderType, encoderOptions);
      } catch (e) {
        if (
          (typeof SecurityError !== "undefined" && e instanceof SecurityError) ||
          e.name === "SecurityError"
        ) {
          console.error(
            "Rendered SVG images cannot be downloaded in this browser.",
          );
          return Promise.resolve(null);
        }
        throw e;
      }
      if (typeof done === "function") {
        done(png, canvas.width, canvas.height);
      }
      return Promise.resolve(png);
    };

    if (canvg) {
      return out$.prepareSvg(el, options).then(convertToPng);
    }

    return out$.svgAsDataUri(el, options).then((uri) => {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          resolve(
            convertToPng({
              src: image,
              width: image.width,
              height: image.height,
            }),
          );
        };
        image.onerror = () => {
          reject(
            new Error(
              `There was an error loading the data URI as an image on the following SVG\n${window.atob(uri.slice(26))}\nOpen the following link to see browser's diagnosis\n${uri}`,
            ),
          );
        };
        image.src = uri;
      });
    });
  };

  /**
   * Downloads data URI as a file.
   * @param {string} name - Output filename.
   * @param {string} uri - Data URI or URL.
   * @param {object} [options]
   */
  out$.download = (name, uri, options) => {
    if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
      navigator.msSaveOrOpenBlob(uriToBlob(uri), name);
    } else {
      const saveLink = document.createElement("a");
      if ("download" in saveLink) {
        saveLink.download = name;
        saveLink.style.display = "none";
        document.body.appendChild(saveLink);
        try {
          const blob = uriToBlob(uri);
          const url = URL.createObjectURL(blob);
          saveLink.href = url;
          saveLink.onclick = () => {
            requestAnimationFrame(() => URL.revokeObjectURL(url));
          };
        } catch (e) {
          console.error(e);
          console.warn(
            "Error while getting object URL. Falling back to string URL.",
          );
          saveLink.href = uri;
        }
        saveLink.click();
        document.body.removeChild(saveLink);
      } else if (options?.popup) {
        options.popup.document.title = name;
        options.popup.location.replace(uri);
      }
    }
  };

  /**
   * Saves an SVG element directly as an SVG file.
   * @param {SVGElement} el
   * @param {string} name
   * @param {object} [options={}]
   * @returns {Promise}
   */
  out$.saveSvg = (el, name, options = {}) => {
    const downloadOpts = downloadOptions();
    return requireDomNodePromise(el)
      .then((validEl) => out$.svgAsDataUri(validEl, options))
      .then((uri) => out$.download(name, uri, downloadOpts));
  };

  /**
   * Saves an SVG element directly as a PNG file.
   * @param {SVGElement} el
   * @param {string} name
   * @param {object} [options={}]
   * @returns {Promise}
   */
  out$.saveSvgAsPng = (el, name, options = {}) => {
    const downloadOpts = downloadOptions();
    return requireDomNodePromise(el)
      .then((validEl) => out$.svgAsPngUri(validEl, options))
      .then((uri) => out$.download(name, uri, downloadOpts));
  };

  if (typeof window !== "undefined") {
    window.saveSvg = out$.saveSvg;
    window.saveSvgAsPng = out$.saveSvgAsPng;
    window.prepareSvg = out$.prepareSvg;
    window.svgAsDataUri = out$.svgAsDataUri;
    window.svgAsPngUri = out$.svgAsPngUri;
    window.download = out$.download;
  }
  if (typeof root !== "undefined" && (typeof window === "undefined" || root !== window)) {
    root.saveSvg = out$.saveSvg;
    root.saveSvgAsPng = out$.saveSvgAsPng;
    root.prepareSvg = out$.prepareSvg;
    root.svgAsDataUri = out$.svgAsDataUri;
    root.svgAsPngUri = out$.svgAsPngUri;
    root.download = out$.download;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = out$;
  }
})();
