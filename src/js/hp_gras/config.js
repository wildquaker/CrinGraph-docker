const toolType = "711";
const toolPath = "hp_gras.html";

const init_phones = [ "HD650 S2 (2020) (fresh pads)","IEF Neutral Target" ], // Optional. Which graphs to display on initial load. Note: Share URLs will override this set
      DIR = "../../data/hp_gras/",                            // Directory where graph files are stored
      data_format = "other",                       // Accepts "AudioTools," "REW," or "other"
      default_channels = ["L","R"],                     // Which channels to display. Avoid javascript errors if loading just one channel per phone
      default_normalization = "dB",                     // Sets default graph normalization mode. Accepts "dB" or "Hz"
      default_norm_db = 60,                             // Sets default dB normalization point
      default_norm_hz = 1000,                           // Sets default Hz normalization point
      max_channel_imbalance = 5,                        // ???
      num_samples = 3,                                  // Samples per channel
      scale_smoothing = 0.2,                            // Smoothing default value
      alt_layout = true,                                // Toggle between classic and alt layouts
      alt_sticky_graph = true,                      // If active graphs overflows the viewport, does the graph scroll with the page or stick
      alt_animated = false,                         // Determines if new graphs are drawn with a 1-second animation, or appear instantly
      alt_header = true, 
      alt_header_new_tab = false,                    // Clicking alt_header links opens in new tab
      alt_tutorial = true,                         // Display a configurable frequency response guide below the graph
      alt_augment = true,                          // Display augment card in phone list, e.g. review sore, shop link
      site_url = 'hp_gras.html',                          // Display a configurable header at the top of the alt layout
      share_url = true,                                 // If true, enables shareable URLs
      watermark_text = "CrinGraph",           // Optional. Watermark appears behind graphs
      watermark_image_url = "../../cringraph-logo.svg",              // Optional. If image file is in same directory as config, can be just the filename
      page_title = "CrinGraph | 711 IEM Graph Tool",                    // Optional. Appended to the page title if share URLs are enabled
      page_description = "View and compare frequency response graphs for headphones.",
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
    { type:"Neutral"   , files:["KEMAR-DF (KB50XX)","IEF Neutral","Diffuse Field","Free Field","Harman In-room Flat"] },
    { type:"Preference", files:['Harman AE OE 2018','Harman without Bass Shelf','Harman AE OE 2015','Harman AE OE 2013'] }
];
const customTargetDispNames = { };

const  preference_bounds_name = "Preference Bounds RAW",  // Preference bounds name
       preference_bounds_dir = "../../data/hp_gras/pref_bounds/",  // Preference bounds directory
       preference_bounds_startup = false,              // If true, preference bounds are displayed on startup
       allowSquigDownload = false,                     // If true, allows download of measurement data
       PHONE_BOOK = "../../data/hp_gras/phone_book.json",                 // Path to phone book JSON file
       default_y_scale = "40db",                       // Default Y scale; values: ["20db", "30db", "40db", "50db", "crin"]
       default_DF_name = "IEF Neutral",                   // Default RAW DF name
       dfBaseline = true,                              // If true, DF is used as baseline when custom df tilt is on
       default_bass_shelf = 5.5,                         // Default Custom DF bass shelf value
       default_tilt = 0,                            // Default Custom DF tilt value
       default_ear = 0,                                // Default Custom DF ear gain value
       default_treble = 0,                             // Default Custom DF treble gain value
       tiltableTargets = ["KEMAR-DF (KB50XX)","Diffuse Field (IEC 60318-7)","IEF Neutral","Harman In-room Flat","Free Field"],                 // Targets that are allowed to be tilted
       compTargets = ["Harman AE OE 2018","Harman without Bass Shelf","Harman AE OE 2015","Harman AE OE 2013"],                     // Targets that are allowed to be used for compensation
       allowCreatorSupport = false;                     // Allow the creator to have a button top right to support them

function watermark(svg) {
    let wm = svg.append("g").attr("transform", "translate("+(pad.l+W/2)+","+(pad.t+H/2-20)+")")
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
        applyStylesheet("../../css/hp_gras/style.css");
    } else {
        applyStylesheet("../../css/hp_gras/style-alt.css");
        applyStylesheet("../../css/hp_gras/style-alt-theme.css");
    }
}
setLayout();

function setRestricted() {
    if (restricted) {
        max_compare = 2;
        restrict_target = false;
        disallow_target = true;
        allow_targets = [ "IEF Neutral Target","Harman AE OE 2018 Target" ];
        premium_html = "<h2>You gonna pay for that?</h2><p>To use target curves other than IEF Neutral or the latest Harman Target, or more than two graphs, <a target='_blank' href='https://crinacle.com/wp-login.php?action=register'>subscribe</a> or upgrade to Patreon <a target='_blank' href='https://www.patreon.com/join/crinacle/checkout?rid=3775534'>Silver tier</a> and switch to <a target='_blank' href='https://crinacle.com/graphs/headphones/graphtool/premium/'>the premium tool</a>.</p>";
    }
}

setRestricted();

