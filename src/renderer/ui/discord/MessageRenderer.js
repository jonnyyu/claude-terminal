/**
 * Discord Message Renderer
 * Renders a complete Discord message with username, avatar, markdown, embeds, and components
 */

const EmbedRenderer = require('./EmbedRenderer');
const ComponentRenderer = require('./ComponentRenderer');

const { escapeHtml, escapeAttr } = EmbedRenderer;

/**
 * Render the referenced (replied-to) message line shown above a reply.
 */
function renderReply(reply) {
  if (!reply) return '';
  const username = escapeHtml(reply.username || 'User');
  const avatar = reply.avatarUrl
    ? `<img class="dc-reply-avatar" src="${escapeAttr(reply.avatarUrl)}" alt="">`
    : `<div class="dc-reply-avatar">${username.charAt(0).toUpperCase()}</div>`;
  const content = reply.content
    ? `<span class="dc-reply-content">${EmbedRenderer.renderInlineMarkdown(reply.content)}</span>`
    : `<span class="dc-reply-content dc-reply-empty">Click to see attachment</span>`;
  return `<div class="dc-reply"><div class="dc-reply-spine"></div>${avatar}<span class="dc-reply-username">${username}</span>${content}</div>`;
}

/**
 * Render message attachments (images inline, other files as file cards).
 */
function renderAttachments(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) return '';
  let html = '<div class="dc-attachments">';
  for (const att of attachments) {
    const url = att.url || att.proxy_url || '';
    const type = att.content_type || att.contentType || '';
    const name = att.name || att.filename || 'file';
    const isImage = /^image\//.test(type) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(url);
    if (isImage && url) {
      html += `<img class="dc-attachment-image" src="${escapeAttr(url)}" alt="${escapeAttr(name)}">`;
    } else {
      const size = att.size ? formatBytes(att.size) : '';
      html += `<div class="dc-attachment-file">`
        + `<svg class="dc-attachment-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M13 9V3.5L18.5 9H13zM6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6z"/></svg>`
        + `<div class="dc-attachment-meta">`
        + (url ? `<a class="dc-attachment-name" href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>` : `<span class="dc-attachment-name">${escapeHtml(name)}</span>`)
        + (size ? `<span class="dc-attachment-size">${size}</span>` : '')
        + `</div></div>`;
    }
  }
  html += '</div>';
  return html;
}

/**
 * Render reaction pills.
 */
function renderReactions(reactions) {
  if (!Array.isArray(reactions) || !reactions.length) return '';
  let html = '<div class="dc-reactions">';
  for (const r of reactions) {
    const emoji = ComponentRenderer.renderEmoji(r.emoji);
    const count = r.count != null ? r.count : 1;
    const mine = r.me ? ' dc-reaction-me' : '';
    html += `<div class="dc-reaction${mine}"><span class="dc-reaction-emoji">${emoji}</span><span class="dc-reaction-count">${escapeHtml(String(count))}</span></div>`;
  }
  html += '</div>';
  return html;
}

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

/**
 * Render Discord-specific markdown: mentions, channels, roles, spoilers, timestamps
 */
