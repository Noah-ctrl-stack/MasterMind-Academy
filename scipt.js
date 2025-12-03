/* script.js - MasterMind Academy
   Logique front-end minimale & stockage local (localStorage).
   Interface en français par défaut. */

(() => {
  // --- Données initiales (exemples)
  const MATIERES = ["Math","Français","Anglais","Histoire-Géo/EMC","SVT","Technologie","Physique-Chimie"];
  const TYPES = ["fiche","video","article"];

  // Traductions simples (structure prête pour extension)
  const I18N = {
    fr: {
      welcome: "Bienvenue sur MasterMind Academy",
      pingouin: "Bonjour ! Je suis Pingouin IA",
      tutorialText: "Je vais te montrer les fonctions principales. Utilise les flèches pour avancer."
    },
    en: { welcome: "Welcome to MasterMind Academy", pingouin: "Hi! I'm Penguin AI", tutorialText: "I'll show you the main features. Use arrows to navigate." },
    es: { welcome: "Bienvenido a MasterMind Academy", pingouin: "¡Hola! Soy Pingüino IA", tutorialText: "Te mostraré las funciones principales." },
    zh: { welcome: "欢迎来到 MasterMind Academy", pingouin: "你好！我是企鹅 AI", tutorialText: "我将向你展示主要功能。" }
  };

  // --- Helpers
  const $ = sel => document.querySelector(sel);
  const $all = sel => Array.from(document.querySelectorAll(sel));
  const STORAGE_KEY = "mma_user_v1";

  // --- State
  let state = {
    user: null,
    books: 0,
    correctInARow: 0,
    lang: 'fr',
    level: '6e',
    quiz: {score:0, current:0, correct:0}
  };

  // --- Init
  function init(){
    loadFromStorage();
    setupUI();
    populateFilters();
    renderCourses();
    renderProgress();
    applyLang();
  }

  function loadFromStorage(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      try { Object.assign(state, JSON.parse(raw)); }
      catch(e){}
    }
  }
  function saveToStorage(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  // --- UI wiring
  function setupUI(){
    // Menu clicks
    $all('.menu li').forEach(li => {
      li.addEventListener('click', () => {
        $all('.menu li').forEach(x=>x.classList.remove('active'));
        li.classList.add('active');
        showSection(`section-${li.dataset.section || li.getAttribute('data-section')}`);
      });
    });

    // Start tutorial / overlay
    $('#start-tutorial').addEventListener('click', startTutorial);
    $('#btn-search').addEventListener('click', doQuickSearch);
    $('#search-input').addEventListener('keypress', ev => { if(ev.key==='Enter') doQuickSearch(); });

    // Signup modal
    $('#btn-signin').addEventListener('click', ()=> toggleModal('#modal-signup',false));
    $('#btn-cancel').addEventListener('click', ()=> toggleModal('#modal-signup',true));
    $('#btn-create').addEventListener('click', handleSignup);
    $('#btn-verify').addEventListener('click', handleVerifyCode);

    // Settings
    $('#btn-settings').addEventListener('click', ()=> { showSection('section-account'); $all('.menu li').forEach(x=>x.classList.remove('active')); document.querySelector('[data-section="account"]').classList.add('active'); });

    // Nav menu controls
    document.getElementById('select-level').value = state.level;
    document.getElementById('select-level').addEventListener('change', e => { state.level = e.target.value; saveToStorage(); });

    // Courses export
    $('#btn-new-fiche').addEventListener('click', exportSampleFiche);

    // Quiz wiring
    document.getElementById('section-quiz').querySelectorAll && $('#btn-next').addEventListener('click', nextQuiz);
    // quick demo quiz load
    initQuiz();

    // Account save/delete
    $('#btn-save-account').addEventListener('click', saveAccount);
    $('#btn-delete-account').addEventListener('click', deleteAccount);

    // Tools
    $('#open-calc').addEventListener('click', ()=> toggleModal('#calc-modal',false));
    $('#close-calc').addEventListener('click', ()=> toggleModal('#calc-modal',true));
    $('#open-dict').addEventListener('click', ()=> toggleModal('#dict-modal',false));
    $('#close-dict').addEventListener('click', ()=> toggleModal('#dict-modal',true));
    $('#open-formulas').addEventListener('click', ()=> toggleModal('#form-modal',false));
    $('#close-form').addEventListener('click', ()=> toggleModal('#form-modal',true));
    // calc buttons
    $all('#calc-modal [data-val]').forEach(b => b.addEventListener('click', ()=> {
      const d = $('#calc-display'); d.value = (d.value || '') + b.dataset.val;
    }));
    $('#calc-eq').addEventListener('click', ()=> {
      const d = $('#calc-display'); try { d.value = eval(d.value || ''); } catch(e){ d.value = 'Erreur' }
    });

    // Dict search (simulé)
    $('#dict-search').addEventListener('click', ()=> {
      const word = $('#dict-word').value.trim();
      const to = $('#dict-to').value;
      if(!word) { $('#dict-result').innerText = "Entrez un mot."; return; }
      // Simulé: on renvoie une traduction factice — prêt à brancher une API
      $('#dict-result').innerHTML = `<strong>${word}</strong> → [traduction simulée vers ${to}]`;
    });

    // Search page
    $('#search-box').addEventListener('input', ev => performSearch(ev.target.value));

    // tutorial overlay navigation
    $('#tut-next').addEventListener('click', tutNext);
    $('#tut-prev').addEventListener('click', tutPrev);

    // filters
    $('#filter-matter').addEventListener('change', renderCourses);
    $('#filter-type').addEventListener('change', renderCourses);

    // sign modal hide on outside click
    document.getElementById('modal-signup').addEventListener('click', (e) => { if(e.target === e.currentTarget) toggleModal('#modal-signup', true); });

    // load UI state
    updateBooksUI();
  }

  // --- Sections visibility
  function showSection(id){
    $all('.section').forEach(s => s.hidden = true);
    const el = document.getElementById(id);
    if(el) el.hidden = false;
  }

  // --- Courses rendering (sample content)
  function populateFilters(){
    const fm = $('#filter-matter');
    MATIERES.forEach(m => { const o = document.createElement('option'); o.value=m; o.textContent=m; fm.appendChild(o); });
  }

  // sample data generator
  function sampleItems(){
    const items = [];
    for(let i=0;i<12;i++){
      items.push({
        id: 'c'+i,
        title: `Fiche ${i+1} — ${MATIERES[i % MATIERES.length]}`,
        matiere: MATIERES[i % MATIERES.length],
        type: TYPES[i % TYPES.length],
        difficulty: ['facile','moyen','difficile'][i%3],
        content: `Contenu explicatif pour la fiche ${i+1}.`
      });
    }
    return items;
  }

  function renderCourses(){
    const grid = $('#courses-grid'); grid.innerHTML = '';
    const items = sampleItems();
    const fm = $('#filter-matter').value;
    const ft = $('#filter-type').value;
    const filtered = items.filter(it => (fm==='all' || it.matiere===fm) && (ft==='all' || it.type===ft));
    filtered.forEach(it => {
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `<h4>${it.title}</h4>
        <small>${it.matiere} • ${it.type} • ${it.difficulty}</small>
        <p>${it.content}</p>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="primary" data-id="${it.id}" onclick="(function(){window.open('about:blank').document.write('<pre>${escapeHtml(it.content)}</pre>')})();">Ouvrir</button>
          <button onclick="alert('Export / impression : envoi du contenu vers la fonction print() du navigateur')">Exporter / Imprimer</button>
        </div>`;
      grid.appendChild(card);
    });
  }

  // safe escape for embedding into new window
  function escapeHtml(s){ return (''+s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

  // --- Signup flow (simulé verification)
  function handleSignup(){
    const email = $('#su-email').value.trim();
    const last = $('#su-lastname').value.trim();
    const firstname = $('#su-firstname').value.trim();
    const pass = $('#su-pass').value;
    const dob = $('#su-dob').value;
    const level = $('#su-level').value;
    if(!email || !last || !firstname || !pass || !dob){ alert("Veuillez remplir tous les champs requis."); return; }
    // Simuler enregistrement temporaire et affichage de la zone de vérification
    $('#verif-email').innerText = email;
    $('#email-verif').classList.remove('hidden');
    $('#signup-form').classList.add('hidden');
    // sauvegarder temporairement
    state.pendingSignup = {email,last,firstname,pass,dob,level,code:'123456'}; // code simulé
    saveToStorage();
    alert("Code de vérification simulé : 123456 (ceci est une simulation locale).");
  }
  function handleVerifyCode(){
    const code = $('#verif-code').value.trim();
    if(!state.pendingSignup){ alert("Pas d'inscription en cours."); return; }
    if(code === state.pendingSignup.code){
      // créer compte
      state.user = {email: state.pendingSignup.email, firstname: state.pendingSignup.firstname, lastname: state.pendingSignup.last, dob: state.pendingSignup.dob, level: state.pendingSignup.level};
      state.books = state.books || 0;
      delete state.pendingSignup;
      saveToStorage();
      toggleModal('#modal-signup', true);
      alert("Inscription réussie ! Tutoriel obligatoire au premier accès.");
      startTutorial();
      updateUserUI();
    } else { alert("Code incorrect. Essayez 123456 (simulation)."); }
  }

  function updateUserUI(){
    if(state.user) $('#btn-signin').innerText = `${state.user.firstname}`;
    updateBooksUI();
  }

  // Modal helper
  function toggleModal(selector, hide=true){
    const el = document.querySelector(selector);
    if(!el) return;
    if(hide) el.classList.add('hidden'); else el.classList.remove('hidden');
  }

  // --- Tutorial logic (step-by-step with positions)
  const TUTOR_STEPS = [
    {titleKey:'pingouin', textKey:'tutorialText', target: '#search-input'},
    {titleKey:'pingouin', textKey:'tutorialText', target: '[data-section="courses"]'},
    {titleKey:'pingouin', textKey:'tutorialText', target: '[data-section="quiz"]'},
    {titleKey:'pingouin', textKey:'tutorialText', target: '[data-section="progress"]'},
    {titleKey:'pingouin', textKey:'tutorialText', target: '[data-section="account"]'}
  ];
  let tutIndex = 0;
  function startTutorial(){
    tutIndex = 0;
    $('#overlay').classList.remove('hidden');
    $('#tutorial-card').style.transform = 'translateY(0)';
    updateTutCard();
  }
  function updateTutCard(){
    const t = TUTOR_STEPS[tutIndex];
    $('#tut-title').innerText = I18N[state.lang][t.titleKey] || I18N.fr.pingouin;
    $('#tut-text').innerText = I18N[state.lang][t.textKey] || I18N.fr.tutorialText;
    // highlight target
    $all('.highlight').forEach(x => x.classList.remove('highlight'));
    try { const target = document.querySelector(t.target); if(target) target.classList.add('highlight'); }
    catch(e){}
  }
  function tutNext(){
    tutIndex++;
    if(tutIndex >= TUTOR_STEPS.length){ endTutorial(); return; }
    updateTutCard();
  }
  function tutPrev(){
    tutIndex = Math.max(0, tutIndex-1);
    updateTutCard();
  }
  function endTutorial(){
    $('#overlay').classList.add('hidden');
    $all('.highlight').forEach(x => x.classList.remove('highlight'));
    alert("Tutoriel terminé — bon apprentissage !");
  }

  // --- Quiz (demo)
  const QUIZ_ITEMS = [
    {q:"Combien font 7 × 8 ?", answers:["54","56","63","49"], a:1},
    {q:"Traduction FR→EN: 'chien' ?", answers:["cat","dog","horse","bird"], a:1},
    {q:"Quelle est la capitale de la France ?", answers:["Lyon","Lille","Paris","Nice"], a:2}
  ];
  function initQuiz(){
    state.quiz = {score:0,current:0,correct:0};
    saveToStorage();
    showQuizItem();
  }
  function showQuizItem(){
    const item = QUIZ_ITEMS[state.quiz.current % QUIZ_ITEMS.length];
    $('#quiz-question').innerText = item.q;
    const answers = $('#quiz-answers'); answers.innerHTML = '';
    item.answers.forEach((ans,i) => {
      const b = document.createElement('button'); b.className='tool'; b.innerText = ans;
      b.addEventListener('click', ()=> handleAnswer(i));
      answers.appendChild(b);
    });
    $('#quiz-score').innerText = `Score: ${state.quiz.score}`;
  }
  function handleAnswer(i){
    const item = QUIZ_ITEMS[state.quiz.current % QUIZ_ITEMS.length];
    if(i === item.a){
      state.quiz.score += 10;
      state.quiz.correct++;
      state.correctInARow++;
      if(state.correctInARow % 10 === 0){
        state.books = (state.books || 0) + 1;
        notifyBookEarned();
      }
    } else {
      state.correctInARow = 0;
    }
    state.quiz.current++;
    saveToStorage();
    renderProgress();
    showQuizItem();
  }
  function nextQuiz(){ showQuizItem(); }

  // --- Books / levels
  function updateBooksUI(){
    $('#books-display').innerText = `${state.books || 0} 📚`;
    const rank = rankFromBooks(state.books || 0);
    $('#rank-display').innerText = `Niveau : ${rank}`;
    // visual
    const container = $('#books-visual'); if(!container) return;
    container.innerHTML = '';
    for(let i=0;i<(state.books||0);i++){
      const b = document.createElement('div'); b.className='book'; b.innerText = i+1;
      container.appendChild(b);
    }
  }
  function notifyBookEarned(){
    alert('Bravo ! Vous avez gagné un livre 📚');
    updateBooksUI();
    saveToStorage();
  }
  function rankFromBooks(n){
    if(n>=15) return 'Maître';
    if(n>=9) return 'Expert';
    if(n>=7) return 'Compétent';
    if(n>=5) return 'Apprenti';
    return 'Débutant';
  }

  // --- Progress log & render
  function renderProgress(){
    updateBooksUI();
    const log = $('#progress-log'); if(!log) return;
    log.innerHTML = `<li>Livres : ${state.books || 0}</li><li>Correct consécutifs : ${state.correctInARow}</li>`;
  }

  // --- Search functions
  function doQuickSearch(){
    const q = $('#search-input').value.trim();
    performSearch(q);
    showSection('section-search');
  }
  function performSearch(query){
    const resultsCont = $('#search-results');
    resultsCont.innerHTML = '';
    if(!query){ resultsCont.innerHTML = `<div class="card">Tapez un mot-clé pour lancer la recherche.</div>`; return; }
    // search sampleItems
    const items = sampleItems().filter(it => (it.title+it.content).toLowerCase().includes(query.toLowerCase()));
    if(items.length===0){ resultsCont.innerHTML = `<div class="card">Aucun résultat</div>`; return; }
    items.forEach(it => {
      const card = document.createElement('div'); card.className='card';
      card.innerHTML = `<h4>${it.title}</h4><small>${it.matiere} • ${it.type}</small><p>${it.content}</p>`;
      resultsCont.appendChild(card);
    });
  }

  // --- Export fiche (print)
  function exportSampleFiche(){
    const content = `<h1>Fiche d'exemple</h1><p>Contenu: notions importantes...</p>`;
    const w = window.open('','_blank');
    w.document.write(`<html><head><title>Fiche</title></head><body>${content}</body></html>`);
    w.print();
  }

  // --- Account save / delete
  function saveAccount(){
    const last = $('#acc-lastname').value.trim();
    const first = $('#acc-firstname').value.trim();
    const email = $('#acc-email').value.trim();
    const pass = $('#acc-pass').value;
    const dob = $('#acc-dob').value;
    const lang = $('#acc-lang').value;
    const theme = $('#acc-theme').value;
    if(!email || !last || !first || !dob){ alert('Remplissez les champs requis'); return; }
    state.user = {lastname:last, firstname:first, email, dob};
    state.lang = lang; document.body.className = theme==='dark' ? 'theme-dark' : 'theme-light';
    saveToStorage();
    updateUserUI();
    alert('Compte sauvegardé.');
  }
  function deleteAccount(){
    if(!confirm('Confirmer suppression du compte et des données locales ?')) return;
    state.user = null; state.books = 0; state.quiz = {score:0,current:0,correct:0};
    localStorage.removeItem(STORAGE_KEY);
    alert('Compte supprimé (local).');
    location.reload();
  }

  // --- Utility: apply interface language
  function applyLang(){
    document.getElementById('welcome-title').innerText = I18N[state.lang]?.welcome || I18N.fr.welcome;
    document.getElementById('tut-title').innerText = I18N[state.lang]?.pingouin || I18N.fr.pingouin;
    document.getElementById('tut-text').innerText = I18N[state.lang]?.tutorialText || I18N.fr.tutorialText;
    // set selects
    $('#acc-lang').value = state.lang;
  }

  // kick off
  init();

  // expose for debugging on the page (safe)
  window.MMA = {state, saveToStorage};
})();
