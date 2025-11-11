# dataWave: a dynamic analytical synthesis visualizer

**Wave-inspired visual exploration of the Pacific regional dataset.**  

![Banner Image](</img/laird_hamilton_bigone.jpg> "Surfing Teahupo'o.")
<br>Surf your data the Laird Hamilton way... Teahupo'o. *(Source: surfer films/surfing magazine)*

> This repository contains the source code of the dataWave submission for the [Pacific Dataviz Challenge](https://pacificdatavizchallenge.org/).
> The source dataset was a messy Excel export. The challenge I set for myself wasn’t to craft a single data-narrative, but to *build a tool* that lets users “surf” a clean, pleasant visualization that delivers concentrated understanding of the data at a glance.

## Table of Contents

<details>
<summary>Contents - click to expand</summary>

- [dataWave: a dynamic analytical synthesis visualizer](#datawave-a-dynamic-analytical-synthesis-visualizer)
  - [Table of Contents](#table-of-contents)
  - [Demo](#demo)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Data processing](#data-processing)
    - [Data structure](#data-structure)
  - [Project structure](#project-structure)
  - [Installation \& Usage](#installation--usage)
    - [Install](#install)
    - [Serve the app](#serve-the-app)
  - [Functional overview](#functional-overview)
    - [Normalization process of the wave](#normalization-process-of-the-wave)
  - [Customization](#customization)
  - [Deployment guide](#deployment-guide)
    - [Summary](#summary)
  - [Contributing](#contributing)
  - [Acknowledgements](#acknowledgements)
  - [License](#license)

</details>

## Demo

A GitHub hosted version of the [dataWave](https://brooks-code.github.io/blue-pacific-dataviz/) is available live on gh-pages.

![Banner Image](</img/data_pearls.gif> "Surfing Teahupo'o.")
<br>Concept showcase.

## Features

- **Wave‑based representation** – each Pacific State appears as a set of “colored pearl” whose count reflects its share of the selected metric. States do share the same color palette as their subregional pars.
- **Dynamic year & class switching** – instantly updates the chart without reload.
- **Smooth CSS animations** – SCSS animated with possibility to pause/resume.
- **Responsive tooltip** – animated tooltip, stays within viewport edges.
- **Info panel** – animated character‑by‑character text, scroll‑locked while animations pause.
- **Accessibility** – most interactive elements are keyboard‑navigable; tooltips use `aria‑label`‑compatible text.

> [!NOTE]
> **And what's the data about?** It's derived from a dataset that contains political, development, security, resource, climate, ocean, and technology metrics across Pacific states.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Language** | JavaScript |
| **Styling** | SCSS compiled to CSS |
| **Animations** | CSS keyframes, `requestAnimationFrame` |
| **Data** | `data.json` (pre‑processed) |
| **Build** | esbuild |
| **Deployment** | Static hosting on GitHub pages |

## Data processing

Curious about how to transition from an Excel spreadsheet to fully consumable data? The data processing notebook is available in this [repository](https://github.com/brooks-code/dataWave-data-processing-notebook).

### Data structure

JSON data sample:

```json
[
    {
        "group_id": 1,
        "year": 2022,
        "class_name": "Political Leadership and Regionalism",
        "class_num": 1,
        "indicator_summary": "Total development aid",
        "subregion_code": "MEL",
        "subregion_name": "Melanesia",
        "state_code": "FJ",
        "state_name": "Fiji",
        "raw_values": 561024940.0,
        "scaled_values": 0.8506735359,
        "value_contribution_to_class": 0.0305291251,
        "state_rank_per_class": 6,
        "pct_missing_values": 0.0
    }
]
```

| Field                         | Type    | Example                               | Description                                                         |
|-------------------------------|---------|---------------------------------------|---------------------------------------------------------------------|
| **group_id**                      | Integer | 1                                     | ID for the indicator grouping                                       |
| **year**                          | Integer | 2022                                  | Year of the observation                                             |
| **class_name**                    | String  | Political Leadership and Regionalism  | Human-readable class label                                          |
| **class_num**                     | Integer | 1                                     | Numeric class identifier                                            |
| **indicator_summary**             | String  | Total development aid                 | Short indicator description                                         |
| **subregion_code**                | String  | MEL                                   | Subregion ISO-like code                                              |
| **subregion_name**                | String  | Melanesia                             | Subregion name                                                      |
| **state_code**                    | String  | FJ                                    | ISO-like state code                                                 |
| **state_name**                    | String  | Fiji                                  | State name                                                          |
| **raw_values**                    | Number  | 561024940.0                           | Raw numeric value for the indicator                                 |
| **scaled_values**                 | Number  | 0.8506735359                          | Value after scaling/normalization                                   |
| **value_contribution_to_class**   | Number  | 0.0305291251                          | Fractional contribution of this state to the class total            |
| **state_rank_per_class**          | Integer | 6                                     | Rank of the state within this class (1 = highest)                   |
| **pct_missing_values**            | Number  | 0.0                                   | Proportion of missing values for this indicator                   |

## Project structure

```markdown
├── .github/
│   └── workflows/
│       └── deploy.yml
├── package.json
├── build.js
└── src/
   ├── app.js
   ├── favicon.ico
   ├── img/
   │   └── dataWave-preview.jpg
   ├── index.html
   ├── styles.scss
   └── data.json
```

## Installation & Usage

Clone or download the repository:

```bash
git clone https://github.com/brooks-code/blue-pacific-dataviz.git
cd blue-pacific-dataviz
```

### Install

Make sure you have **Node.js** (v. 23+) already installed on your system.

```bash
npm -v
```

If not, [install](https://www.geeksforgeeks.org/node-js/installation-of-node-js-on-linux/) it and then:

```bash
npm install
```

### Serve the app

```bash
npm run serve   # open http://localhost:displayed_portnumber
```

If you only need to build the app, prefer this:

```bash
npm run build   # outputs to ./dist
```

## Functional overview

1) DATA PREPARATION

Load constants/lookups and convert raw data into normalized shares per year/class/state.

*Key functions:*

- `aggregateAndNormalize(raw)` groups, sums, normalizes to shares; returns `byYearClass`, years, classes.
- `distributeWaves(entries, totalWaves)`: fair-rounding to allocate discrete wave counts.

2) WAVE‑CHART RENDERER & CONTROLS

Build interactive wave visualization, controls and tooltip interactions.

*Key functions:*

- `populateControls()`: initialize UI handlers.
- `renderChart()`: create waves from data, sort entries and fill remainder
- `createWaveElement(bg, dataAttrs)`: DOM for one wave, `setAnimationState(paused)` and event handlers: `onWaveHover`, `onWaveOut`, `onWaveMove`.

3) TITLE MORPHING

Animated morphing headline that cycles through phrases with pause on hover and loop control.

*Key functions:*

- `initMorph()`: initialize and start loop.
- `tickMorph(nowMs)`: animation frame loop.
- `setMorph(frac)` and `doCooldown()`: apply visual blending/blur.

4) INFO‑PANEL

Animate an info panel with per-character text animation and interaction that pauses main animations.

*Key functions:*

- `getTextNodes(root)`: collect text nodes.
- `wrapAllCharacters(container, step)`: wrap characters in spans with staggered delays.
- `initInfoPanel()`: panel open/close handlers, interaction to pause/resume animations.

### Normalization process of the wave

The concept is to aggregate values per year, class, and state and:

- Compute shares – each state’s contribution is divided by the class total for that year.

- Fair‑rounding – distribute a fixed number of waves (`WAVE_COUNT = 100`) proportionally, **guaranteeing** at least one pearl for any non‑zero share.

The resulting `byYearClass` map is used by the renderer to assign wave counts and tooltip data.

## Customization

- **Color palette:** edit `STATE_COLORS` in src/index.js (hex values per state code).
- **Background wave color:** adjust `DFLT_BG` (RGBA string).
- **Morphing texts:** update `morphTexts` array in the “Title Morphing” section.
- **Animation speed:** tweak CSS animation-duration in *styles.scss* (e.g., `.wave_fade`).

## Deployment guide

1) Quick manual deploy with **gh-pages**:

Make sure homepage in `package.json` is set properly:

```json
"homepage": "https://brooks-code.github.io/blue-pacific-dataviz" # Replace with yours!
```

Install gh-pages:

```bash
npm install gh-pages --save-dev
```

Commit package.json changes:

```bash
git add package.json
git commit -m "Configure gh-pages deployment"
git push origin main
```

Deploy:

```bash
npm run deploy
```

This runs the build and pushes the contents of dist/ to the gh-pages branch. Wait a minute or two, then your site will be live at:

- https://brooks-code.github.io/blue-pacific-dataviz in this case.

---

2) Automated deploy with GitHub Actions

Verify there is a workflow file at `.github/workflows/deploy.yml` (example below). It builds the project on pushes to main and deploys the `dist/` folder to GitHub Pages.

<details>
<summary>`deploy.yml` example:</summary>

You might need to set some Workflow permissions in the repo's settings before proceeding.

```yaml
name: Deploy static content to Pages

on:
  push:
    branches: [ 'main' ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'npm'
          persist-credentials: false
          fetch-depth: 0
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

</details>

### Summary

- **Local usage:** `npm install` → `npm run serve` for preview.
- **Manual deploy:** `npm install gh-pages --save-dev` → `npm run deploy`.
- **CI deploy:** add `.github/workflows/deploy.yml` to automate builds and publish `dist/` to GitHub Pages.

## Contributing

1) Fork the repository.
2) Create a feature branch (git checkout -b feature/your‑feature).
3) Commit your changes (git commit -m "Add …").
4) Push and open a Pull Request.

Please ensure:

- SCSS changes are compiled before committing.
- All new features are documented in this README.

## Acknowledgements

The pacific dataviz team! Thanks, it's been a lot of fun working on that challenge. 🖤

## License

This project is released into the public domain under the [Unlicense](https://unlicense.org/). See the [LICENSE](/LICENSE) file for details. The original dataset remains the property of the original owner.

🃋