const 
    simpleAbout = `
        <p class="center">This graph database is maintained by In-Ear Fidelity with frequency responses generated via an "IEC60318-4"-compliant ear simulator. This web software is based on the <a href="https://github.com/mlochbaum/CrinGraph">CrinGraph</a> open-source software project by Marshall Lochbaum.</p>
    `,
    paragraphs = `
        <h2>Viverra tellus in hac</h2>
        <p>Lorem ipsum dolor sit amet, <a href="">consectetur adipiscing elit</a>, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Quisque non tellus orci ac. Dictumst quisque sagittis purus sit amet volutpat consequat. Vitae nunc sed velit dignissim sodales ut. Faucibus ornare suspendisse sed nisi lacus sed viverra tellus in. Dignissim enim sit amet venenatis urna cursus eget nunc. Mi proin sed libero enim. Ut sem viverra aliquet eget sit amet. Integer enim neque volutpat ac tincidunt vitae. Tincidunt nunc pulvinar sapien et ligula ullamcorper malesuada. Mauris rhoncus aenean vel elit scelerisque mauris pellentesque. Lacus luctus accumsan tortor posuere ac ut consequat semper. Non pulvinar neque laoreet suspendisse interdum consectetur libero id faucibus. Aliquam sem et tortor consequat id. Cursus sit amet dictum sit amet justo donec. Donec adipiscing tristique risus nec feugiat in fermentum posuere.</p>
        <p>Diam donec adipiscing tristique risus nec. Amet nisl purus in mollis. Et malesuada fames ac turpis egestas maecenas pharetra. Ante metus dictum at tempor commodo ullamcorper a. Dui id ornare arcu odio ut sem nulla. Ut pharetra sit amet aliquam id diam maecenas. Scelerisque in dictum non consectetur a erat nam at. In ante metus dictum at tempor. Eget nulla facilisi etiam dignissim diam quis enim lobortis scelerisque. Euismod nisi porta lorem mollis aliquam ut porttitor leo a. Malesuada proin libero nunc consequat interdum. Turpis egestas sed tempus urna et pharetra pharetra massa massa. Quis blandit turpis cursus in hac habitasse. Amet commodo nulla facilisi nullam vehicula ipsum a.</p>
        <p>Mauris ultrices eros in cursus turpis massa tincidunt. Aliquam ut porttitor leo a diam sollicitudin. Curabitur vitae nunc sed velit. Cursus metus aliquam eleifend mi in nulla posuere sollicitudin. Lectus nulla at volutpat diam ut. Nibh nisl condimentum id venenatis a condimentum vitae sapien. Tincidunt id aliquet risus feugiat in ante metus. Elementum nibh tellus molestie nunc non blandit massa enim. Ac tortor vitae purus faucibus ornare suspendisse. Pellentesque sit amet porttitor eget. Commodo quis imperdiet massa tincidunt. Nunc sed id semper risus in hendrerit gravida. Proin nibh nisl condimentum id venenatis a condimentum. Tortor at risus viverra adipiscing at in. Pharetra massa massa ultricies mi quis hendrerit dolor. Tempor id eu nisl nunc mi ipsum faucibus vitae.</p>
        <h2>Tellus orci</h2>
        <p>Viverra mauris in aliquam sem. Viverra tellus in hac habitasse platea. Facilisi nullam vehicula ipsum a arcu cursus. Nunc sed augue lacus viverra vitae congue eu. Pretium fusce id velit ut tortor pretium viverra suspendisse. Eu scelerisque felis imperdiet proin. Tincidunt arcu non sodales neque sodales ut etiam sit amet. Tellus at urna condimentum mattis pellentesque. Congue nisi vitae suscipit tellus. Ut morbi tincidunt augue interdum.</p>
        <p>Scelerisque in dictum non consectetur a. Elit pellentesque habitant morbi tristique senectus et. Nulla aliquet enim tortor at auctor urna nunc id. In ornare quam viverra orci. Auctor eu augue ut lectus arcu bibendum at varius vel. In cursus turpis massa tincidunt dui ut ornare lectus. Accumsan in nisl nisi scelerisque eu ultrices vitae auctor eu. A diam sollicitudin tempor id. Tellus mauris a diam maecenas sed enim ut sem. Pellentesque id nibh tortor id aliquet lectus proin. Fermentum et sollicitudin ac orci phasellus. Dolor morbi non arcu risus quis. Bibendum enim facilisis gravida neque. Tellus in metus vulputate eu scelerisque felis. Integer malesuada nunc vel risus commodo. Lacus laoreet non curabitur gravida arcu.</p>
    `,
    widgets = `
        <div class="accessories-widgets">
            <div class="widget">
                <img width="200" src="cringraph-logo.svg"/>
            </div>
            <div class="widget">
                <img width="200" src="cringraph-logo.svg"/>
            </div>
            <div class="widget">
                <img width="200" src="cringraph-logo.svg"/>
            </div>
        </div>
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
              graphAnalyticsSrc = "../graphAnalytics.js";

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
            url: "../../iem_5128.html"
        },
        {
            name: "711 IEMs Graph Tool",
            url: "../../iem_711.html"
        },
        {
            name: "GRAS Headphones Graph Tool",
            url: "../../hp_gras.html"
        }
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
