/**
 * Graph Analytics Module for CrinGraph
 * Integrates Google Tag Manager (GTM) and dispatches tracking events to dataLayer.
 */
"use strict";

var analyticsSite = "Generic Graph site";
var analyticsGtmId = "GTM-0000000";
var logAnalytics = true;

/**
 * Injects Google Tag Manager script into document head.
 */
function setupGraphAnalytics() {
  if (typeof document === "undefined") return;

  const gtmScript = document.createElement("script");
  gtmScript.textContent =
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
    `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';` +
    `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
    `f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analyticsGtmId}');`;

  const head = document.head || document.querySelector("head");
  if (head) {
    head.prepend(gtmScript);
  }
}

setupGraphAnalytics();

if (typeof window !== "undefined") {
  window.dataLayer = window.dataLayer || [];
}

/**
 * Push headphone/earphone interaction event to dataLayer.
 * @param {string} eventName - Name of analytics event.
 * @param {object} p - Phone/IEM model data object.
 * @param {string} [trigger="user"] - Trigger source.
 */
function pushPhoneTag(eventName, p = {}, trigger = "user") {
  const eventTrigger = trigger || "user";
  const phoneBrand = p?.dispBrand || "Target";
  const phoneModel = p?.phone;
  const phoneVariant = p?.dispName;
  const value = 1;

  const payload = {
    event: eventName,
    trigger: eventTrigger,
    site: analyticsSite,
    phoneBrand: phoneBrand,
    phoneModel: phoneModel,
    phoneVariant: phoneVariant,
    phoneName: `${phoneBrand} ${phoneModel}`,
    value: value,
  };

  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push(payload);
  }

  if (logAnalytics) {
    console.log(
      `Event:      ${eventName}\n` +
      `Trigger:    ${eventTrigger}\n` +
      `Site:       ${analyticsSite}\n` +
      `Phone:      ${phoneBrand} ${phoneModel}\n` +
      `Variant:    ${phoneVariant}`,
    );
  }
}

/**
 * Push generic UI interaction event with active graph URL context to dataLayer.
 * @param {string} eventName - Name of analytics event.
 * @param {Window|object} [targetWindow] - Target window containing the graph URL.
 * @param {string} [other="null"] - Additional event detail or label.
 * @param {string} [trigger="user"] - Trigger source.
 */
function pushEventTag(eventName, targetWindow, other = "null", trigger = "user") {
  const eventTrigger = trigger || "user";
  const win = targetWindow || (typeof window !== "undefined" ? window : null);
  const url = win?.location?.href || "";
  const par = "?share=";
  const value = 1;

  const activePhones = url.includes(par)
    ? decodeURI(url.replace(/_/g, " ").split(par).pop().replace(/,/g, ", "))
    : "null";
  const otherData = other || "null";

  const payload = {
    event: eventName,
    trigger: eventTrigger,
    site: analyticsSite,
    activePhones: activePhones,
    other: otherData,
    value: value,
  };

  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push(payload);
  }

  if (logAnalytics) {
    console.log(
      `Event:      ${eventName}\n` +
      `Trigger:    ${eventTrigger}\n` +
      `Site name:  ${analyticsSite}\n` +
      `Active:     ${activePhones}\n` +
      `Other:      ${otherData}`,
    );
  }
}

if (logAnalytics) {
  console.log("... Analytics initialized ... ");
}

if (typeof window !== "undefined") {
  window.pushPhoneTag = pushPhoneTag;
  window.pushEventTag = pushEventTag;
  window.setupGraphAnalytics = setupGraphAnalytics;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    setupGraphAnalytics,
    pushPhoneTag,
    pushEventTag,
    analyticsSite,
    analyticsGtmId,
    logAnalytics,
  };
}