function renderMessageMarkdown(text) {
  if (!text) return '';

  // Start with basic Discord markdown
  let html = EmbedRenderer.renderDiscordMarkdown(text);

  // User mentions <@123456> or <@!123456>
  html = html.replace(/&lt;@!?(\d+)&gt;/g, '<span class="dc-mention">@user</span>');

  // Role mentions <@&123456>
  html = html.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="dc-mention">@role</span>');

  // Channel mentions <#123456>
  html = html.replace(/&lt;#(\d+)&gt;/g, '<span class="dc-channel-mention">#channel</span>');

  // Custom emoji <:name:id> or <a:name:id>
  html = html.replace(/&lt;(a?):(\w+):(\d+)&gt;/g, (match, animated, name, id) => {
    const ext = animated ? 'gif' : 'png';
    return `<img src="https://cdn.discordapp.com/emojis/${id}.${ext}" alt=":${name}:" title=":${name}:" width="20" height="20" style="vertical-align: middle;">`;
  });

  // Spoilers ||text||
  html = html.replace(/\|\|(.+?)\|\|/g, '<span class="dc-spoiler">$1</span>');

  // Discord timestamps <t:unix:format>
  html = html.replace(/&lt;t:(\d+)(?::([tTdDfFR]))?&gt;/g, (match, unix, format) => {
    try {
      const date = new Date(parseInt(unix) * 1000);
      let formatted;
      switch (format) {
        case 't': formatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); break;
        case 'T': formatted = date.toLocaleTimeString(); break;
        case 'd': formatted = date.toLocaleDateString(); break;
        case 'D': formatted = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }); break;
        case 'F': formatted = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); break;
        case 'R': {
          const diff = Math.floor((Date.now() - date.getTime()) / 1000);
          if (diff < 60) formatted = 'just now';
          else if (diff < 3600) formatted = `${Math.floor(diff / 60)} minutes ago`;
          else if (diff < 86400) formatted = `${Math.floor(diff / 3600)} hours ago`;
          else formatted = `${Math.floor(diff / 86400)} days ago`;
          break;
        }
        default:
        case 'f': formatted = date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); break;
      }
      return `<span class="dc-timestamp">${formatted}</span>`;
    } catch {
      return match;
    }
  });

  return html;
}

/**
 * Render a complete Discord message
 * @param {Object} message - Message data
 * @param {string} message.content - Text content
 * @param {string} [message.username] - Username
 * @param {string} [message.avatarUrl] - Avatar URL
 * @param {boolean} [message.bot] - Is bot
 * @param {string} [message.timestamp] - ISO timestamp
 * @param {Object[]} [message.embeds] - Array of embed objects
 * @param {Object[]} [message.components] - Array of component action rows
 * @returns {string} HTML string
 */
function render(message) {
  if (!message) return '';

  const username = EmbedRenderer.escapeHtml(message.username || 'Bot');
  const avatarInitial = username.charAt(0).toUpperCase();
  const isBot = message.bot !== false;
  const timestamp = formatMessageTimestamp(message.timestamp);

  let html = '<div class="dc-message">';

  // Avatar
  if (message.avatarUrl) {
    html += `<img class="dc-message-avatar" src="${EmbedRenderer.escapeAttr(message.avatarUrl)}" alt="">`;
  } else {
    html += `<div class="dc-message-avatar">${avatarInitial}</div>`;
  }

  // Content wrapper
  html += '<div class="dc-message-content">';

  // Reply reference (shown above the header)
  const reply = message.reply || message.referenced_message;
  if (reply) {
    html += renderReply(reply);
  }

  // Header
  html += '<div class="dc-message-header">';
  html += `<span class="dc-message-username">${username}</span>`;
  if (isBot) {
    html += '<span class="dc-message-bot-badge">BOT</span>';
  }
  if (timestamp) {
    html += `<span class="dc-message-timestamp">${timestamp}</span>`;
  }
  html += '</div>';

  // Body text
  if (message.content) {
    html += `<div class="dc-message-body">${renderMessageMarkdown(message.content)}</div>`;
  }

  // Attachments
  if (message.attachments && message.attachments.length > 0) {
    html += renderAttachments(message.attachments);
  }

  // Embeds
  if (message.embeds && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      html += EmbedRenderer.render(embed);
    }
  }

  // Components
  if (message.components && message.components.length > 0) {
    html += ComponentRenderer.render(message.components);
  }

  // Reactions
  if (message.reactions && message.reactions.length > 0) {
    html += renderReactions(message.reactions);
  }

  html += '</div>'; // .dc-message-content
  html += '</div>'; // .dc-message

  return html;
}

function formatMessageTimestamp(ts) {
  if (!ts) {
    const now = new Date();
    return `Today at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  try {
    const date = new Date(ts);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  } catch {
    return '';
  }
}

module.exports = {
  render,
  renderMessageMarkdown
};
