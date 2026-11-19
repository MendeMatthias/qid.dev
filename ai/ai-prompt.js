// The AI prompt for qID Connect, and the "Open in your AI" pop-up. One file, served from
// https://qid.dev/ai/ai-prompt.js, used by qid.dev/ai and by build.qid.dev, so both always show the
// same prompt. tools/check-ai-prompt.mjs fails when this prompt names a qID Connect version that is
// not the one in connect/qid-connect-latest.zip, so a new pack cannot ship with an old prompt.
//
// Use: <div data-qid-ai-prompt></div> and <script src="https://qid.dev/ai/ai-prompt.js" defer></script>.
// A container that already holds a <pre> and a <button> keeps them: the <pre> gets this prompt and the
// button opens the pop-up. An empty container gets both made for it.
// SPDX-License-Identifier: MIT
(function () {
  "use strict";

  // The one place the prompt lives. Keep it on one line: tools/check-ai-prompt.mjs reads it.
  const PROMPT = "Read https://qid.dev/llms.txt and follow its links. Then add qID Connect 1.7.2 to my app. qID Connect is the post-quantum wallet sign-in for BTX apps: the user proves a BTX address with their wallet, and the address is the account. Download https://qid.dev/connect/qid-connect-1.7.2.zip, follow docs/INTEGRATION.md and skills/qid-connect/SKILL.md from the pack for my stack, and verify the result with skills/qid-connect/scripts/check-integration.mjs against my running dev server. Remember: a sign-in proof can never move funds, and since 1.7.0 the QR poll returns status \"confirm\" before \"done\".";

  // Longer than this, an address can be cut by a browser, a server or a proxy. Then every button
  // copies the prompt and opens the AI empty, and says so.
  const MAX_URL = 2000;

  // What each one does with the address, as tested on 2026-11-19. Every button also copies the
  // prompt, so a sign-in page that drops the address costs one paste, not the prompt.
  const AIS = [
    // Fills in the prompt. Signed out, the sign-in page keeps /new but drops the prompt.
    { name: "Claude", url: "https://claude.ai/new?q=", note: "Fills in the prompt. If it asks you to sign in first, paste it after." },
    // Sends the prompt at once, without a second tap.
    { name: "ChatGPT", url: "https://chatgpt.com/?q=", note: "Opens and sends the prompt right away" },
    // Fills in the prompt and asks "Send this message?" first.
    { name: "Grok", url: "https://grok.com/?q=", note: "Fills in the prompt and asks before sending" },
    // Gemini has no address that fills in a prompt (?q= is ignored): copy, open, paste.
    { name: "Gemini", url: "https://gemini.google.com/app", paste: true, note: "Copies the prompt, then you paste it" },
  ];

  // The brand marks, one path each on a 24 by 24 grid, from @lobehub/icons-static-svg 1.104.0 (MIT).
  // Each mark belongs to its owner and is here only to name the service its button opens. They are
  // built with DOM calls, not innerHTML, so the pop-up also works under a strict content policy.
  const MARKS = {
    Claude: { d: "M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z", fills: ["#D97757"] },
    ChatGPT: { d: "M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z", fills: ["currentColor"], rule: "evenodd" },
    Grok: { d: "M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815", fills: ["currentColor"], rule: "evenodd" },
    Gemini: {
      d: "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z",
      fills: ["#3186FF", "url(#qidai-gem-0)", "url(#qidai-gem-1)", "url(#qidai-gem-2)"],
      grads: [
        { id: "qidai-gem-0", x1: 7, x2: 11, y1: 15.5, y2: 12, color: "#08B962", end: 1 },
        { id: "qidai-gem-1", x1: 8, x2: 11.5, y1: 5.5, y2: 11, color: "#F94543", end: 1 },
        { id: "qidai-gem-2", x1: 3.5, x2: 17.5, y1: 13.5, y2: 12, color: "#FABC12", end: 0.46 },
      ],
    },
  };

  const prefillFits = AIS.every((ai) => ai.paste || (ai.url + encodeURIComponent(PROMPT)).length <= MAX_URL);

  // The glow is the page's accent green. The plain rgba lines are for browsers without color-mix.
  const CSS = `
.qidai-dialog { max-width: min(480px, calc(100vw - 32px)); width: 100%; margin: auto; padding: 24px; border-radius: 16px; box-sizing: border-box;
  border: 1px solid rgba(94, 234, 160, .55); border-color: color-mix(in srgb, var(--accent, #5eeaa0) 60%, transparent);
  background: var(--panel, var(--bg, #10161d)); color: var(--text, #e6edf3);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
  box-shadow: 0 0 0 1px rgba(94, 234, 160, .18), 0 0 26px rgba(94, 234, 160, .30), 0 0 90px rgba(94, 234, 160, .16);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent, #5eeaa0) 18%, transparent), 0 0 26px color-mix(in srgb, var(--accent, #5eeaa0) 32%, transparent), 0 0 90px color-mix(in srgb, var(--accent, #5eeaa0) 16%, transparent);
  animation: qidai-in .22s ease-out, qidai-glow 3.4s ease-in-out .22s infinite alternate; }
@keyframes qidai-in { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes qidai-glow {
  from { box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent, #5eeaa0) 18%, transparent), 0 0 26px color-mix(in srgb, var(--accent, #5eeaa0) 32%, transparent), 0 0 90px color-mix(in srgb, var(--accent, #5eeaa0) 16%, transparent); }
  to { box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent, #5eeaa0) 30%, transparent), 0 0 40px color-mix(in srgb, var(--accent, #5eeaa0) 46%, transparent), 0 0 130px color-mix(in srgb, var(--accent, #5eeaa0) 24%, transparent); } }
.qidai-dialog::backdrop { background: rgba(0, 0, 0, .62); }
.qidai-dialog h2 { margin: 0 0 6px; font-size: 19px; color: var(--text, #e6edf3); }
.qidai-dialog h2 b { color: var(--accent, #5eeaa0); font-weight: inherit; }
.qidai-dialog p { margin: 0 0 16px; color: var(--muted, #8b99a6); font-size: 13.5px; }
.qidai-list { display: grid; gap: 10px; }
.qidai-list button, .qidai-foot button { font: inherit; cursor: pointer; text-align: left; border-radius: 12px; padding: 10px 14px;
  border: 1px solid var(--border, #1e2a35); background: var(--bg2, transparent); color: var(--text, #e6edf3);
  transition: border-color .15s, box-shadow .15s, transform .15s; }
.qidai-list button { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; gap: 14px; padding: 12px 14px; }
.qidai-mark { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 11px;
  border: 1px solid var(--border2, var(--border, #2a3947)); background: var(--bg, #0a0e12); }
.qidai-mark svg { width: 24px; height: 24px; display: block; }
.qidai-name { font-weight: 600; font-size: 15px; }
.qidai-name span { display: block; font-weight: 400; color: var(--muted, #8b99a6); font-size: 12.5px; }
.qidai-go { color: var(--accent, #5eeaa0); font-size: 18px; line-height: 1; opacity: .55; transition: opacity .15s, transform .15s; }
.qidai-list button:hover, .qidai-list button:focus-visible { border-color: var(--accent, #5eeaa0); transform: translateY(-1px);
  box-shadow: 0 0 0 1px rgba(94, 234, 160, .25), 0 0 22px rgba(94, 234, 160, .28);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent, #5eeaa0) 25%, transparent), 0 0 22px color-mix(in srgb, var(--accent, #5eeaa0) 30%, transparent); }
.qidai-list button:hover .qidai-go, .qidai-list button:focus-visible .qidai-go { opacity: 1; transform: translate(2px, -2px); }
.qidai-list button:hover .qidai-mark, .qidai-list button:focus-visible .qidai-mark { border-color: var(--accent, #5eeaa0); }
.qidai-foot button:hover, .qidai-foot button:focus-visible { border-color: var(--accent, #5eeaa0); }
.qidai-dialog button:focus-visible { outline: 2px solid var(--accent, #5eeaa0); outline-offset: 2px; }
.qidai-foot { display: flex; gap: 8px; justify-content: space-between; margin-top: 14px; }
.qidai-status { min-height: 1.5em; margin-top: 12px; color: var(--accent, #5eeaa0); font-size: 13px; }
@media (prefers-reduced-motion: reduce) { .qidai-dialog { animation: none; } .qidai-list button, .qidai-go { transition: none; } .qidai-list button:hover { transform: none; } }
`;

  // The clipboard API first. Where it refuses (no focus, no permission, an old browser), the older
  // copy command, which works from a click in more places.
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => copyByCommand(text));
    return copyByCommand(text);
  }

  function copyByCommand(text) {
    return new Promise((resolve, reject) => {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      (dialog && dialog.open ? dialog : document.body).append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props || {});
    node.append(...children);
    return node;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, ...children) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    node.append(...children);
    return node;
  }

  function mark(name) {
    const m = MARKS[name];
    const grads = (m.grads || []).map((g) =>
      svg(
        "linearGradient",
        { id: g.id, gradientUnits: "userSpaceOnUse", x1: g.x1, x2: g.x2, y1: g.y1, y2: g.y2 },
        svg("stop", { "stop-color": g.color }),
        svg("stop", { offset: g.end, "stop-color": g.color, "stop-opacity": 0 }),
      ),
    );
    const paths = m.fills.map((fill) => svg("path", { d: m.d, fill, ...(m.rule ? { "fill-rule": m.rule } : {}) }));
    const image = svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" }, ...paths, ...(grads.length ? [svg("defs", {}, ...grads)] : []));
    return el("span", { className: "qidai-mark" }, image);
  }

  let dialog = null;
  let status = null;

  function say(text) {
    status.textContent = text;
  }

  function open(ai) {
    // The window opens first, inside the click, so no pop-up blocker stops it. The copy starts in
    // the same click and finishes after.
    const prefill = !ai.paste && prefillFits;
    const copying = copy(PROMPT).then(() => true, () => false);
    // No "noopener" here: with it, window.open always returns null and a blocked tab cannot be told
    // apart. The new tab's opener is cut by hand instead.
    const tab = window.open(prefill ? ai.url + encodeURIComponent(PROMPT) : ai.url, "_blank");
    if (tab) tab.opener = null;
    copying.then((copied) => {
      if (!tab) return say(copied ? `Your browser blocked the new tab. The prompt is on your clipboard: open ${ai.name} yourself and paste it.` : `Your browser blocked the new tab. Allow pop-ups for this page, or use "Copy prompt".`);
      if (prefill) return say(copied ? `${ai.name} opened in a new tab. The prompt is on your clipboard too, in case it asks you to sign in first.` : `${ai.name} opened in a new tab with the prompt in its address.`);
      say(copied ? `Copied. Paste it into ${ai.name} (Cmd+V or Ctrl+V).` : `${ai.name} opened, but the copy failed. Use "Copy prompt" and paste it there.`);
    });
  }

  function build() {
    document.head.append(el("style", { textContent: CSS }));
    status = el("div", { className: "qidai-status", role: "status" });
    const list = el("div", { className: "qidai-list" });
    for (const ai of AIS) {
      const prefill = !ai.paste && prefillFits;
      const button = el(
        "button",
        { type: "button" },
        mark(ai.name),
        el(
          "span",
          { className: "qidai-name" },
          prefill ? `Open in ${ai.name}` : `Copy and open ${ai.name}`,
          el("span", {}, prefill ? ai.note : "Copies the prompt, then you paste it"),
        ),
        el("span", { className: "qidai-go", ariaHidden: "true" }, "\u2197"),
      );
      button.addEventListener("click", () => open(ai));
      list.append(button);
    }
    const copyOnly = el("button", { type: "button" }, "Copy prompt");
    copyOnly.addEventListener("click", () => copy(PROMPT).then(() => say("Copied."), () => say("The copy failed. Select the prompt on the page and copy it.")));
    const close = el("button", { type: "button" }, "Close");
    close.addEventListener("click", () => dialog.close());
    dialog = el(
      "dialog",
      { className: "qidai-dialog" },
      el("h2", {}, "Open the prompt in ", el("b", {}, "your AI")),
      el("p", {}, prefillFits ? "Pick one. Gemini cannot take a prompt in its address, so for Gemini we copy it and you paste." : "The prompt is too long for an address, so every button copies it and opens the AI. Then you paste."),
      list,
      status,
      el("div", { className: "qidai-foot" }, copyOnly, close),
    );
    dialog.setAttribute("aria-label", "Open the prompt in your AI");
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    document.body.append(dialog);
  }

  function show() {
    if (!dialog) build();
    say("");
    dialog.showModal();
  }

  function mount(box) {
    let pre = box.querySelector("pre");
    let button = box.querySelector("button");
    if (!pre) box.append((pre = el("pre", { className: "qidai-prompt" })));
    if (!button) box.prepend((button = el("button", { type: "button", className: "copybtn" }, "Copy")));
    pre.textContent = PROMPT;
    button.textContent = "Copy";
    button.setAttribute("aria-haspopup", "dialog");
    button.addEventListener("click", show);
  }

  function start() {
    document.querySelectorAll("[data-qid-ai-prompt]").forEach(mount);
  }

  window.qidAiPrompt = { PROMPT, open: show };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
