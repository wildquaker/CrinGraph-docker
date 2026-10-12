const toolType = "4620";
const toolPath = "iem_5128.html";

const init_phones = ["Reference V2.0", "PopAvg-DF (JM-1) Target"],
  DIR = "../../data/iem_5128/",
  default_channels = ["L", "R"],
  default_normalization = "dB",
  default_norm_db = 60,
  default_norm_hz = 800,
  max_channel_imbalance = 5,
  scale_smoothing = 0.2,
  alt_layout = true,
  alt_sticky_graph = true,
  alt_animated = true,
  alt_header = true,
  alt_header_new_tab = false,
  alt_tutorial = true,
  alt_augment = false,
  site_url = "iem_5128.html",
  share_url = true,
  watermark_text = "CrinGraph",
  watermark_image_url = "../../cringraph-logo.svg",
  page_title = "CrinGraph | 5128 IEM Graph Tool",
  page_description = "View and compare frequency response graphs for IEMs.",
  restricted = false,
  accessories = true,
  externalLinksBar = true,
  expandable = true,
  expandableOnly = false,
  headerHeight = "0px",
  darkModeButton = true,
  dbScalerToggler = true,
  targetDashed = true,
  targetColorCustom = false,
  targetRestoreLastUsed = false,
  labelsPosition = "default",
  stickyLabels = true,
  analyticsEnabled = false,
  exportableGraphs = true,
  extraEnabled = true,
  extraUploadEnabled = true,
  extraEQEnabled = true,
  extraEQBands = 10,
  extraEQBandsMax = 20,
  extraToneGeneratorEnabled = true;

const targets = [
  {
    type: "Diffuse Field",
    files: ["PopAvg-DF (JM-1)", "5128-DF", "Headphones.com IEM DF", "JM-1 x Headphones.com IEM DF"],
  },
  {
    type: "Preference",
    files: [
      "Harman IE 2019 (B&K 5128)",
      "SoundGuys",
      "LMG 0.6",
      "Quakey In-Ear",
      "IEF Preference 2025 (B&K 5128)",
    ],
  },
];
const customTargetDispNames = {};

const preference_bounds_name = "Preference Bounds RAW",
  preference_bounds_dir = "../../data/iem_5128/pref_bounds/",
  preference_bounds_startup = false,
  allowSquigDownload = false,
  PHONE_BOOK = "../../data/iem_5128/phone_book.json",
  default_y_scale = "40db",
  default_DF_name = "JM-1",
  dfBaseline = true,
  default_bass_shelf = 6.3,
  default_tilt = -0.7,
  default_ear = 1.4,
  default_treble = -3.2,
  tiltableTargets = [
    "PopAvg-DF (JM-1)",
    "5128-DF",
    "Headphones.com IEM DF",
    "IEF Preference 2025 (B&K 5128)",
    "JM-1 x Headphones.com IEM DF"
  ],
  compTargets = ["Harman IE 2019 (B&K 5128)", "SoundGuys", "LMG 0.6"],
  allowCreatorSupport = false;

function watermark(svg) {
  let wm = svg
    .append("g")
    .attr(
      "transform",
      "translate(" + (pad.l + W / 2) + "," + (pad.t + H / 2 - 20) + ")",
    );
}

function tsvParse(fr) {
  return fr
    .split(/[\r\n]/)
    .map((l) => l.trim())
    .filter((l) => l && l[0] !== "*")
    .map((l) =>
      l
        .split(/[\s,;]+/)
        .map((e) => parseFloat(e))
        .slice(0, 2),
    )
    .filter((t) => !isNaN(t[0]) && !isNaN(t[1]));
}

function setLayout() {
  function applyStylesheet(styleSheet) {
    var docHead = document.querySelector("head"),
      linkTag = document.createElement("link");

    linkTag.setAttribute("rel", "stylesheet");
    linkTag.setAttribute("type", "text/css");

    linkTag.setAttribute("href", styleSheet);
    docHead.append(linkTag);
  }

  if (!alt_layout) {
    applyStylesheet("../../css/shared/style.css");
  } else {
    applyStylesheet("../../css/shared/style-alt.css");
    applyStylesheet("../../css/shared/style-alt-theme.css");
  }
}

setLayout();

const simpleAbout = `
        <p class="center">This graph database is maintained by In-Ear Fidelity with frequency responses generated using an ITU-T P.57 Type 4.3-compliant ear simulator. This web software is based on the <a href="https://github.com/mlochbaum/CrinGraph">CrinGraph</a> open-source software project by Marshall Lochbaum.</p>
    `,
  whichAccessoriesToUse = simpleAbout;

const linkSets = [
  {
    label: "CrinGraph Contributors:",
    links: [
      {
        name: "Super* Review",
        url: "https://squig.link/",
      },
      {
        name: "HypetheSonics",
        url: "https://www.hypethesonics.com/iemdbc/",
      },
      {
        name: "Hangout.Audio IEM Graph Comparison Tools",
        url: "https://graph.hangout.audio/iem/",
      },
    ],
  },
];

function setupGraphAnalytics() {
  if (analyticsEnabled) {
    const pageHead = document.querySelector("head"),
      graphAnalytics = document.createElement("script"),
      graphAnalyticsSrc = "graphAnalytics.js";

    graphAnalytics.setAttribute("src", graphAnalyticsSrc);
    pageHead.append(graphAnalytics);
  }
}

setupGraphAnalytics();

let headerLogoText = "",
  headerLogoImgUrl = "../../cringraph-logo.svg",
  headerLinks = [
    {
      name: "5128 IEMs Graph Tool",
      url: "../../iem_5128.html",
    },
    {
      name: "711 IEMs Graph Tool",
      url: "../../iem_711.html",
    },
    {
      name: "GRAS Headphones Graph Tool",
      url: "../../hp_gras.html",
    },
    {
      name: "5128 Headphones Graph Tool",
      url: "../../hp_5128.html",
    },
    {
      name: "Decryptor Tool",
      url: "../../decryptor.html",
    },
  ];

let tutorialDefinitions = [
  {
    name: "Sub bass",
    width: "20.1%",
    description: "Rumble, growl, etc.",
  },
  {
    name: "Mid bass",
    width: "19.2%",
    description: "Punch, impact, beats, etc.",
  },
  {
    name: "Lower midrange",
    width: "17.4%",
    description:
      "Affects note weight and richness. Too much results in muddiness, while too little makes instruments sound anemic and thin.",
  },
  {
    name: "Upper midrange",
    width: "20%",
    description:
      "Mainly affects harmonics. Too much results in a shouty and overly-forward presentation, too little makes things dull and lifeless.",
  },
  {
    name: "Presence",
    width: "6%",
    description:
      'The presence region has a lot to do with the naturalness of vocal transients. Too much emphasis here and vocals may take on an "edgy" or metallic character.',
  },
  {
    name: "Treble",
    width: "7.3%",
    description:
      "Sparkle, sharpness, sibilance, etc. More treble makes thing sound bright, less treble makes things sound dark.",
  },
  {
    name: "Air",
    width: "10%",
    description:
      "Mainly affects upper harmonics and can also be the cause of sibilance depending on magnitude.",
  },
];
