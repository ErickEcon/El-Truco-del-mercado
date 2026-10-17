import fs from "fs"
import path from "path"

const targetFile = path.resolve("node_modules/@quartz-community/obsidian-flavored-markdown/dist/index.js")

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, "utf-8")
  let modified = false

  // Fix 1: Guard against missing .clipboard-button so window.getComputedStyle(null) doesn't crash
  const brokenClipboard = 'let a=e[r],i=a.parentElement,d=i.querySelector(".clipboard-button"),u=i.querySelector(".expand-button"),v=window.getComputedStyle(d),w=d.offsetWidth+parseFloat(v.marginLeft||"0")+parseFloat(v.marginRight||"0");u.style.right=`calc(${w}px + 0.3rem)`,i.prepend(u);'
  const fixedClipboard = 'let a=e[r],i=a.parentElement,d=i.querySelector(".clipboard-button"),u=i.querySelector(".expand-button"),w=0;if(d){let v=window.getComputedStyle(d);w=d.offsetWidth+parseFloat(v.marginLeft||"0")+parseFloat(v.marginRight||"0");}if(u){u.style.right=`calc(${w}px + 0.3rem)`;i.prepend(u);}'

  if (content.includes(brokenClipboard)) {
    content = content.replace(brokenClipboard, fixedClipboard)
    modified = true
  }

  // Fix 2: Execute M() on script execution so initial page load renders Mermaid without waiting for an SPA navigation
  const brokenEvent = 'document.addEventListener("nav",M);document.addEventListener("render",M);\\n'
  const fixedEvent = 'document.addEventListener("nav",M);document.addEventListener("render",M);M();\\n'

  if (content.includes(brokenEvent)) {
    content = content.replace(brokenEvent, fixedEvent)
    modified = true
  }

  // Fix 3: Enable deterministicIds so multiple diagrams on the same page don't collide on Date.now() timestamp IDs
  const brokenInit = 't.initialize({startOnLoad:!1,securityLevel:"loose",theme:'
  const fixedInit = 't.initialize({startOnLoad:!1,securityLevel:"loose",deterministicIds:!0,theme:'

  if (content.includes(brokenInit)) {
    content = content.replace(brokenInit, fixedInit)
    modified = true
  }

  if (modified) {
    fs.writeFileSync(targetFile, content, "utf-8")
    console.log("✓ Successfully patched obsidian-flavored-markdown for Mermaid diagram rendering.")
  } else {
    console.log("ℹ obsidian-flavored-markdown already patched or targets not found.")
  }
} else {
  console.log("⚠ obsidian-flavored-markdown not found, skipping patch.")
}
