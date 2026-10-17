import fs from "fs"
import path from "path"

const targetFile = path.resolve("node_modules/@quartz-community/obsidian-flavored-markdown/dist/index.js")

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, "utf-8")

  const startMarker = "var mermaid_inline_default ="
  const endMarker = "var mermaid_inline_default2 ="

  const startIdx = content.indexOf(startMarker)
  const endIdx = content.indexOf(endMarker, startIdx)

  if (startIdx !== -1 && endIdx !== -1) {
    const inlineScript = `
(function() {
  function cleanup(el, fn) {
    if (window.addCleanup) window.addCleanup(fn);
  }

  function empty(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  class PanZoom {
    constructor(container, content) {
      this.container = container;
      this.content = content;
      this.isDragging = false;
      this.startPan = { x: 0, y: 0 };
      this.currentPan = { x: 0, y: 0 };
      this.scale = 1;
      this.MIN_SCALE = 0.5;
      this.MAX_SCALE = 3;
      this.cleanups = [];
      this.setupEventListeners();
      this.setupControls();
      this.resetTransform();
    }

    setupEventListeners() {
      const onMouseDown = e => {
        if (e.button === 0) {
          this.isDragging = true;
          this.startPan = { x: e.clientX - this.currentPan.x, y: e.clientY - this.currentPan.y };
          this.container.style.cursor = "grabbing";
        }
      };
      const onMouseMove = e => {
        if (this.isDragging) {
          e.preventDefault();
          this.currentPan = { x: e.clientX - this.startPan.x, y: e.clientY - this.startPan.y };
          this.updateTransform();
        }
      };
      const onMouseUp = () => {
        this.isDragging = false;
        this.container.style.cursor = "grab";
      };
      const onTouchStart = e => {
        if (e.touches.length === 1) {
          this.isDragging = true;
          const t = e.touches[0];
          this.startPan = { x: t.clientX - this.currentPan.x, y: t.clientY - this.currentPan.y };
        }
      };
      const onTouchMove = e => {
        if (this.isDragging && e.touches.length === 1) {
          e.preventDefault();
          const t = e.touches[0];
          this.currentPan = { x: t.clientX - this.startPan.x, y: t.clientY - this.startPan.y };
          this.updateTransform();
        }
      };
      const onTouchEnd = () => {
        this.isDragging = false;
      };
      const onResize = () => this.resetTransform();

      this.container.addEventListener("mousedown", onMouseDown);
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      this.container.addEventListener("touchstart", onTouchStart, { passive: false });
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
      window.addEventListener("resize", onResize);

      this.cleanups.push(
        () => this.container.removeEventListener("mousedown", onMouseDown),
        () => document.removeEventListener("mousemove", onMouseMove),
        () => document.removeEventListener("mouseup", onMouseUp),
        () => this.container.removeEventListener("touchstart", onTouchStart),
        () => document.removeEventListener("touchmove", onTouchMove),
        () => document.removeEventListener("touchend", onTouchEnd),
        () => window.removeEventListener("resize", onResize)
      );
    }

    cleanup() {
      for (const fn of this.cleanups) fn();
    }

    setupControls() {
      const controls = document.createElement("div");
      controls.className = "mermaid-controls";
      const makeBtn = (text, fn) => {
        const b = document.createElement("button");
        b.textContent = text;
        b.className = "mermaid-control-button";
        b.addEventListener("click", fn);
        return b;
      };
      controls.appendChild(makeBtn("-", () => this.zoom(-0.1)));
      controls.appendChild(makeBtn("Reset", () => this.resetTransform()));
      controls.appendChild(makeBtn("+", () => this.zoom(0.1)));
      this.container.appendChild(controls);
    }

    zoom(delta) {
      const target = Math.min(Math.max(this.scale + delta, this.MIN_SCALE), this.MAX_SCALE);
      const rect = this.content.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const diff = target - this.scale;
      this.currentPan.x -= cx * diff;
      this.currentPan.y -= cy * diff;
      this.scale = target;
      this.updateTransform();
    }

    updateTransform() {
      this.content.style.transform = "translate(" + this.currentPan.x + "px, " + this.currentPan.y + "px) scale(" + this.scale + ")";
    }

    resetTransform() {
      const svg = this.content.querySelector("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const w = rect.width / this.scale;
      const h = rect.height / this.scale;
      this.scale = 1;
      this.currentPan = {
        x: (this.container.clientWidth - w) / 2,
        y: (this.container.clientHeight - h) / 2
      };
      this.updateTransform();
    }
  }

  function setupModal(modal, closeFn) {
    if (!modal) return;
    const onClick = e => {
      if (e.target === modal) {
        e.preventDefault();
        e.stopPropagation();
        closeFn();
      }
    };
    const onKey = e => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeFn();
      }
    };
    modal.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    cleanup(modal, () => {
      modal.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    });
  }

  let mermaidLib = null;
  let isRendering = false;

  async function renderAllMermaid() {
    const center = document.querySelector(".center");
    const nodes = center ? center.querySelectorAll("code.mermaid") : document.querySelectorAll("code.mermaid");
    if (!nodes || nodes.length === 0) return;

    if (isRendering) return;
    isRendering = true;

    try {
      if (!mermaidLib) {
        const m = await import("https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.0/mermaid.esm.min.mjs");
        mermaidLib = m.default || m;
      }

      // Preserve raw mermaid code before any SVGs are inserted
      for (let n of nodes) {
        if (!n.__mermaidRaw) {
          const clip = n.getAttribute("data-clipboard");
          if (clip) {
            try { n.__mermaidRaw = JSON.parse(clip); } catch(e) { n.__mermaidRaw = n.innerText; }
          } else {
            n.__mermaidRaw = n.innerText;
          }
        }
      }

      // Resolve CSS custom properties to clean, computed rgb colors for Mermaid
      const colorVars = ["--secondary","--tertiary","--gray","--light","--lightgray","--highlight","--dark","--darkgray","--codeFont"];
      const resolved = {};
      for (const v of colorVars) {
        let val = window.getComputedStyle(document.documentElement).getPropertyValue(v).trim();
        if (v !== "--codeFont" && val) {
          const dummy = document.createElement("div");
          dummy.style.color = val;
          document.body.appendChild(dummy);
          val = window.getComputedStyle(dummy).color || val;
          dummy.remove();
        }
        resolved[v] = val;
      }

      const isDark = document.documentElement.getAttribute("saved-theme") === "dark";
      try {
        mermaidLib.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          deterministicIds: true,
          theme: isDark ? "dark" : "base",
          themeVariables: {
            fontFamily: resolved["--codeFont"],
            primaryColor: resolved["--light"],
            primaryTextColor: resolved["--darkgray"],
            primaryBorderColor: resolved["--tertiary"],
            lineColor: resolved["--darkgray"],
            secondaryColor: resolved["--secondary"],
            tertiaryColor: resolved["--tertiary"],
            clusterBkg: resolved["--light"],
            edgeLabelBackground: resolved["--highlight"]
          }
        });
      } catch (err) {
        mermaidLib.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          deterministicIds: true,
          theme: isDark ? "dark" : "base"
        });
      }

      let idCounter = 1;
      for (let i = 0; i < nodes.length; i++) {
        const codeEl = nodes[i];
        const raw = codeEl.__mermaidRaw;
        if (!raw) continue;

        try {
          const diaId = "mermaid-dia-" + Date.now() + "-" + (idCounter++);
          const { svg, bindFunctions } = await mermaidLib.render(diaId, raw);
          codeEl.innerHTML = svg;
          if (bindFunctions) bindFunctions(codeEl);
          codeEl.setAttribute("data-processed", "true");
        } catch (err) {
          console.error("[Mermaid] Render error on diagram " + (i + 1) + ":", err);
        }

        // Setup expand / modal buttons
        const parent = codeEl.parentElement;
        if (!parent) continue;

        const clipBtn = parent.querySelector(".clipboard-button");
        const expandBtn = parent.querySelector(".expand-button");
        let offset = 0;
        if (clipBtn) {
          const cs = window.getComputedStyle(clipBtn);
          offset = clipBtn.offsetWidth + parseFloat(cs.marginLeft || "0") + parseFloat(cs.marginRight || "0");
        }
        if (expandBtn) {
          expandBtn.style.right = "calc(" + offset + "px + 0.3rem)";
          parent.prepend(expandBtn);
        }

        const modal = parent.querySelector("#mermaid-container");
        if (!modal || !expandBtn) continue;

        let panZoomInstance = null;
        const openModal = () => {
          const space = modal.querySelector("#mermaid-space");
          const content = modal.querySelector(".mermaid-content");
          if (!content) return;
          empty(content);
          const svgEl = codeEl.querySelector("svg");
          if (!svgEl) return;
          content.appendChild(svgEl.cloneNode(true));
          modal.classList.add("active");
          space.style.cursor = "grab";
          panZoomInstance = new PanZoom(space, content);
        };
        const closeModal = () => {
          modal.classList.remove("active");
          if (panZoomInstance) {
            panZoomInstance.cleanup();
            panZoomInstance = null;
          }
        };

        expandBtn.addEventListener("click", openModal);
        setupModal(modal, closeModal);
        cleanup(expandBtn, () => {
          if (panZoomInstance) panZoomInstance.cleanup();
          expandBtn.removeEventListener("click", openModal);
        });
      }
    } finally {
      isRendering = false;
    }
  }

  document.addEventListener("nav", renderAllMermaid);
  document.addEventListener("render", renderAllMermaid);
  document.addEventListener("themechange", renderAllMermaid);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAllMermaid);
  } else {
    renderAllMermaid();
  }
})();
`.trim()

    const replacement = `var mermaid_inline_default = ${JSON.stringify(inlineScript)};\n\n`
    content = content.slice(0, startIdx) + replacement + content.slice(endIdx)
    fs.writeFileSync(targetFile, content, "utf-8")
    console.log("✓ Successfully patched obsidian-flavored-markdown for robust Mermaid rendering.")
  } else {
    console.error("✗ Could not locate start/end markers in dist/index.js")
    process.exit(1)
  }
} else {
  console.log("⚠ obsidian-flavored-markdown not found, skipping patch.")
}
