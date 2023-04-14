const DIR = "data_hp/",
      data_format = "REW",
      default_normalization = "dB",
      default_norm_db = 60,
      default_norm_hz = 500,
      alt_layout = false,
      alt_sticky_graph = true,
      alt_animated = false,
      alt_header = false,
      alt_tutorial = false,
      site_url = 'graph_hp.html',
      share_url = true,
      watermark_text = "CrinGraph",
      watermark_image_url = "cringraph-logo.svg",
      page_title = "CrinGraph",
      page_description = "View and compare frequency response graphs for earphones",
      accessories = false,
      externalLinksBar = true,
      restricted = false,
      expandable = false,
      expandableOnly = false,
      headerHeight = '0px',
      darkModeButton = true,
      targetDashed = false,
      targetColorCustom = false,
      labelsPosition = "default",
      stickyLabels = false,
      analyticsEnabled = false;

const tsvParse = fr => d3.tsvParseRows(fr).slice(3,530).map(r=>r.map(d=>+d));

function watermark(svg) {
    let wm = svg.append("g")
        .attr("transform", "translate("+(pad.l+W/2)+","+(pad.t+H/2-20)+")")
        .attr("opacity",0.2);
    wm.append("text")
        .attrs({x:0, y:40, "font-size":40, "text-anchor":"middle"})
        .text("sample graphs");
}

const max_channel_imbalance = 5;
const default_channels = ["L","R"];
const num_samples = 5;

const scale_smoothing = 0.2;

const targets = [
    { type:"Neutral"   , files:["IEF Neutral"] },
    { type:"Preference", files:['IEF "Harman"',"Quakey"] }
];

const linkSets = [
    {
        label: "IEM graph databases",
        links: [
            {
                name: "Audio Discourse",
                url: "https://iems.audiodiscourse.com/"
            },
            {
                name: "Bad Guy",
                url: "https://hbb.squig.link/"
            },
            {
                name: "Banbeucmas",
                url: "https://banbeu.com/graph/tool/"
            },
            {
                name: "HypetheSonics",
                url: "https://www.hypethesonics.com/iemdbc/"
            },
            {
                name: "In-Ear Fidelity",
                url: "https://crinacle.com/graphs/iems/graphtool/"
            },
            {
                name: "Precogvision",
                url: "https://precog.squig.link/"
            },
            {
                name: "Rikudou Goku",
                url: "https://rg.squig.link/"
            },
            {
                name: "Super* Review",
                url: "https://squig.link/"
            },
        ]
    },
    {
        label: "Headphones",
        links: [
            {
                name: "Audio Discourse",
                url: "https://headphones.audiodiscourse.com/"
            },
            {
                name: "In-Ear Fidelity",
                url: "https://crinacle.com/graphs/headphones/graphtool/"
            },
            {
                name: "Super* Review",
                url: "https://squig.link/hp.html"
            }
        ]
    }
];