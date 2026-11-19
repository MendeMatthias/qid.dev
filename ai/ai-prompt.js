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

  const prefillFits = AIS.every((ai) => ai.paste || (ai.url + encodeURIComponent(PROMPT)).length <= MAX_URL);

  const CSS = `
.qidai-dialog { max-width: min(460px, calc(100vw - 32px)); width: 100%; margin: auto; padding: 22px; border-radius: 14px; box-sizing: border-box;
  border: 1px solid var(--border2, var(--border, #2a3947)); background: var(--panel, var(--bg, #10161d)); color: var(--text, #e6edf3);
  font: 14px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.qidai-dialog::backdrop { background: rgba(0, 0, 0, .55); }
.qidai-dialog h2 { margin: 0 0 6px; font-size: 18px; color: var(--text, #e6edf3); }
.qidai-dialog p { margin: 0 0 14px; color: var(--muted, #8b99a6); font-size: 13.5px; }
.qidai-list { display: grid; gap: 8px; }
.qidai-list button, .qidai-foot button { font: inherit; cursor: pointer; text-align: left; border-radius: 10px; padding: 10px 14px;
  border: 1px solid var(--border, #1e2a35); background: var(--bg2, transparent); color: var(--text, #e6edf3); }
.qidai-list button:hover, .qidai-foot button:hover { border-color: var(--accent, #5eeaa0); }
.qidai-list button span { display: block; color: var(--muted, #8b99a6); font-size: 12.5px; }
.qidai-foot { display: flex; gap: 8px; justify-content: space-between; margin-top: 14px; }
.qidai-status { min-height: 1.5em; margin-top: 12px; color: var(--accent, #5eeaa0); font-size: 13px; }
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
        prefill ? `Open in ${ai.name}` : `Copy and open ${ai.name}`,
        el("span", {}, prefill ? ai.note : "Copies the prompt, then you paste it"),
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
      el("h2", {}, "Open the prompt in your AI"),
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
