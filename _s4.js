
  let activeThreadId = localStorage.getItem('active-thread-id') || 'chat-default';
  let threads = [];
  let isThinking = false;
  let authMode = 'login';
  let currentUsername = '';
  let attachmentsList = [];
  let deleteTargetThreadId = null;
  let renameTargetThreadId = null;
  let activeCanvasContent = '';
  let activeCanvasTitle = '';
  let currentSpeechUtterance = null;
  let recognition = null;
  let isVoiceDictating = false;
  let searchQuery = '';
  let showDeletedOnly = false;
  let currentDownloadKind = null; // 'pptx' | 'poster-pdf' | null

  const portalView = document.getElementById('portal-view');
  const dashboardView = document.getElementById('dashboard-view');
  const authForm = document.getElementById('auth-form');
  const authUsernameInput = document.getElementById('auth-username');
  const authPasswordInput = document.getElementById('auth-password');
  const btnAuthSubmit = document.getElementById('btn-auth-submit');
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabRegisterBtn = document.getElementById('tab-register-btn');
  const btnGuestLogin = document.getElementById('btn-guest-login');

  const sidebar = document.getElementById('sidebar');
  const btnCollapseSidebar = document.getElementById('btn-collapse-sidebar');
  const btnExpandSidebar = document.getElementById('btn-expand-sidebar');
  const btnNewChat = document.getElementById('btn-new-chat');
  const threadsList = document.getElementById('threads-list');
  const valUsername = document.getElementById('val-username');
  const valUserAvatar = document.getElementById('val-user-avatar');
  const btnLogout = document.getElementById('btn-logout');

  const headerChatTitle = document.getElementById('header-chat-title');
  const currentThreadTitleText = document.getElementById('current-thread-title');
  const valIntent = document.getElementById('val-intent');
  const valEscalation = document.getElementById('val-escalation');
  const btnResetThread = document.getElementById('btn-reset-thread');

  const messagesViewport = document.getElementById('messages-viewport');
  const messagesContainer = document.getElementById('messages-container');
  const btnScrollBottom = document.getElementById('btn-scroll-bottom');

  const chatForm = document.getElementById('chat-form');
  const composerInput = document.getElementById('composer-input');
  const btnSendMessage = document.getElementById('btn-send-message');

  const btnUploadFile = document.getElementById('btn-upload-file');
  const hiddenFileInput = document.getElementById('hidden-file-input');
  const attachmentPreviewBar = document.getElementById('attachment-preview-bar');
  const btnVoiceDictate = document.getElementById('btn-voice-dictate');

  const canvasPanel = document.getElementById('canvas-panel');
  const canvasTitleText = document.getElementById('canvas-title-text');
  const canvasBodyContent = document.getElementById('canvas-body-content');
  const canvasCopy = document.getElementById('canvas-copy');
  const canvasFullscreen = document.getElementById('canvas-fullscreen');
  const canvasClose = document.getElementById('canvas-close');

  const btnOpenPromptLib = document.getElementById('btn-open-prompt-lib');
  const promptLibModal = document.getElementById('prompt-lib-modal');
  const btnClosePromptLib = document.getElementById('btn-close-prompt-lib');
  const promptTemplatesList = document.getElementById('prompt-templates-list');
  const promptCompiler = document.getElementById('prompt-compiler');
  const promptVariablesGrid = document.getElementById('prompt-variables-grid');
  const btnCancelPromptUse = document.getElementById('btn-cancel-prompt-use');
  const btnConfirmPromptUse = document.getElementById('btn-confirm-prompt-use');

  const deleteModal = document.getElementById('delete-modal');
  const deleteModalCancel = document.getElementById('delete-modal-cancel');
  const deleteModalConfirm = document.getElementById('delete-modal-confirm');

  const renameModal = document.getElementById('rename-modal');
  const renameModalCancel = document.getElementById('rename-modal-cancel');
  const renameModalConfirm = document.getElementById('rename-modal-confirm');
  const renameModalInput = document.getElementById('rename-modal-input');

  marked.setOptions({
    gfm: true, breaks: true,
    highlight: function(code, lang) {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value;
      return hljs.highlightAuto(code).value;
    }
  });

  let promptTemplates = [
    { id:'equip-diagnose', category:'industrial', title:'Equipment fault diagnosis', desc:'Check state logs, evaluate tolerances, and recommend next steps.', content:'Check the status of [Equipment ID], look up the safety SOP handover logs, and diagnose the fault. The symptom reported is: [Symptom description]. Recommend intermediate mitigation tasks before technician arrival.' },
    { id:'shift-handover', category:'industrial', title:'Shift handover review', desc:'Draft handover documentation summarizing anomalies and unresolved issues.', content:'Look up the shift handover protocol in the knowledge base and compile a handover log. Current items to note: [Unresolved ticket IDs / issues]. Focus on safety alerts and list priority actions for shift [Shift Name].' },
    { id:'loto-safety', category:'industrial', title:'Lockout-tagout (LOTO) audit', desc:'Generate a safety isolation compliance checklist.', content:'Verify safety LOTO procedures for [Equipment Tag]. Check which valves require padlock lockouts, identify the primary electrical breaker location, and outline the energy-zero verification steps.' },
    { id:'preventive-maintenance', category:'industrial', title:'Preventive maintenance guide', desc:'Build a maintenance schedule based on run hours.', content:'Compile a preventive maintenance checklist for [Machine Name] based on its running hours: [Run Hours] and age: [Age in Years]. Highlight safety precautions and required spare parts.' },
    { id:'calculate-consumption', category:'math', title:'Coolant consumption calculator', desc:'Evaluate total volume usage from flow rate and duration.', content:'Calculate the total volume of coolant used if flow rate is [Flow Rate] L/min for [Duration] hours. Convert the result to gallons and show variables, conversion factor, and calculation details.' },
    { id:'tolerance-eval', category:'math', title:'Mechanical clearance tolerances', desc:'Compare measured clearances against SOP standards.', content:'Evaluate if a measured clearance of [Measured Value] mm falls within the standard specification limits of [Min SOP Limit] mm to [Max SOP Limit] mm. Compute deviation and recommend if immediate lockout/tagout (LOTO) is required.' },
    { id:'exchanger-efficiency', category:'math', title:'Heat exchanger efficiency', desc:'Evaluate heat transfer rates and thermal efficiency.', content:'Compute the thermal efficiency of a shell-and-tube heat exchanger. Hot fluid inlet is [Hot Inlet Temp]°C and outlet is [Hot Outlet Temp]°C. Cold fluid inlet is [Cold Inlet Temp]°C and outlet is [Cold Outlet Temp]°C. Flow rate is [Flow Rate] kg/s.' },
    { id:'safety-slides', category:'slides', title:'Industrial safety slide deck', desc:'Create an interactive presentation for safety briefings.', content:'Generate a 4-slide presentation summarizing industrial safety protocols for [Facility Name]. Focus on PPE compliance, emergency shut-off points, hazard identification, and LOTO procedure.' },
    { id:'shift-handover-slides', category:'slides', title:'Operations handover slides', desc:'Format daily crew change logs into visual slides.', content:'Generate a 3-slide presentation for the operations team handover of Shift [Shift Number]. Include slide 1: Safety Summary, slide 2: Ongoing Critical Alarms, and slide 3: Tasks Pending Next Shift.' },
    { id:'concept-slides', category:'slides', title:'Concept explanation slides', desc:'Generate an interactive technical pitch deck.', content:'Generate a 5-slide presentation introducing the concept of: [Technical Concept]. Cover historical context, core mechanics, mathematical formulation, practical examples, and future trends.' },
    { id:'paper-poster', category:'poster', title:'Academic paper poster layout', desc:'Generate a 3-column conference layout summarizing a paper.', content:'Analyze the research paper on [Research Topic] and layout a scientific research poster. Use the format with sections: Abstract, Introduction, Experimental Setup, Key Findings, and References.' },
    { id:'material-science-poster', category:'poster', title:'Material science poster', desc:'Formulate stress-testing and microstructural findings.', content:'Create a 3-column academic conference poster summarizing research on: [Material Name] properties under high stress. Structure sections: Abstract, Stress Testing Methodology, Microstructure Analysis, and References.' },
    { id:'reactor-optimization-poster', category:'poster', title:'Design optimization poster', desc:'Create a poster representing a design optimization study.', content:'Create a conference poster representing a design optimization study for a [Reactor Type] reactor. Include domain="Chemical Engineering", authors="Process Design Group". Specify sections: Abstract, Mathematical Model, Parametric Analysis, and References.' },
    { id:'fastapi-resource', category:'general', title:'FastAPI database boilerplate', desc:'Generate a complete FastAPI resource with database connection.', content:'Write a complete Python script using FastAPI, SQLModel/SQLite, and Pydantic to create, read, update, and delete the resource: [Resource Name]. Make sure endpoints are secure and include validation schemas.' },
    { id:'incident-report', category:'general', title:'Professional incident report', desc:'Draft a formal incident report with timeline and impact.', content:'Draft a professional incident report describing a [Incident Type] event occurred on [Incident Date]. Location: [Plant Area]. Immediate actions taken: [Action items]. Conclude with a recommendation for root cause analysis.' },
    { id:'sql-migration', category:'general', title:'SQL schema migration script', desc:'Generate a migration SQL script with index preservation.', content:'Write a production-ready SQL script to migrate database [Old Table Name] to [New Table Name], ensuring data preservation, indexing, and foreign key integrity. Include rollback commands.' }
  ];

  let selectedTemplate = null;

  async function init() {
    lucide.createIcons();

    const authRes = await checkAuthStatus();
    if (authRes.authenticated) {
      showChatDashboard(authRes.username);
    } else {
      showPortalView();
    }

    try {
      const promptsRes = await fetch('/static/prompts.json');
      if (promptsRes.ok) promptTemplates = await promptsRes.json();
    } catch (err) {
      console.warn('Using default fallback prompts:', err);
    }

    tabLoginBtn.addEventListener('click', () => switchAuthMode('login'));
    tabRegisterBtn.addEventListener('click', () => switchAuthMode('register'));
    authForm.addEventListener('submit', handleAuthSubmit);
    btnGuestLogin.addEventListener('click', handleGuestLogin);
    btnLogout.addEventListener('click', handleLogout);

    btnCollapseSidebar.addEventListener('click', toggleSidebar);
    btnExpandSidebar.addEventListener('click', toggleSidebar);
    btnNewChat.addEventListener('click', createNewChat);
    btnResetThread.addEventListener('click', resetCurrentThread);
    btnScrollBottom.addEventListener('click', scrollToBottom);
    messagesViewport.addEventListener('scroll', handleViewportScroll);

    deleteModalCancel.addEventListener('click', () => deleteModal.classList.remove('active'));
    deleteModalConfirm.addEventListener('click', executeDeleteThread);

    renameModalCancel.addEventListener('click', () => renameModal.classList.remove('active'));
    renameModalConfirm.addEventListener('click', executeRenameThread);

    headerChatTitle.addEventListener('click', () => {
      const threadObj = threads.find(t => t.thread_id === activeThreadId);
      openRenameModal(activeThreadId, threadObj ? threadObj.title : activeThreadId);
    });

    canvasClose.addEventListener('click', closeCanvasPanel);
    canvasCopy.addEventListener('click', copyCanvasContent);
    canvasFullscreen.addEventListener('click', toggleCanvasFullscreen);

    const canvasDownload = document.createElement('button');
    canvasDownload.className = 'canvas-btn';
    canvasDownload.id = 'canvas-download';
    canvasDownload.title = 'Download file';
    canvasDownload.innerHTML = '<i data-lucide="download" style="width:15px;height:15px;"></i>';
    canvasDownload.style.display = 'none';
    document.querySelector('.canvas-actions').insertBefore(canvasDownload, canvasCopy);

    canvasDownload.addEventListener('click', async () => {
      if (!currentDownloadKind) return;
      const endpoint = currentDownloadKind === 'pptx'
        ? `/export/pptx/${encodeURIComponent(activeThreadId)}`
        : `/export/poster-pdf/${encodeURIComponent(activeThreadId)}`;
      try {
        const res = await fetch(endpoint);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert((err.error && err.error.message) || err.detail || 'Download failed.');
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') || '';
        const match = disposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : (currentDownloadKind === 'pptx' ? 'presentation.pptx' : 'poster.pdf');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        alert('Failed to download file.');
      }
    });

    composerInput.addEventListener('input', handleComposerResize);
    chatForm.addEventListener('submit', handleChatSubmit);
    composerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!btnSendMessage.disabled) {
          chatForm.requestSubmit();
        }
      }
    });

    btnUploadFile.addEventListener('click', () => hiddenFileInput.click());
    hiddenFileInput.addEventListener('change', handleFileUpload);

    btnVoiceDictate.addEventListener('click', toggleVoiceDictation);
    initSpeechRecognition();

    const selectLang = document.getElementById('select-lang');
    const savedLang = localStorage.getItem('user-selected-lang') || 'auto';
    selectLang.value = savedLang;
    selectLang.addEventListener('change', () => {
      localStorage.setItem('user-selected-lang', selectLang.value);
    });

    btnOpenPromptLib.addEventListener('click', openPromptLibrary);
    btnClosePromptLib.addEventListener('click', closePromptLibrary);
    btnCancelPromptUse.addEventListener('click', closePromptLibrary);
    btnConfirmPromptUse.addEventListener('click', compileAndInsertPrompt);

    document.querySelectorAll('.prompt-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.prompt-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPromptLibrary(btn.dataset.cat);
      });
    });

    // Search & trash toggle
    const searchThreads = document.getElementById('search-threads');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const btnToggleTrash = document.getElementById('btn-toggle-trash');

    if (searchThreads) {
      searchThreads.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (btnClearSearch) btnClearSearch.style.display = searchQuery ? 'flex' : 'none';
        filterAndRenderThreads();
      });
      searchThreads.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchThreads.value = '';
          searchQuery = '';
          if (btnClearSearch) btnClearSearch.style.display = 'none';
          filterAndRenderThreads();
        }
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        searchThreads.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        filterAndRenderThreads();
        searchThreads.focus();
      });
    }

    if (btnToggleTrash) {
      btnToggleTrash.addEventListener('click', () => {
        showDeletedOnly = !showDeletedOnly;
        btnToggleTrash.style.backgroundColor = showDeletedOnly ? 'rgba(178,59,46,0.1)' : 'transparent';
        btnToggleTrash.style.color = showDeletedOnly ? 'var(--danger)' : 'var(--text-muted)';
        refreshThreadsList();
      });
    }

    // Export Modal Events
    const btnExportThread = document.getElementById('btn-export-thread');
    const exportModal = document.getElementById('export-modal');
    const exportModalCancel = document.getElementById('export-modal-cancel');
    const btnExportMd = document.getElementById('btn-export-md');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const btnExportTxt = document.getElementById('btn-export-txt');

    if (btnExportThread) {
      btnExportThread.addEventListener('click', () => {
        exportModal.classList.add('active');
      });
    }

    if (exportModalCancel) {
      exportModalCancel.addEventListener('click', () => {
        exportModal.classList.remove('active');
      });
    }

    if (btnExportMd) {
      btnExportMd.addEventListener('click', () => downloadExport('markdown'));
    }
    if (btnExportPdf) {
      btnExportPdf.addEventListener('click', () => downloadExport('pdf'));
    }
    if (btnExportTxt) {
      btnExportTxt.addEventListener('click', () => downloadExport('plain'));
    }
  }

  async function downloadExport(format) {
    try {
      const res = await fetch(`/threads/${encodeURIComponent(activeThreadId)}/export?format=${format}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert((err.error && err.error.message) || err.detail || 'Export failed.');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thread_${activeThreadId}.${format === 'plain' ? 'txt' : format === 'markdown' ? 'md' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      document.getElementById('export-modal').classList.remove('active');
    } catch (err) {
      console.error(err);
      alert('Failed to export thread.');
    }
  }

  function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    btnExpandSidebar.style.display = isCollapsed ? 'flex' : 'none';
  }

  async function checkAuthStatus() {
    try {
      const res = await fetch('/me');
      if (res.ok) return await res.json();
    } catch (err) { console.error('Session check failed', err); }
    return { authenticated: false };
  }

  function switchAuthMode(mode) {
    authMode = mode;
    if (mode === 'login') {
      tabLoginBtn.classList.add('active');
      tabRegisterBtn.classList.remove('active');
      btnAuthSubmit.textContent = 'Enter Atlas';
    } else {
      tabLoginBtn.classList.remove('active');
      tabRegisterBtn.classList.add('active');
      btnAuthSubmit.textContent = 'Register & log in';
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value;
    if (!username || !password) return;

    const endpoint = authMode === 'login' ? '/login' : '/register';
    btnAuthSubmit.disabled = true;
    btnAuthSubmit.textContent = 'Authenticating…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        showChatDashboard(data.username);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error?.message || errData.detail || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      console.error('Auth request error', err);
      alert('Server communication error.');
    } finally {
      btnAuthSubmit.disabled = false;
      switchAuthMode(authMode);
    }
  }

  async function handleGuestLogin() {
    try {
      const res = await fetch('/guest', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showChatDashboard(data.username);
      }
    } catch (err) { console.error(err); }
  }

  async function handleLogout() {
    stopReadAloud();
    closeCanvasPanel();
    try { 
      await fetch('/logout', { method: 'POST', credentials: 'include' }); 
    } catch (err) { 
      console.error(err); 
    }
    document.cookie = "session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" + window.location.hostname + ";";
    localStorage.removeItem('active-thread-id');
    showPortalView();
    window.location.replace('/');
  }

  function showPortalView() {
    portalView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    currentUsername = '';
  }

  let allThreads = [];

  async function showChatDashboard(username) {
    currentUsername = username;
    portalView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    valUsername.textContent = username;
    valUserAvatar.textContent = username.charAt(0).toUpperCase();

    authUsernameInput.value = '';
    authPasswordInput.value = '';

    await refreshThreadsList();

    const savedThread = localStorage.getItem('active-thread-id');
    if (savedThread && allThreads.some(t => t.thread_id === savedThread)) {
      await selectThread(savedThread);
    } else if (savedThread && savedThread.startsWith('chat-')) {
      await selectThread(savedThread);
    } else if (allThreads.length > 0) {
      await selectThread(allThreads[0].thread_id);
    } else {
      await createNewChat();
    }
    lucide.createIcons();
  }

  async function refreshThreadsList() {
    try {
      let url = '/threads?';
      if (showDeletedOnly) {
        url += 'include_deleted=true';
      }
      const res = await fetch(url);
      const data = await res.json();
      allThreads = data.threads || [];
      if (showDeletedOnly) {
        allThreads = allThreads.filter(t => t.deleted_at);
      }
      filterAndRenderThreads();
    } catch (err) { console.error('Failed to refresh threads', err); }
  }

  function filterAndRenderThreads() {
    const q = (searchQuery || '').trim().toLowerCase();
    threads = q ? allThreads.filter(t => (t.title || '').toLowerCase().includes(q) || (t.thread_id || '').toLowerCase().includes(q)) : [...allThreads];
    renderThreads();
  }

  function renderThreads() {
    threadsList.innerHTML = '';

    // If search active and nothing matched, show friendly state
    if (searchQuery && threads.length === 0) {
      const emptySearch = document.createElement('div');
      emptySearch.className = 'empty-search-state';
      emptySearch.style = 'padding:24px 12px;text-align:center;color:var(--text-muted);font-size:.8rem;display:flex;flex-direction:column;align-items:center;gap:6px;';
      emptySearch.innerHTML = `<i data-lucide="search-x" style="width:20px;height:20px;opacity:0.5;"></i><span>No matching chats</span>`;
      threadsList.appendChild(emptySearch);
      lucide.createIcons();
      return;
    }

    // If active thread is a brand new chat not yet in backend list, render it at top
    if (activeThreadId && !allThreads.some(t => t.thread_id === activeThreadId) && !searchQuery) {
      const activeNewItem = document.createElement('div');
      activeNewItem.className = 'thread-item active';
      activeNewItem.dataset.id = activeThreadId;
      activeNewItem.innerHTML = `
        <div class="thread-info">
          <i data-lucide="message-square-plus" class="thread-icon" style="width:16px;height:16px;color:var(--accent-primary);"></i>
          <span class="thread-title-text" style="font-weight:600;color:var(--text-main);">New chat</span>
        </div>
      `;
      threadsList.appendChild(activeNewItem);
    }

    threads.forEach(t => {
      const item = document.createElement('div');
      item.className = `thread-item ${t.thread_id === activeThreadId ? 'active' : ''}`;
      item.dataset.id = t.thread_id;

      const isSoftDeleted = !!t.deleted_at;
      const pinTitle = t.pinned ? 'Unpin chat' : 'Pin chat';

      let actionsHTML = '';
      if (isSoftDeleted) {
        actionsHTML = `
          <button class="thread-action-btn restore" title="Restore chat"><i data-lucide="rotate-ccw" style="width:14px;height:14px;color:var(--success);"></i></button>
          <button class="thread-action-btn hard-delete" title="Delete permanently"><i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger);"></i></button>
        `;
      } else {
        actionsHTML = `
          <button class="thread-action-btn pin-btn ${t.pinned ? 'pinned' : ''}" title="${pinTitle}"><i data-lucide="star" style="width:14px;height:14px;${t.pinned ? 'fill:var(--accent-primary);color:var(--accent-primary);' : ''}"></i></button>
          <button class="thread-action-btn rename" title="Rename title"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
          <button class="thread-action-btn delete" title="Delete chat"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
        `;
      }

      item.innerHTML = `
        <div class="thread-info" style="${isSoftDeleted ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
          <i data-lucide="message-square" class="thread-icon" style="width:16px;height:16px;"></i>
          <span class="thread-title-text" style="${t.pinned ? 'font-weight: 600;' : ''}">${t.title || t.thread_id}</span>
        </div>
        <div class="thread-actions">
          ${actionsHTML}
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.thread-action-btn')) return;
        selectThread(t.thread_id);
      });

      if (isSoftDeleted) {
        item.querySelector('.restore').addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const res = await fetch(`/threads/${encodeURIComponent(t.thread_id)}/restore`, { method: 'POST' });
            if (res.ok) await refreshThreadsList();
          } catch (err) { console.error(err); }
        });

        item.querySelector('.hard-delete').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Permanently delete this chat? This cannot be undone.')) return;
          try {
            const res = await fetch(`/threads/${encodeURIComponent(t.thread_id)}?hard=true`, { method: 'DELETE' });
            if (res.ok) {
              if (t.thread_id === activeThreadId) {
                const nextThread = threads.find(x => x.thread_id !== t.thread_id);
                if (nextThread) { await selectThread(nextThread.thread_id); } else { await createNewChat(); }
              } else {
                await refreshThreadsList();
              }
            }
          } catch (err) { console.error(err); }
        });
      } else {
        item.querySelector('.pin-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const res = await fetch(`/threads/${encodeURIComponent(t.thread_id)}/pin?pinned=${!t.pinned}`, { method: 'POST' });
            if (res.ok) await refreshThreadsList();
          } catch (err) { console.error(err); }
        });

        item.querySelector('.rename').addEventListener('click', (e) => {
          e.stopPropagation();
          openRenameModal(t.thread_id, t.title || t.thread_id);
        });

        item.querySelector('.delete').addEventListener('click', (e) => {
          e.stopPropagation();
          openDeleteModal(t.thread_id);
        });
      }

      threadsList.appendChild(item);
    });
    lucide.createIcons();
  }

  function openRenameModal(threadId, currentTitle) {
    renameTargetThreadId = threadId;
    renameModalInput.value = currentTitle;
    renameModal.classList.add('active');
    renameModalInput.focus();
  }

  async function executeRenameThread() {
    const newTitle = renameModalInput.value.trim();
    if (!newTitle) return;
    try {
      const res = await fetch(`/threads/${encodeURIComponent(renameTargetThreadId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (res.ok) {
        renameModal.classList.remove('active');
        if (renameTargetThreadId === activeThreadId) currentThreadTitleText.textContent = newTitle;
        await refreshThreadsList();
      }
    } catch (err) { console.error(err); }
  }

  function openDeleteModal(threadId) {
    deleteTargetThreadId = threadId;
    deleteModal.classList.add('active');
  }

  async function executeDeleteThread() {
    try {
      const res = await fetch(`/threads/${encodeURIComponent(deleteTargetThreadId)}`, { method: 'DELETE' });
      if (res.ok) {
        deleteModal.classList.remove('active');
        if (deleteTargetThreadId === activeThreadId) {
          const nextThread = threads.find(t => t.thread_id !== deleteTargetThreadId);
          if (nextThread) { await selectThread(nextThread.thread_id); } else { await createNewChat(); }
        } else {
          await refreshThreadsList();
        }
      }
    } catch (err) { console.error(err); }
  }

  async function selectThread(threadId) {
    stopReadAloud();
    closeCanvasPanel();
    activeThreadId = threadId;
    localStorage.setItem('active-thread-id', threadId);

  async function selectThread(threadId) {
    stopReadAloud();
    closeCanvasPanel();
    activeThreadId = threadId;
    localStorage.setItem('active-thread-id', threadId);

    document.querySelectorAll('.thread-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === threadId);
    });

    const threadObj = allThreads.find(t => t.thread_id === threadId);
    currentThreadTitleText.textContent = threadObj ? threadObj.title : 'New chat';

    if (threadId.startsWith('chat-') && !allThreads.some(t => t.thread_id === threadId)) {
      clearMessageViewport();
      showWelcomeScreen();
      return;
    }

    await loadThreadHistory(threadId);
  }

  async function createNewChat() {
    stopReadAloud();
    closeCanvasPanel();
    isThinking = false;
    const newId = 'chat-' + Date.now();
    activeThreadId = newId;
    localStorage.setItem('active-thread-id', newId);

    currentThreadTitleText.textContent = 'New chat';
    if (valIntent) valIntent.textContent = 'n/a';
    if (valEscalation) valEscalation.textContent = 'false';

    filterAndRenderThreads();
    clearMessageViewport();
    showWelcomeScreen();

    if (composerInput) {
      composerInput.value = '';
      composerInput.style.height = 'auto';
      composerInput.focus();
    }
    if (btnSendMessage) {
      btnSendMessage.disabled = true;
    }
  }

  function clearMessageViewport() {
    messagesContainer.innerHTML = '';
    attachmentsList = [];
    renderAttachmentPreviewBar();
  }

  function showWelcomeScreen() {
    clearMessageViewport();
    const welcome = document.createElement('div');
    welcome.className = 'welcome-container';
    welcome.innerHTML = `
      <svg class="welcome-logo" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="welcomeAtlasGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#4F46E5"/>
            <stop offset="100%" stop-color="#06B6D4"/>
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#welcomeAtlasGrad)"/>
        <path d="M24 9L12 34.5H18.7L24 23.2L29.3 34.5H36L24 9Z" fill="#FFFFFF"/>
        <polygon points="24,24 27.8,32.2 20.2,32.2" fill="#38BDF8"/>
      </svg>
      <h1 class="welcome-title">How can Atlas help you today?</h1>
      <p class="welcome-subtitle">I'm an operations copilot and research assistant. Pick a starter module below, or just start typing.</p>

      <div class="welcome-grid">
        <div class="welcome-card" onclick="triggerStarterModule('diagnose')">
          <div class="welcome-card-icon"><i data-lucide="wrench"></i></div>
          <div class="welcome-card-info"><h3>Equipment fault diagnosis</h3><p>Assess anomalies, check safety SOPs, and recommend mitigations.</p></div>
        </div>
        <div class="welcome-card" onclick="triggerStarterModule('slides')">
          <div class="welcome-card-icon"><i data-lucide="presentation"></i></div>
          <div class="welcome-card-info"><h3>Create slide deck</h3><p>Generate structured, interactive presentation slides on any topic.</p></div>
        </div>
        <div class="welcome-card" onclick="triggerStarterModule('poster')">
          <div class="welcome-card-icon"><i data-lucide="award"></i></div>
          <div class="welcome-card-info"><h3>Research poster creator</h3><p>Analyze academic papers and lay out a multi-column poster.</p></div>
        </div>
        <div class="welcome-card" onclick="triggerStarterModule('knowledge')">
          <div class="welcome-card-icon"><i data-lucide="book-open"></i></div>
          <div class="welcome-card-info"><h3>Knowledge &amp; SOP search</h3><p>Semantic retrieval and verified procedures across plant operations.</p></div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(welcome);
    lucide.createIcons();
  }

  window.triggerStarterModule = function(moduleName) {
    if (moduleName === 'diagnose') {
      composerInput.value = "Check safety SOP logs for the equipment and diagnose the fault. Symptom reported: motor high temperature alert. Recommend intermediate mitigations.";
    } else if (moduleName === 'slides') {
      composerInput.value = "Generate a 4-slide presentation detailing the concept of: [Your Topic Here]. Include slide titles, bullet points, and key takeaways.";
    } else if (moduleName === 'poster') {
      composerInput.value = "Analyze the research paper [Insert Title/Abstract] and layout a scientific poster with Abstract, Methodology, Results, and References sections.";
      hiddenFileInput.click();
    } else if (moduleName === 'knowledge') {
      composerInput.value = "Search knowledge base: What is the lockout/tagout (LOTO) procedure for isolating hydraulic press lines?";
    }
    handleComposerResize();
    composerInput.focus();
  };

  async function loadThreadHistory(threadId) {
    clearMessageViewport();
    isThinking = false;

    const threadObj = threads.find(t => t.thread_id === threadId);
    const isSoftDeleted = threadObj && !!threadObj.deleted_at;

    if (isSoftDeleted) {
      const banner = document.createElement('div');
      banner.className = 'deleted-thread-banner';
      banner.style = 'background: rgba(178,59,46,0.1); border: 1px solid rgba(178,59,46,0.25); border-radius: 12px; padding: 14px 18px; margin: 0 20px 20px 20px; font-size: 0.88rem; color: var(--danger); display: flex; align-items: center; justify-content: space-between;';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i data-lucide="alert-triangle" style="width:16px; height:16px;"></i>
          <span>This chat is soft-deleted and will be purged permanently after 30 days.</span>
        </div>
        <button class="btn-open-artifact" id="btn-restore-banner" style="padding: 4px 10px; font-size: 0.75rem;">Restore</button>
      `;
      messagesContainer.appendChild(banner);
      
      banner.querySelector('#btn-restore-banner').addEventListener('click', async () => {
        try {
          const res = await fetch(`/threads/${encodeURIComponent(threadId)}/restore`, { method: 'POST' });
          if (res.ok) {
            await refreshThreadsList();
            await selectThread(threadId);
          }
        } catch (err) { console.error(err); }
      });
      lucide.createIcons();
    }

    try {
      const res = await fetch(`/history/${encodeURIComponent(threadId)}`);
      if (!res.ok) throw new Error('History request failed');
      const data = await res.json();
      const historyMsgs = data.messages || [];

      if (historyMsgs.length === 0) {
        showWelcomeScreen();
        valIntent.textContent = 'n/a';
        valEscalation.textContent = 'false';
      } else {
        historyMsgs.forEach(m => appendMessageHTML(m.role, m.content));
        scrollToBottom();

        const assistantMsgs = historyMsgs.filter(m => m.role === 'assistant');
        if (assistantMsgs.length > 0) {
          const last = assistantMsgs[assistantMsgs.length - 1].content;
          const escMatch = last.match(/## Escalation\s*\n\s*-\s*(Yes|No)/i);
          if (escMatch) valEscalation.textContent = escMatch[1].trim().toLowerCase() === 'yes' ? 'true' : 'false';
        }
      }
    } catch (err) {
      console.error(err);
      appendMessageHTML('tool', 'Failed to load history context.');
    }
  }

  function createSlidePlayerHTML(title, slides) {
    let cardsHTML = '';
    let dotsHTML = '';

    slides.forEach((slide, idx) => {
      const activeClass = idx === 0 ? 'active' : '';
      const slideBody = `<div class="slide-body-text" style="color:var(--text-main);font-size:1.02rem;line-height:1.7;width:100%;">${marked.parse(slide.content)}</div>`;

      cardsHTML += `
        <div class="slide-card ${activeClass}" data-slide-index="${idx}">
          <span class="slide-number-indicator">Slide ${idx + 1} of ${slides.length}</span>
          <h2 class="slide-title-header">${escapeHTML(slide.title)}</h2>
          <div class="slide-body-content">${slideBody}</div>
        </div>
      `;
      dotsHTML += `<span class="slide-dot ${activeClass}" data-slide-index="${idx}" onclick="setSlide(${idx})"></span>`;
    });

    window.currentSlideIndex = 0;
    window.totalSlidesCount = slides.length;

    window.setSlide = function(idx) {
      window.currentSlideIndex = idx;
      const cards = document.querySelectorAll('.slide-card');
      const dots = document.querySelectorAll('.slide-dot');
      cards.forEach((card, i) => card.classList.toggle('active', i === idx));
      dots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
      const prevBtn = document.getElementById('slide-prev-btn');
      const nextBtn = document.getElementById('slide-next-btn');
      if (prevBtn) prevBtn.disabled = idx === 0;
      if (nextBtn) nextBtn.disabled = idx === window.totalSlidesCount - 1;
    };

    window.prevSlide = function() { if (window.currentSlideIndex > 0) window.setSlide(window.currentSlideIndex - 1); };
    window.nextSlide = function() { if (window.currentSlideIndex < window.totalSlidesCount - 1) window.setSlide(window.currentSlideIndex + 1); };

    return `
      <div class="slide-deck-container" id="slide-deck-player">
        ${cardsHTML}
        <div class="slide-player-controls">
          <button class="slide-ctrl-btn" id="slide-prev-btn" onclick="prevSlide()" disabled>
            <i data-lucide="arrow-left" style="width:14px;height:14px;"></i> Prev
          </button>
          <div class="slide-indicator-dots">${dotsHTML}</div>
          <button class="slide-ctrl-btn" id="slide-next-btn" onclick="nextSlide()" ${slides.length <= 1 ? 'disabled' : ''}>
            Next <i data-lucide="arrow-right" style="width:14px;height:14px;"></i>
          </button>
        </div>
      </div>
    `;
  }

  function createPosterHTML(title, authors, domain, sections) {
    let col1HTML = '', col2HTML = '', col3HTML = '';
    sections.forEach((sec, idx) => {
      const cardHTML = `
        <div class="poster-card">
          <h3 class="poster-card-title">${escapeHTML(sec.title)}</h3>
          <div class="poster-card-content">${marked.parse(sec.content)}</div>
        </div>
      `;
      if (idx % 3 === 0) col1HTML += cardHTML;
      else if (idx % 3 === 1) col2HTML += cardHTML;
      else col3HTML += cardHTML;
    });

    return `
      <div class="poster-board">
        <div class="poster-header">
          <span class="poster-domain">${escapeHTML(domain || 'Scientific Research')}</span>
          <h1 class="poster-title-text">${escapeHTML(title)}</h1>
          <div class="poster-authors">${escapeHTML(authors || 'Lead Researcher')}</div>
        </div>
        <div class="poster-grid">
          <div class="poster-column">${col1HTML}</div>
          <div class="poster-column">${col2HTML}</div>
          <div class="poster-column">${col3HTML}</div>
        </div>
      </div>
    `;
  }

  function appendMessageHTML(role, content) {
    const welcome = document.querySelector('.welcome-container');
    if (welcome) welcome.remove();

    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const avatarLabel = role === 'user' ? 'U' : role === 'assistant' ? 'A' : 'T';

    let bodyHTML = role === 'assistant' ? marked.parse(content) : `<p>${escapeHTML(content)}</p>`;

    let controlsHTML = '';
    if (role === 'assistant') {
      controlsHTML = `
        <div class="message-controls">
          <button class="btn-message-control read-aloud" title="Read response aloud">
            <i data-lucide="volume-2" style="width:14px;height:14px;"></i>
            <span>Listen</span>
          </button>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="message-avatar" title="${role}">${avatarLabel}</div>
      <div class="message-bubble">
        <div class="message-content">${bodyHTML}</div>
        ${controlsHTML}
      </div>
    `;

    messagesContainer.appendChild(row);

    if (role === 'assistant' && content) {
      finalizeAssistantMessage(row, content);
    }

    lucide.createIcons();
    scrollToBottom();
    return row;
  }

  function finalizeAssistantMessage(row, content) {
    const bodyHTML = marked.parse(content);
    const contentArea = row.querySelector('.message-content');
    contentArea.innerHTML = bodyHTML;

    row.querySelectorAll('[data-downloadable="true"]').forEach((el) => {
      if (el.parentElement.querySelector('.media-download-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'btn-message-control media-download-btn';
      btn.type = 'button';
      btn.innerHTML = '<i data-lucide="download" style="width:14px;height:14px;"></i><span>Download</span>';
      btn.addEventListener('click', async () => {
        const src = el.getAttribute('src');
        const res = await fetch(`/download/asset?url=${encodeURIComponent(src)}`);
        if (!res.ok) { alert('Download failed.'); return; }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = src.split('/').pop();
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
      });
      el.insertAdjacentElement('afterend', btn);
    });

    const preBlocks = row.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      const codeElement = pre.querySelector('code');
      const text = codeElement ? codeElement.innerText : '';

      let lang = 'code';
      if (codeElement && codeElement.className) {
        const match = codeElement.className.match(/language-(\w+)/);
        if (match) lang = match[1];
      }

      if (pre.querySelector('.code-block-header')) return;

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <span>${lang}</span>
        <div style="display:flex;gap:8px;">
          <button class="btn-copy-code cta-view-canvas" type="button"><i data-lucide="eye" style="width:12px;height:12px;"></i> View canvas</button>
          <button class="btn-copy-code cta-copy" type="button"><i data-lucide="copy" style="width:12px;height:12px;"></i> Copy</button>
        </div>
      `;
      pre.insertBefore(header, pre.firstChild);

      header.querySelector('.cta-view-canvas').addEventListener('click', () => {
        openCanvasPanel(text, `${lang.toUpperCase()} code snippet`);
      });

      header.querySelector('.cta-copy').addEventListener('click', async (e) => {
        try {
          await navigator.clipboard.writeText(text);
          const btn = e.currentTarget;
          btn.innerHTML = `<i data-lucide="check" style="width:12px;height:12px;color:var(--success);"></i> Copied!`;
          lucide.createIcons();
          setTimeout(() => {
            btn.innerHTML = `<i data-lucide="copy" style="width:12px;height:12px;"></i> Copy`;
            lucide.createIcons();
          }, 2000);
        } catch (err) { console.error(err); }
      });
    });

    if (!row.querySelector('.artifact-cta-card')) {
      if (content.includes('## Summary') || content.includes('## Findings') || content.includes('## Recommendation')) {
        const cta = document.createElement('div');
        cta.className = 'artifact-cta-card';
        cta.innerHTML = `
          <div class="artifact-cta-info">
            <i data-lucide="file-text" style="color:var(--accent-primary);"></i>
            <div style="font-size:.8rem;"><strong>Structured report generated</strong><br><span style="color:var(--text-muted);">Open in canvas for split-screen editing.</span></div>
          </div>
          <button class="btn-open-artifact" type="button">Open in canvas</button>
        `;
        cta.querySelector('.btn-open-artifact').addEventListener('click', () => {
          openCanvasPanel(bodyHTML, 'Operations diagnostic report', true);
        });
        row.querySelector('.message-bubble').insertBefore(cta, row.querySelector('.message-bubble').lastElementChild);
      }

      const presTagMatch = content.match(/<presentation([\s\S]*?)>([\s\S]*?)<\/presentation>/i);
      if (presTagMatch) {
        const attrs = presTagMatch[1];
        const slidesBlock = presTagMatch[2];

        let title = "Presentation";
        const titleMatch = attrs.match(/title=["']([^"']+)["']/i);
        if (titleMatch) title = titleMatch[1];

        const slides = [];
        const slideRegex = /<slide([\s\S]*?)>([\s\S]*?)<\/slide>/gi;
        let slideMatch;
        while ((slideMatch = slideRegex.exec(slidesBlock)) !== null) {
          const sAttrs = slideMatch[1];
          const sContent = slideMatch[2];
          let sTitle = "Slide";
          const sTitleMatch = sAttrs.match(/title=["']([^"']+)["']/i);
          if (sTitleMatch) sTitle = sTitleMatch[1];
          slides.push({ title: sTitle, content: sContent });
        }

        if (slides.length > 0) {
          const cta = document.createElement('div');
          cta.className = 'artifact-cta-card';
          cta.innerHTML = `
            <div class="artifact-cta-info">
              <i data-lucide="presentation" style="color:var(--accent-secondary);"></i>
              <div style="font-size:.8rem;"><strong>Slide deck ready</strong><br><span style="color:var(--text-muted);">${slides.length} slides generated. Click to present.</span></div>
            </div>
            <button class="btn-open-artifact" type="button">Open slides</button>
          `;
          cta.querySelector('.btn-open-artifact').addEventListener('click', () => {
            currentDownloadKind = 'pptx';
            document.getElementById('canvas-download').style.display = 'flex';
            openCanvasPanel(createSlidePlayerHTML(title, slides), title, true);
            lucide.createIcons();
          });
          row.querySelector('.message-bubble').insertBefore(cta, row.querySelector('.message-bubble').lastElementChild);
        }
      }

      const posterTagMatch = content.match(/<poster([\s\S]*?)>([\s\S]*?)<\/poster>/i);
      if (posterTagMatch) {
        const attrs = posterTagMatch[1];
        const sectionsBlock = posterTagMatch[2];

        let title = "Research Poster", authors = "Lead Researcher", domain = "Scientific Domain";
        const titleM = attrs.match(/title=["']([^"']+)["']/i);
        if (titleM) title = titleM[1];
        const authorsM = attrs.match(/authors=["']([^"']+)["']/i);
        if (authorsM) authors = authorsM[1];
        const domainM = attrs.match(/domain=["']([^"']+)["']/i);
        if (domainM) domain = domainM[1];

        const sections = [];
        const secRegex = /<section([\s\S]*?)>([\s\S]*?)<\/section>/gi;
        let secMatch;
        while ((secMatch = secRegex.exec(sectionsBlock)) !== null) {
          const secAttrs = secMatch[1];
          const secContent = secMatch[2];
          let secTitle = "Section";
          const secTitleMatch = secAttrs.match(/title=["']([^"']+)["']/i);
          if (secTitleMatch) secTitle = secTitleMatch[1];
          sections.push({ title: secTitle, content: secContent });
        }

        if (sections.length > 0) {
          const cta = document.createElement('div');
          cta.className = 'artifact-cta-card';
          cta.innerHTML = `
            <div class="artifact-cta-info">
              <i data-lucide="award" style="color:var(--success);"></i>
              <div style="font-size:.8rem;"><strong>Research poster formatted</strong><br><span style="color:var(--text-muted);">Scientific layout ready in canvas workspace.</span></div>
            </div>
            <button class="btn-open-artifact" type="button">View poster</button>
          `;
          cta.querySelector('.btn-open-artifact').addEventListener('click', () => {
            currentDownloadKind = 'poster-pdf';
            document.getElementById('canvas-download').style.display = 'flex';
            openCanvasPanel(createPosterHTML(title, authors, domain, sections), title, true);
            lucide.createIcons();
          });
          row.querySelector('.message-bubble').insertBefore(cta, row.querySelector('.message-bubble').lastElementChild);
        }
      }
    }

    parseAndRenderCharts(contentArea);

    const listenBtn = row.querySelector('.read-aloud');
    if (listenBtn) {
      const newListenBtn = listenBtn.cloneNode(true);
      listenBtn.parentNode.replaceChild(newListenBtn, listenBtn);
      newListenBtn.addEventListener('click', () => toggleReadAloud(content, newListenBtn));
    }
    lucide.createIcons();
  }

  function parseAndRenderCharts(container) {
    const charts = container.querySelectorAll('chart');
    charts.forEach(chartTag => {
      const type = chartTag.getAttribute('type') || 'line';
      const title = chartTag.getAttribute('title') || 'Chart';
      const labelsAttr = chartTag.getAttribute('labels') || '';
      const dataAttr = chartTag.getAttribute('data') || '';

      const labels = labelsAttr.split(',').map(s => s.trim());
      const data = dataAttr.split(',').map(s => parseFloat(s.trim()));

      const chartWrapper = document.createElement('div');
      chartWrapper.className = 'chart-container-box';

      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.maxHeight = '240px';
      chartWrapper.appendChild(canvas);

      chartTag.parentNode.replaceChild(chartWrapper, chartTag);

      new Chart(canvas, {
        type: type,
        data: {
          labels: labels,
          datasets: [{
            label: title, data: data,
            borderColor: '#C2643F',
            backgroundColor: 'rgba(194, 100, 63, 0.12)',
            borderWidth: 2, tension: 0.3, fill: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#28221A' } } },
          scales: {
            x: { grid: { color: 'rgba(31,27,22,0.06)' }, ticks: { color: '#7C7264' } },
            y: { grid: { color: 'rgba(31,27,22,0.06)' }, ticks: { color: '#7C7264' } }
          }
        }
      });
    });
  }

  function openCanvasPanel(content, title, isHTML = false) {
    activeCanvasContent = content;
    activeCanvasTitle = title;
    canvasTitleText.textContent = title;

    if (content && (content.includes('slide-deck-container') || content.includes('poster-board'))) {
      canvasPanel.classList.add('wide-mode');
    } else {
      canvasPanel.classList.remove('wide-mode');
    }

    if (isHTML) {
      canvasBodyContent.innerHTML = content;
    } else {
      canvasBodyContent.innerHTML = `<pre style="background:#211D17 !important;border-radius:12px;padding:16px;overflow:auto;"><code class="hljs" style="background:transparent;padding:0;">${escapeHTML(content)}</code></pre>`;
      hljs.highlightElement(canvasBodyContent.querySelector('code'));
    }

    canvasPanel.classList.add('active');
  }

  function closeCanvasPanel() {
    canvasPanel.classList.remove('active');
    canvasPanel.classList.remove('wide-mode');
    canvasPanel.style.width = '';
    document.body.classList.remove('fullscreen-canvas');
    currentDownloadKind = null;
    const dl = document.getElementById('canvas-download');
    if (dl) dl.style.display = 'none';
  }

  async function copyCanvasContent() {
    try {
      const textToCopy = canvasBodyContent.innerText || canvasBodyContent.textContent;
      await navigator.clipboard.writeText(textToCopy);
      canvasCopy.innerHTML = `<i data-lucide="check" style="width:15px;height:15px;color:var(--success);"></i>`;
      lucide.createIcons();
      setTimeout(() => {
        canvasCopy.innerHTML = `<i data-lucide="copy" style="width:15px;height:15px;"></i>`;
        lucide.createIcons();
      }, 1500);
    } catch (err) { console.error(err); }
  }

  function toggleCanvasFullscreen() {
    const isExpanded = canvasPanel.style.width === '100vw';
    if (isExpanded) {
      canvasPanel.style.width = canvasPanel.classList.contains('wide-mode') ? '80%' : '45%';
      canvasFullscreen.innerHTML = `<i data-lucide="maximize-2" style="width:15px;height:15px;"></i>`;
    } else {
      canvasPanel.style.width = '100vw';
      canvasFullscreen.innerHTML = `<i data-lucide="minimize-2" style="width:15px;height:15px;"></i>`;
    }
    lucide.createIcons();
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[tag] || tag));
  }

  function handleViewportScroll() {
    const scrollPos = messagesViewport.scrollTop;
    const scrollHeight = messagesViewport.scrollHeight;
    const clientHeight = messagesViewport.clientHeight;
    if (scrollHeight - scrollPos - clientHeight > 300) btnScrollBottom.classList.add('visible');
    else btnScrollBottom.classList.remove('visible');
  }

  function scrollToBottom() {
    messagesViewport.scrollTo({ top: messagesViewport.scrollHeight, behavior: 'smooth' });
  }

  function handleComposerResize() {
    composerInput.style.height = 'auto';
    composerInput.style.height = (composerInput.scrollHeight - 6) + 'px';
    btnSendMessage.disabled = composerInput.value.trim().length === 0 && attachmentsList.length === 0;
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    btnUploadFile.disabled = true;
    btnUploadFile.innerHTML = `<span style="font-size:.75rem;color:var(--accent-primary);">…</span>`;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        attachmentsList.push(data);
        renderAttachmentPreviewBar();
      } else {
        alert('Upload failed.');
      }
    } catch (err) {
      console.error(err);
      alert('File upload server error.');
    } finally {
      btnUploadFile.disabled = false;
      btnUploadFile.innerHTML = `<i data-lucide="paperclip" style="width:17px;height:17px;"></i>`;
      lucide.createIcons();
      handleComposerResize();
      hiddenFileInput.value = '';
    }
  }

  function renderAttachmentPreviewBar() {
    if (attachmentsList.length === 0) {
      attachmentPreviewBar.style.display = 'none';
      attachmentPreviewBar.innerHTML = '';
      return;
    }

    attachmentPreviewBar.style.display = 'flex';
    attachmentPreviewBar.innerHTML = '';

    attachmentsList.forEach((att, index) => {
      const card = document.createElement('div');
      card.className = 'attachment-preview-card';

      let iconHTML = `<i data-lucide="file" style="width:16px;"></i>`;
      if (att.type === 'image') iconHTML = `<img src="${att.url}" alt="preview">`;
      else if (att.type === 'audio') iconHTML = `<i data-lucide="volume-2" style="width:16px;"></i>`;
      else if (att.type === 'video') iconHTML = `<i data-lucide="video" style="width:16px;"></i>`;
      else if (att.filename && att.filename.toLowerCase().endsWith('.pdf')) iconHTML = `<i data-lucide="file-text" style="width:16px;color:var(--danger);"></i>`;

      card.innerHTML = `
        ${iconHTML}
        <span>${att.filename || 'Attachment'}</span>
        <button type="button" class="btn-remove-attachment" title="Remove"><i data-lucide="x" style="width:10px;height:10px;"></i></button>
      `;

      card.querySelector('.btn-remove-attachment').addEventListener('click', () => {
        attachmentsList.splice(index, 1);
        renderAttachmentPreviewBar();
        handleComposerResize();
      });

      attachmentPreviewBar.appendChild(card);
    });
    lucide.createIcons();
  }

  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { btnVoiceDictate.style.display = 'none'; return; }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => { isVoiceDictating = true; btnVoiceDictate.classList.add('listening'); };
    recognition.onerror = (e) => { console.error('Speech recognition error', e); isVoiceDictating = false; btnVoiceDictate.classList.remove('listening'); };
    recognition.onend = () => { isVoiceDictating = false; btnVoiceDictate.classList.remove('listening'); };
    recognition.onresult = (e) => {
      const resultText = e.results[0][0].transcript;
      composerInput.value = (composerInput.value + ' ' + resultText).trim();
      handleComposerResize();
      composerInput.focus();
    };
  }

  function toggleVoiceDictation() {
    if (!recognition) return;
    if (isVoiceDictating) {
      recognition.stop();
    } else {
      const selectLang = document.getElementById('select-lang').value;
      const langMap = { auto:'en-US', en:'en-US', hi:'hi-IN', gu:'gu-IN', ta:'ta-IN', te:'te-IN', kn:'kn-IN', ml:'ml-IN', bn:'bn-IN', mr:'mr-IN' };
      recognition.lang = langMap[selectLang] || 'en-US';
      recognition.start();
    }
  }

  function toggleReadAloud(text, buttonElement) {
    const cleanText = text.replace(/#+\s+/g, '').replace(/\*+/g, '').replace(/`+/g, '');

    if (currentSpeechUtterance) {
      stopReadAloud();
      if (buttonElement.dataset.speaking === 'true') return;
    }

    const icon = buttonElement.querySelector('i');
    const span = buttonElement.querySelector('span');

    currentSpeechUtterance = new SpeechSynthesisUtterance(cleanText);

    currentSpeechUtterance.onstart = () => {
      buttonElement.dataset.speaking = 'true';
      buttonElement.style.color = 'var(--accent-primary)';
      span.textContent = 'Stop';
      icon.setAttribute('data-lucide', 'square');
      lucide.createIcons();
    };

    currentSpeechUtterance.onend = () => {
      buttonElement.dataset.speaking = 'false';
      buttonElement.style.color = '';
      span.textContent = 'Listen';
      icon.setAttribute('data-lucide', 'volume-2');
      lucide.createIcons();
      currentSpeechUtterance = null;
    };

    currentSpeechUtterance.onerror = () => {
      buttonElement.dataset.speaking = 'false';
      buttonElement.style.color = '';
      span.textContent = 'Listen';
      icon.setAttribute('data-lucide', 'volume-2');
      lucide.createIcons();
      currentSpeechUtterance = null;
    };

    window.speechSynthesis.speak(currentSpeechUtterance);
  }

  function stopReadAloud() {
    window.speechSynthesis.cancel();
    document.querySelectorAll('.read-aloud').forEach(btn => {
      btn.dataset.speaking = 'false';
      btn.style.color = '';
      btn.querySelector('span').textContent = 'Listen';
      btn.querySelector('i').setAttribute('data-lucide', 'volume-2');
    });
    lucide.createIcons();
    currentSpeechUtterance = null;
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    const messageText = composerInput.value.trim();
    if (!messageText && attachmentsList.length === 0) return;
    if (isThinking) return;

    composerInput.value = '';
    composerInput.style.height = 'auto';
    btnSendMessage.disabled = true;

    const currentAttachments = [...attachmentsList];
    attachmentsList = [];
    renderAttachmentPreviewBar();

    appendMessageHTML('user', messageText);
    const userBubble = messagesContainer.lastChild.querySelector('.message-bubble');

    currentAttachments.forEach(att => {
      let renderNode = null;
      if (att.type === 'image') { renderNode = document.createElement('img'); renderNode.src = att.url; renderNode.className = 'attachment-render image'; }
      else if (att.type === 'audio') { renderNode = document.createElement('audio'); renderNode.src = att.url; renderNode.controls = true; renderNode.className = 'attachment-render audio'; }
      else if (att.type === 'video') { renderNode = document.createElement('video'); renderNode.src = att.url; renderNode.controls = true; renderNode.className = 'attachment-render video'; }
      else {
        renderNode = document.createElement('a');
        renderNode.href = att.url; renderNode.target = '_blank';
        renderNode.textContent = `📎 Download ${att.filename || 'File'}`;
        renderNode.style.display = 'block'; renderNode.style.margin = '8px 0';
      }
      userBubble.insertBefore(renderNode, userBubble.lastChild);
    });

    showThinkingIndicator();
    isThinking = true;

    try {
      const selectedLang = document.getElementById('select-lang').value;
      const res = await fetch('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: activeThreadId, message: messageText, attachments: currentAttachments, language: selectedLang })
      });

      if (res.status === 403) throw new Error('Forbidden access to this conversation thread.');
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error?.message || errData.detail || 'Service error'); }

      removeThinkingIndicator();

      const assistantRow = appendMessageHTML('assistant', '');
      const assistantContentArea = assistantRow.querySelector('.message-content');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let replyText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          if (cleanLine.startsWith('event:')) {
            currentEvent = cleanLine.substring(6).trim();
          } else if (cleanLine.startsWith('data:')) {
            const dataVal = cleanLine.substring(5).trim();
            if (currentEvent === 'token') {
              replyText = dataVal.replace(/\\n/g, '\n');
              assistantContentArea.innerHTML = marked.parse(replyText);
              scrollToBottom();
            } else if (currentEvent === 'done') {
              const payload = JSON.parse(dataVal);
              if (!replyText) {
                replyText = payload.reply;
                assistantContentArea.innerHTML = marked.parse(replyText);
              }
              valIntent.textContent = payload.intent || 'n/a';
              valEscalation.textContent = String(Boolean(payload.needs_escalation));

              finalizeAssistantMessage(assistantRow, replyText);
            } else if (currentEvent === 'error') {
              const errPayload = JSON.parse(dataVal);
              assistantContentArea.innerHTML = '<span style="color:var(--danger);">Error: ' + escapeHTML(errPayload.detail || 'Chat failed') + '</span>';
            }
          }
        }
      }

      await refreshThreadsList();
    } catch (err) {
      console.error(err);
      removeThinkingIndicator();
      appendMessageHTML('tool', 'Failed response: ' + err.message);
    } finally {
      isThinking = false;
    }
  }



  function showThinkingIndicator() {
    const loader = document.createElement('div');
    loader.className = 'message-row assistant thinking-loader';
    loader.innerHTML = `
      <div class="message-avatar">A</div>
      <div class="message-bubble" style="padding:10px 2px;">
        <div class="thinking-loader">
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
          <div class="thinking-dot"></div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(loader);
    scrollToBottom();
  }

  function removeThinkingIndicator() {
    const loader = document.querySelector('.thinking-loader');
    if (loader) loader.remove();
  }

  async function resetCurrentThread() {
    if (!confirm('Reset conversation? This clears history.')) return;
    try {
      const res = await fetch(`/reset/${encodeURIComponent(activeThreadId)}`, { method: 'POST' });
      if (res.ok) {
        clearMessageViewport();
        showWelcomeScreen();
        valIntent.textContent = 'n/a';
        valEscalation.textContent = 'false';
      }
    } catch (err) { console.error(err); }
  }



  function openPromptLibrary() { promptLibModal.classList.add('active'); renderPromptLibrary('all'); }
  function closePromptLibrary() {
    promptLibModal.classList.remove('active');
    promptCompiler.style.display = 'none';
    selectedTemplate = null;
    btnConfirmPromptUse.disabled = true;
  }

  function renderPromptLibrary(cat) {
    promptTemplatesList.innerHTML = '';
    promptCompiler.style.display = 'none';
    btnConfirmPromptUse.disabled = true;

    const filtered = cat === 'all' ? promptTemplates : promptTemplates.filter(t => t.category === cat);

    filtered.forEach(template => {
      const card = document.createElement('div');
      card.className = 'prompt-template-card';
      card.innerHTML = `
        <span class="prompt-template-title">${template.title}</span>
        <span class="prompt-template-desc">${template.desc}</span>
        <div class="prompt-template-content">${escapeHTML(template.content)}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.prompt-template-card').forEach(c => c.style.borderColor = '');
        card.style.borderColor = 'var(--accent-primary)';
        selectPromptTemplate(template);
      });

      promptTemplatesList.appendChild(card);
    });
  }

  function selectPromptTemplate(template) {
    selectedTemplate = template;
    promptVariablesGrid.innerHTML = '';

    const varRegex = /\[(.*?)\]/g;
    let match;
    const variables = [];

    while ((match = varRegex.exec(template.content)) !== null) {
      if (!variables.includes(match[1])) variables.push(match[1]);
    }

    if (variables.length === 0) {
      promptCompiler.style.display = 'none';
      btnConfirmPromptUse.disabled = false;
      return;
    }

    promptCompiler.style.display = 'flex';
    btnConfirmPromptUse.disabled = false;

    variables.forEach(variable => {
      const field = document.createElement('div');
      field.className = 'var-field';
      field.innerHTML = `
        <label class="var-label">${variable}</label>
        <input class="var-input" type="text" data-var="${variable}" placeholder="Enter ${variable.toLowerCase()}...">
      `;
      promptVariablesGrid.appendChild(field);
    });
  }

  function compileAndInsertPrompt() {
    if (!selectedTemplate) return;

    let compiledText = selectedTemplate.content;
    const inputs = promptVariablesGrid.querySelectorAll('.var-input');

    inputs.forEach(input => {
      const variable = input.dataset.var;
      const val = input.value.trim() || `[${variable}]`;
      compiledText = compiledText.split(`[${variable}]`).join(val);
    });

    composerInput.value = compiledText;
    handleComposerResize();
    closePromptLibrary();
    composerInput.focus();
  }

  document.addEventListener('DOMContentLoaded', init);
