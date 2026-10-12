const toolType = "711";
const toolPath = "hp_gras.html";

const init_phones = ["HD650 S2 (2020) (fresh pads)", "IEF Neutral Target"],
  DIR = "../../data/hp_gras/",
  data_format = "other",
  default_channels = ["L", "R"],
  default_normalization = "dB",
  default_norm_db = 60,
  default_norm_hz = 1000,
  max_channel_imbalance = 5,
  num_samples = 3,
  scale_smoothing = 0.2,
  alt_layout = true,
  alt_sticky_graph = true,
  alt_animated = false,
  alt_header = true,
  alt_header_new_tab = false,
  alt_tutorial = true,
  alt_augment = true,
  site_url = "hp_gras.html",
  share_url = true,
  watermark_text = "CrinGraph",
  watermark_image_url = "../../cringraph-logo.svg",
  page_title = "CrinGraph | GRAS Headphone Graph Tool",
  page_description =
    "View and compare frequency response graphs for headphones.",
  restricted = false,
  accessories = true,
  externalLinksBar = true,
  expandable = true,
  expandableOnly = 767,
  headerHeight = "0px",
  darkModeButton = true,
  targetDashed = true,
  targetColorCustom = false,
  targetRestoreLastUsed = false,
  labelsPosition = "bottom-right",
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
    type: "Neutral",
    files: [
      "KEMAR-DF (KB50XX)",
      "IEF Neutral",
      "Diffuse Field",
      "Free Field",
      "Harman In-room Flat",
    ],
  },
  {
    type: "Preference",
    files: [
      "Harman AE OE 2018",
      "Harman without Bass Shelf",
      "Harman AE OE 2015",
      "Harman AE OE 2013",
    ],
  },
];
const customTargetDispNames = {};

const preference_bounds_name = "Preference Bounds RAW",
  preference_bounds_dir = "../../data/hp_gras/pref_bounds/",
  preference_bounds_startup = false,
  allowSquigDownload = false,
  PHONE_BOOK = "../../data/hp_gras/phone_book.json",
  default_y_scale = "40db",
  default_DF_name = "IEF Neutral",
  dfBaseline = true,
  default_bass_shelf = 5.5,
  default_tilt = 0,
  default_ear = 0,
  default_treble = 0,
  tiltableTargets = [
    "KEMAR-DF (KB50XX)",
    "Diffuse Field (IEC 60318-7)",
    "IEF Neutral",
    "Harman In-room Flat",
    "Free Field",
  ],
  compTargets = [
    "Harman AE OE 2018",
    "Harman without Bass Shelf",
    "Harman AE OE 2015",
    "Harman AE OE 2013",
  ],
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

function setRestricted() {
  if (restricted) {
    max_compare = 2;
    restrict_target = false;
    disallow_target = true;
    allow_targets = ["IEF Neutral Target", "Harman AE OE 2018 Target"];
    premium_html =
      "<h2>You gonna pay for that?</h2><p>To use target curves other than IEF Neutral or the latest Harman Target, or more than two graphs, <a target='_blank' href='https://crinacle.com/wp-login.php?action=register'>subscribe</a> or upgrade to Patreon <a target='_blank' href='https://www.patreon.com/join/crinacle/checkout?rid=3775534'>Silver tier</a> and switch to <a target='_blank' href='https://crinacle.com/graphs/headphones/graphtool/premium/'>the premium tool</a>.</p>";
  }
}

setRestricted();

const simpleAbout = `
        <p class="center">This graph database is maintained by In-Ear Fidelity with frequency responses generated via an "IEC60318-4"-compliant ear simulator. This web software is based on the <a href="https://github.com/mlochbaum/CrinGraph">CrinGraph</a> open-source software project by Marshall Lochbaum.</p>
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
      graphAnalyticsSrc = "../graphAnalytics.js";

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
