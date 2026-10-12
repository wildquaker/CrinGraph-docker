const toolType = "711";
const toolPath = "iem_711.html";

const init_phones = [ "Meta V3","IEF Neutral 2023 Target" ], // Optional. Which graphs to display on initial load. Note: Share URLs will override this set
      DIR = "../../data/iem_711/",                                    // Directory where graph files are stored
      data_format = "AudioTools",                       // Accepts "AudioTools," "REW," or "other"
      default_channels = ["L","R"],                     // Which channels to display. Avoid javascript errors if loading just one channel per phone
      default_normalization = "dB",                     // Sets default graph normalization mode. Accepts "dB" or "Hz"
      default_norm_db = 60,                             // Sets default dB normalization point
      default_norm_hz = 1000,                           // Sets default Hz normalization point
      max_channel_imbalance = 5,                        // ???
      alt_layout = true,                                // Toggle between classic and alt layouts
      alt_sticky_graph = true,                      // If active graphs overflows the viewport, does the graph scroll with the page or stick to the viewport?
      alt_animated = true,                         // Determines if new graphs are drawn with a 1-second animation, or appear instantly
      alt_header = true, 
      alt_header_new_tab = false,                    // Clicking alt_header links opens in new tab
      alt_tutorial = true,                         // Display a configurable frequency response guide below the graph
      alt_augment = false,                          // Display augment card in phone list, e.g. review sore, shop link
      site_url = 'iem_711.html',                          // Display a configurable header at the top of the alt layout
      share_url = true,                                 // If true, enables shareable URLs
      watermark_text = "CrinGraph",           // Optional. Watermark appears behind graphs
      watermark_image_url = "../../cringraph-logo.svg",     // Optional. If image file is in same directory as config, can be just the filename
      page_title = "CrinGraph | 711 IEM Graph Tool",                    // Optional. Appended to the page title if share URLs are enabled
      page_description = "View and compare frequency response graphs for IEMs.",
      restricted = false,                               // Enables restricted mode. More restricted options below.
      accessories = true,                               // If true, displays specified HTML at the bottom of the page. Configure further below
      externalLinksBar = true,                          // If true, displays row of pill-shaped links at the bottom of the page. Configure further below
      expandable = true,                               // Enables button to expand iframe over the top of the parent page
      expandableOnly = 767,                           // Prevents iframe interactions unless the user has expanded it. Accepts "true" or "false" OR a pixel value, if pixel value, that is used as the maximum width at which expandableOnly is used
      headerHeight = '0px',                             // Optional. If expandable=true, determines how much space to leave for the parent page header
      darkModeButton = true,                        // Adds a "Dark Mode" button the main toolbar to let users set preference
      targetDashed = true,                         // If true, makes target curves dashed lines
      targetColorCustom = false,                    // If false, targets appear as a random gray value. Can replace with a fixed color value to make all targets the specified color, e.g. "black"
      targetRestoreLastUsed = false,				// Restore user's last-used target settings on load
      labelsPosition = "bottom-right",                   // Up to four labels will be grouped in a specified corner. Accepts "top-left," bottom-left," "bottom-right," and "default"
      stickyLabels = true,                         // "Sticky" labels 
      analyticsEnabled = false,                     // Enables Google Analytics 4 measurement of site usage
      exportableGraphs = true,                      // Enables export graph button     
      extraEnabled = true,                          // Enable extra features
      extraUploadEnabled = true,                    // Enable upload function
      extraEQEnabled = true,                        // Enable parametic eq function
      extraEQBands = 10,                            // Default EQ bands available
      extraEQBandsMax = 20,                         // Max EQ bands available
      extraToneGeneratorEnabled = true;             // Enable tone generator function

const targets = [
    { type:"Neutral"   , files:["IEF Neutral 2023","JM-1","IEF Neutral 2020","Diffuse Field","Etymotic","Free Field","Innerfidelity ID"] },
    { type:"Preference", files:["Harman IE 2019 v2","Harman IE 2019","Harman IE 2017","Harman IE 2016","Rtings"] }
];

