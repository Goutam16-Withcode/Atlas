
// =====================================================================
// MCP Integrations — Frontend controller
// =====================================================================
(function() {
  // State
  let _registry = [];          // full registry list
  let _activeServers = {};     // {server_id: definition}
  let _mcpTools = [];          // [{name, description}]
  let _activeCategory = 'all';
  let _searchQuery = '';

  // DOM refs (set after DOMContentLoaded in init below)
  let overlay, closeBtn, grid, catSidebar, searchInput,
      activeList, toolsList, statusDot, statusDotBar, statusText, barText,
      toolTotal, activeCountTab, toolsCountTab, sidebarBadge, refreshBtn;

  function initMCP() {
    overlay        = document.getElementById('mcp-modal-overlay');
    closeBtn       = document.getElementById('btn-close-mcp');
    grid           = document.getElementById('mcp-server-grid');
    catSidebar     = document.getElementById('mcp-category-sidebar');
    searchInput    = document.getElementById('mcp-search');
    activeList     = document.getElementById('mcp-active-list');
    toolsList      = document.getElementById('mcp-tools-list');
    statusDot      = document.getElementById('mcp-dot');
    statusDotBar   = document.getElementById('mcp-dot-bar');
    statusText     = document.getElementById('mcp-status-text');
    barText        = document.getElementById('mcp-bar-text');
    toolTotal      = document.getElementById('mcp-tool-total');
    activeCountTab = document.getElementById('mcp-active-count-tab');
    toolsCountTab  = document.getElementById('mcp-tools-count-tab');
    sidebarBadge   = document.getElementById('mcp-sidebar-badge');
    refreshBtn     = document.getElementById('btn-mcp-refresh');

    // Open button
    const openBtn = document.getElementById('btn-open-mcp');
    if (openBtn) openBtn.addEventListener('click', openMCP);

    // Close
    if (closeBtn) closeBtn.addEventListener('click', closeMCP);
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeMCP(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay && overlay.classList.contains('active')) closeMCP(); });

    // Tabs
    document.querySelectorAll('.mcp-tab').forEach(tab => {
      tab.addEventListener('click', () => switchMCPTab(tab.dataset.tab));
    });

    // Search
    if (searchInput) searchInput.addEventListener('input', e => {
      _searchQuery = e.target.value.toLowerCase();
      renderGrid();
    });

    // Refresh
    if (refreshBtn) refreshBtn.addEventListener('click', () => mcpRefresh());

    // Load initial data (non-blocking, no auth needed for registry)
    loadRegistry();
    // Status needs auth — load lazily when modal opens
  }

  function openMCP() {
    if (overlay) overlay.classList.add('active');
    loadRegistry();
    loadActiveAndTools();
  }

  function closeMCP() {
    if (overlay) overlay.classList.remove('active');
  }

  function switchMCPTab(tab) {
    document.querySelectorAll('.mcp-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.mcp-tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `mcp-panel-${tab}`);
    });
    if (tab === 'active' || tab === 'tools') loadActiveAndTools();
  }

  // ----------------------------------------------------------------
  // API calls
  // ----------------------------------------------------------------
  async function loadRegistry() {
    try {
      const res = await fetch('/mcp/registry');
      const data = await res.json();
      _registry = data.servers || [];
      renderCategories(data.categories || []);
      renderGrid();
    } catch (e) {
      if (grid) grid.innerHTML = `<div class="mcp-empty-state"><div class="mcp-empty-icon">⚠️</div><span>Failed to load registry: ${e.message}</span></div>`;
    }
  }

  async function loadActiveAndTools() {
    try {
      // Parallel fetch of status, active servers, and tools
      const [statusRes, activeRes, toolsRes] = await Promise.allSettled([
        fetch('/mcp/status'),
        fetch('/mcp/active'),
        fetch('/mcp/tools'),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        const s = await statusRes.value.json();
        updateStatusBar(s);
      }

      if (activeRes.status === 'fulfilled' && activeRes.value.ok) {
        const a = await activeRes.value.json();
        _activeServers = {};
        (a.servers || []).forEach(srv => { _activeServers[srv.server_id] = srv; });
        renderActiveList();
        updateCountBadges();
        renderGrid(); // refresh cards to show connected state
      }

      if (toolsRes.status === 'fulfilled' && toolsRes.value.ok) {
        const t = await toolsRes.value.json();
        _mcpTools = t.tools || [];
        renderToolsList();
        updateCountBadges();
      }
    } catch (e) {
      console.warn('MCP status load error:', e);
    }
  }

  async function connectServer(serverId, params) {
    const btn = document.getElementById(`mcp-btn-${serverId}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Connecting…'; }
    try {
      const res = await fetch('/mcp/connect', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ server_id: serverId, params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error?.message || 'Connection failed');

      showToast(`✅ Connected to ${serverId} — ${data.mcp_tools_loaded} MCP tool(s) loaded`, 'success');
      await loadActiveAndTools();
    } catch (e) {
      showToast(`❌ Connect failed: ${e.message}`, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Connect'; }
    }
  }

  async function disconnectServer(serverId) {
    const btn = document.getElementById(`mcp-btn-${serverId}`);
    if (btn) { btn.disabled = true; btn.textContent = 'Disconnecting…'; }
    try {
      const res = await fetch('/mcp/disconnect', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ server_id: serverId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Disconnect failed');
      showToast(`🔌 Disconnected ${serverId}`, 'info');
      await loadActiveAndTools();
    } catch (e) {
      showToast(`❌ Disconnect failed: ${e.message}`, 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Disconnect'; }
    }
  }

  async function mcpRefresh() {
    if (refreshBtn) { refreshBtn.disabled = true; refreshBtn.querySelector('span') && (refreshBtn.querySelector('span').textContent = ' Refreshing…'); }
    try {
      const res = await fetch('/mcp/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Refresh failed');
      showToast(`🔄 Refreshed — ${data.total_tools} tools active`, 'success');
      await loadActiveAndTools();
    } catch (e) {
      showToast(`❌ Refresh failed: ${e.message}`, 'error');
    } finally {
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  // ----------------------------------------------------------------
  // Renderers
  // ----------------------------------------------------------------
  function renderCategories(categories) {
    if (!catSidebar) return;
    catSidebar.innerHTML = '<button class="mcp-cat-btn active" data-cat="all">All</button>';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'mcp-cat-btn';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      catSidebar.appendChild(btn);
    });
    catSidebar.querySelectorAll('.mcp-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        catSidebar.querySelectorAll('.mcp-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _activeCategory = btn.dataset.cat;
        renderGrid();
      });
    });
  }

  function renderGrid() {
    if (!grid) return;
    let filtered = _registry;
    if (_activeCategory !== 'all') filtered = filtered.filter(s => s.category === _activeCategory);
    if (_searchQuery) filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(_searchQuery) ||
      s.description.toLowerCase().includes(_searchQuery) ||
      s.category.toLowerCase().includes(_searchQuery)
    );

    if (!filtered.length) {
      grid.innerHTML = `<div class="mcp-empty-state"><i data-lucide="search" style="width:28px;height:28px;opacity:0.4;"></i><span>No integrations match your search.</span></div>`;
      lucide.createIcons();
      return;
    }

    grid.innerHTML = filtered.map(srv => renderServerCard(srv)).join('');

    // Wire buttons
    filtered.forEach(srv => {
      const btn = document.getElementById(`mcp-btn-${srv.id}`);
      if (!btn) return;
      const isConn = !!_activeServers[srv.id];
      if (isConn) {
        btn.addEventListener('click', () => disconnectServer(srv.id));
      } else {
        btn.addEventListener('click', () => {
          const params = {};
          (srv.config_params || []).forEach(p => {
            const el = document.getElementById(`mcp-param-${srv.id}-${p.key}`);
            if (el) params[p.key] = el.value.trim();
          });
          connectServer(srv.id, params);
        });
      }
    });
  }

  function renderServerCard(srv) {
    const isConn = !!_activeServers[srv.id];
    const hasAuth = srv.auth_env && srv.auth_env.length > 0;
    const hasParams = srv.config_params && srv.config_params.length > 0;

    const authHtml = hasAuth
      ? `<div class="mcp-card-auth"><span style="font-weight:600;">Auth:</span> ${srv.auth_env.slice(0,2).join(', ')}${srv.auth_env.length>2?' +'+( srv.auth_env.length-2)+' more':''}</div>`
      : `<div class="mcp-card-auth no-auth"><span style="color:var(--success);font-weight:600;">Open access</span></div>`;

    const paramsHtml = (!isConn && hasParams)
      ? `<div class="mcp-params-form">${srv.config_params.map(p =>
          `<input class="mcp-param-input" id="mcp-param-${srv.id}-${p.key}"
            placeholder="${p.label}${p.required?' *':''}: ${p.placeholder || ''}"
            type="${p.secret ? 'password' : 'text'}">`
        ).join('')}</div>`
      : '';

    return `
    <div class="mcp-server-card${isConn?' connected':''}" id="mcp-card-${srv.id}">
      <div class="mcp-card-top">
        <div class="mcp-card-icon" style="background:#EEF2FF;color:#4F46E5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">${(srv.name||'MCP').slice(0,2).toUpperCase()}</div>
        <div class="mcp-card-meta">
          <div class="mcp-card-name">${srv.name}</div>
          <div class="mcp-card-category">${srv.category}</div>
        </div>
      </div>
      <div class="mcp-card-desc">${srv.description}</div>
      ${authHtml}
      ${paramsHtml}
      <div class="mcp-card-footer">
        ${isConn
          ? `<div class="mcp-connected-badge">Connected</div>`
          : `<a href="${srv.docs_url}" target="_blank" style="font-size:.72rem;color:var(--text-muted);text-decoration:none;" title="View docs">Docs &rarr;</a>`
        }
        <button class="btn-mcp-connect${isConn?' disconnect':''}" id="mcp-btn-${srv.id}">
          ${isConn ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    </div>`;
  }

  function renderActiveList() {
    if (!activeList) return;
    const servers = Object.entries(_activeServers);
    if (!servers.length) {
      activeList.innerHTML = `<div class="mcp-empty-state"><div class="mcp-empty-icon">🔌</div><span>No servers connected. Browse the Marketplace tab.</span></div>`;
      return;
    }
    activeList.innerHTML = servers.map(([id, def]) => `
    <div class="mcp-active-card">
      <div class="mcp-active-info">
        <div class="mcp-active-dot"></div>
        <div>
          <div class="mcp-active-name">${id}</div>
          <div class="mcp-active-transport">${def.transport || 'unknown'} transport${def.url ? ' · '+def.url : ''}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="mcp-tools-badge">${_mcpTools.length} tools</span>
        <button onclick="window._mcpDisconnect('${id}')" class="btn-mcp-connect disconnect" style="padding:4px 10px;">Disconnect</button>
      </div>
    </div>`).join('');

    // Expose disconnect to inline handler
    window._mcpDisconnect = (id) => disconnectServer(id);
  }

  function renderToolsList() {
    if (!toolsList) return;
    if (!_mcpTools.length) {
      toolsList.innerHTML = `<div class="mcp-empty-state" style="width:100%;"><div class="mcp-empty-icon">🛠️</div><span>No MCP tools loaded yet.</span></div>`;
      return;
    }
    toolsList.innerHTML = _mcpTools.map(t => `
    <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:8px;padding:8px 12px;font-size:.78rem;max-width:280px;">
      <div style="font-weight:600;color:#6366f1;margin-bottom:2px;">${t.name}</div>
      <div style="color:var(--text-muted);line-height:1.35;font-size:.72rem;">${(t.description||'').slice(0,90)}${(t.description||'').length>90?'…':''}</div>
    </div>`).join('');
  }

  function updateStatusBar(status) {
    const on = status.servers_active > 0 || status.enabled;
    if (statusDot) statusDot.classList.toggle('on', on);
    if (statusDotBar) statusDotBar.classList.toggle('on', on);
    if (statusText) statusText.textContent = on
      ? `${status.servers_active} server(s) active`
      : 'No servers connected';
    if (barText) barText.textContent = status.enabled
      ? `MCP enabled · ${status.servers_active} server(s) · set MCP_SERVERS_JSON in .env for persistence`
      : 'MCP disabled — set MCP_ENABLED=true in .env to persist connections across restarts';
    if (toolTotal) toolTotal.textContent = `${status.tools_cached} MCP tool(s)`;
  }

  function updateCountBadges() {
    const activeCount = Object.keys(_activeServers).length;
    const toolCount = _mcpTools.length;
    if (activeCountTab) activeCountTab.textContent = activeCount;
    if (toolsCountTab) toolsCountTab.textContent = toolCount;
    if (sidebarBadge) {
      sidebarBadge.textContent = activeCount;
      sidebarBadge.classList.toggle('visible', activeCount > 0);
    }
    if (toolTotal) toolTotal.textContent = `${toolCount} MCP tool(s)`;
  }

  function showToast(msg, type='info') {
    const t = document.createElement('div');
    const colors = {success:'var(--success)',error:'var(--danger)',info:'#6366f1'};
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:var(--bg-panel);border:1px solid var(--border-color);
      border-left:4px solid ${colors[type]||'#6366f1'};border-radius:10px;padding:12px 18px;font-size:.84rem;
      color:var(--text-main);z-index:9999;box-shadow:0 12px 32px rgba(40,34,26,0.15);
      max-width:380px;animation:fadeInUp .3s ease;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, 4000);
  }

  // Hook into DOMContentLoaded (already fired if late, but safe)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMCP);
  } else {
    initMCP();
  }

})();
