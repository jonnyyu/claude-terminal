/**
 * Discord preview block renderers: embed, component, message.
 */

const { escapeHtml } = require('../../../utils');

// ── Discord Embed Preview ──

/**
 * Build a warning banner listing Discord limit violations.
 */
function renderLimitWarnings(warnings) {
  if (!warnings || !warnings.length) return '';
  const items = warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('');
  return `<div class="dc-embed-warnings"><div class="dc-embed-warnings-title">Exceeds Discord limits</div><ul>${items}</ul></div>`;
}

function renderDiscordEmbedBlock(raw) {
  const DiscordRenderer = require('../../../ui/discord/DiscordRenderer');
  const EmbedRenderer = require('../../../ui/discord/EmbedRenderer');
  const result = DiscordRenderer.autoRender(raw);
  if (!result) {
    return `<pre class="code-block"><code>${escapeHtml(raw)}</code></pre>`;
  }

  const codeEscaped = escapeHtml(raw);
  const uid = 'dc-preview-' + Math.random().toString(36).slice(2, 8);

  // Limit validation + discord.js export only make sense for a single embed.
  let warningsHtml = '';
  let djsButton = '';
  let djsRaw = '';
  if (result.type === 'embed' && result.data) {
    warningsHtml = renderLimitWarnings(EmbedRenderer.validateEmbed(result.data));
    const djs = EmbedRenderer.embedToBuilderCode(result.data);
    if (djs) {
      djsButton = `<button class="dc-chat-toggle-btn" data-action="dc-copy-code">Copy as discord.js</button>`;
      djsRaw = `<div class="dc-chat-raw-djs" style="display:none">${escapeHtml(djs)}</div>`;
    }
  }

  return `<div class="dc-chat-preview" data-dc-uid="${uid}">`
    + `<div class="dc-chat-preview-toolbar">`
    + `<span class="dc-chat-preview-label">Discord Embed</span>`
    + `<button class="dc-chat-toggle-btn active" data-action="dc-show-preview">Preview</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-show-code">Code</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-copy-json">Copy JSON</button>`
    + djsButton
    + `</div>`
    + `<div class="dc-chat-preview-body">${warningsHtml}${result.html}</div>`
    + `<div class="dc-chat-code-body"><pre class="code-block"><code>${codeEscaped}</code></pre></div>`
    + `<div class="dc-chat-raw" style="display:none">${codeEscaped}</div>`
    + djsRaw
    + `</div>`;
}

// ── Discord Component Preview ──

function renderDiscordComponentBlock(raw) {
  const DiscordRenderer = require('../../../ui/discord/DiscordRenderer');
  const html = DiscordRenderer.renderComponents(raw);
  if (!html) {
    return `<pre class="code-block"><code>${escapeHtml(raw)}</code></pre>`;
  }

  const codeEscaped = escapeHtml(raw);
  const uid = 'dc-preview-' + Math.random().toString(36).slice(2, 8);

  return `<div class="dc-chat-preview" data-dc-uid="${uid}">`
    + `<div class="dc-chat-preview-toolbar">`
    + `<span class="dc-chat-preview-label">Discord Components</span>`
    + `<button class="dc-chat-toggle-btn active" data-action="dc-show-preview">Preview</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-show-code">Code</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-copy-json">Copy JSON</button>`
    + `</div>`
    + `<div class="dc-chat-preview-body">${html}</div>`
    + `<div class="dc-chat-code-body"><pre class="code-block"><code>${codeEscaped}</code></pre></div>`
    + `<div class="dc-chat-raw" style="display:none">${codeEscaped}</div>`
    + `</div>`;
}

// ── Discord Message Preview ──

function renderDiscordMessageBlock(raw) {
  const DiscordRenderer = require('../../../ui/discord/DiscordRenderer');
  const html = DiscordRenderer.renderMessage(raw);
  if (!html) {
    return `<pre class="code-block"><code>${escapeHtml(raw)}</code></pre>`;
  }

  const codeEscaped = escapeHtml(raw);
  const uid = 'dc-preview-' + Math.random().toString(36).slice(2, 8);

  return `<div class="dc-chat-preview" data-dc-uid="${uid}">`
    + `<div class="dc-chat-preview-toolbar">`
    + `<span class="dc-chat-preview-label">Discord Message</span>`
    + `<button class="dc-chat-toggle-btn active" data-action="dc-show-preview">Preview</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-show-code">Code</button>`
    + `</div>`
    + `<div class="dc-chat-preview-body">${html}</div>`
    + `<div class="dc-chat-code-body"><pre class="code-block"><code>${codeEscaped}</code></pre></div>`
    + `</div>`;
}

// ── Discord Rich Presence Preview ──

function renderDiscordPresenceBlock(raw) {
  const DiscordRenderer = require('../../../ui/discord/DiscordRenderer');
  const html = DiscordRenderer.renderPresence(raw);
  if (!html) {
    return `<pre class="code-block"><code>${escapeHtml(raw)}</code></pre>`;
  }

  const codeEscaped = escapeHtml(raw);
  const uid = 'dc-preview-' + Math.random().toString(36).slice(2, 8);

  return `<div class="dc-chat-preview" data-dc-uid="${uid}">`
    + `<div class="dc-chat-preview-toolbar">`
    + `<span class="dc-chat-preview-label">Discord Rich Presence</span>`
    + `<button class="dc-chat-toggle-btn active" data-action="dc-show-preview">Preview</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-show-code">Code</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-copy-json">Copy JSON</button>`
    + `</div>`
    + `<div class="dc-chat-preview-body">${html}</div>`
    + `<div class="dc-chat-code-body"><pre class="code-block"><code>${codeEscaped}</code></pre></div>`
    + `<div class="dc-chat-raw" style="display:none">${codeEscaped}</div>`
    + `</div>`;
}

// ── Discord Modal Preview ──

function renderDiscordModalBlock(raw) {
  const DiscordRenderer = require('../../../ui/discord/DiscordRenderer');
  const html = DiscordRenderer.renderModal(raw);
  if (!html) {
    return `<pre class="code-block"><code>${escapeHtml(raw)}</code></pre>`;
  }

  const codeEscaped = escapeHtml(raw);
  const uid = 'dc-preview-' + Math.random().toString(36).slice(2, 8);

  return `<div class="dc-chat-preview" data-dc-uid="${uid}">`
    + `<div class="dc-chat-preview-toolbar">`
    + `<span class="dc-chat-preview-label">Discord Modal</span>`
    + `<button class="dc-chat-toggle-btn active" data-action="dc-show-preview">Preview</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-show-code">Code</button>`
    + `<button class="dc-chat-toggle-btn" data-action="dc-copy-json">Copy JSON</button>`
    + `</div>`
    + `<div class="dc-chat-preview-body">${html}</div>`
    + `<div class="dc-chat-code-body"><pre class="code-block"><code>${codeEscaped}</code></pre></div>`
    + `<div class="dc-chat-raw" style="display:none">${codeEscaped}</div>`
    + `</div>`;
}

module.exports = {
  renderDiscordEmbedBlock,
  renderDiscordComponentBlock,
  renderDiscordMessageBlock,
  renderDiscordPresenceBlock,
  renderDiscordModalBlock,
};