const customTargetDispNames = {};

const  preference_bounds_name = "Preference Bounds RAW",  // Preference bounds name
       preference_bounds_dir = "../../data/iem_711/pref_bounds/",  // Preference bounds directory
       preference_bounds_startup = false,              // If true, preference bounds are displayed on startup
       allowSquigDownload = false,                     // If true, allows download of measurement data
       PHONE_BOOK = "../../data/iem_711/phone_book.json",                 // Path to phone book JSON file
       default_y_scale = "40db",                       // Default Y scale; values: ["20db", "30db", "40db", "50db", "crin"]
       default_DF_name = "IEF Neutral 2023",                   // Default RAW DF name
       dfBaseline = false,                              // If true, DF is used as baseline when custom df tilt is on
       default_bass_shelf = 5.5,                         // Default Custom DF bass shelf value
       default_tilt = 0,                            // Default Custom DF tilt value
       default_ear = 0,                                // Default Custom DF ear gain value
       default_treble = 0,                             // Default Custom DF treble gain value
       tiltableTargets = ["IEF Neutral 2023","JM-1","IEF Neutral 2020","Diffuse Field","Etymotic","Free Field","Innerfidelity ID"],                 // Targets that are allowed to be tilted
       compTargets = ["Harman IE 2019 v2","Harman IE 2019","Harman IE 2017","Harman IE 2016","Rtings"],                     // Targets that are allowed to be used for compensation
       allowCreatorSupport = false;                     // Allow the creator to have a button top right to support them

function watermark(svg) {
    let wm = svg.append("g").attr("transform", "translate("+(pad.l+W/2)+","+(pad.t+H/2-20)+")");
    
}
    
function tsvParse(fr) {
    return fr.split(/[\r\n]/)
        .map(l => l.trim()).filter(l => l && l[0] !== '*')
        .map(l => l.split(/[\s,;]+/).map(e => parseFloat(e)).slice(0, 2))
        .filter(t => !isNaN(t[0]) && !isNaN(t[1]));
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

const 
    simpleAbout = `
        <p class="center">This graph database is maintained by Crinacle with frequency responses generated via an IEC 60318-4 compliant ear simulator. This web software is based on the <a href="https://github.com/mlochbaum/CrinGraph">CrinGraph</a> open-source software project by Marshall Lochbaum.</p>
    `,
    whichAccessoriesToUse = simpleAbout;

const linkSets = [{
    label: "CrinGraph Contributors:",
    links: [
        {
            name: "Super* Review",
            url: "https://squig.link/"
        },
        {
            name: "HypetheSonics",
            url: "https://www.hypethesonics.com/iemdbc/"
        },
        {
            name: "Hangout.Audio IEM Graph Comparison Tools",
            url: "https://graph.hangout.audio/iem/"
        }
    ]
}];

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

let headerLogoText = '',
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
        name: 'Sub bass',
        width: '20.1%',
        description: 'Rumble, growl, etc.'
    },
    {
        name: 'Mid bass',
        width: '19.2%',
        description: 'Punch, impact, beats, etc.'
    },
    {
        name: 'Lower midrange',
        width: '17.4%',
        description: 'Affects note weight and richness. Too much results in muddiness, while too little makes instruments sound anemic and thin.'
    },
    {
        name: 'Upper midrange',
        width: "20%",
        description: 'Mainly affects harmonics. Too much results in a shouty and overly-forward presentation, too little makes things dull and lifeless.'
    },
    {
        name: 'Presence',
        width: "6%",
        description: 'The presence region has a lot to do with the naturalness of vocal transients. Too much emphasis here and vocals may take on an "edgy" or metallic character.'
    },
    {
        name: 'Treble',
        width: '7.3%',
        description: 'Sparkle, sharpness, sibilance, etc. More treble makes thing sound bright, less treble makes things sound dark.'
    },
    {
        name: 'Air',
        width: '10%',
        description: 'Mainly affects upper harmonics and can also be the cause of sibilance depending on magnitude.'
    }
];
