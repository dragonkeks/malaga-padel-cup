import { firebaseConfig, ADMIN_UID, configured } from './firebase-config.js';
import { MODES, FORMATS, isTeamMode, shuffle, buildInitialMatches, buildMexicanoRound, checkScore, nextPhase, canComplete, teamStandings, individualStandings, finishRanks, globalStandings, tournamentProgress, validateTournament, formatScore, makeStandaloneMatch } from './core.mjs';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const niceDate=s=>s?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(s)):'Noch offen';
const localDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const showDate=s=>s?niceDate(s):'Noch nicht terminiert';
const state={players:[],tournaments:[],matches:[],page:'home',filter:'all',scheduleFilter:'all',adminPanel:'tournaments',user:null,demo:!configured,draft:null,loading:configured,claims:[]};
let fb={};let unsubscribeClaims=()=>{};
const player=id=>state.players.find(p=>p.id===id);
const tour=id=>state.tournaments.find(t=>t.id===id);
const tMatches=t=>state.matches.filter(m=>m.tournamentId===t.id).sort((a,b)=>a.order-b.order||a.round-b.round);
const name=id=>player(id)?.name||'Unbekannt';
const myPlayer=()=>state.players.find(p=>p.authUid&&p.authUid===state.user?.uid);
const isAdmin=()=>state.demo || (Boolean(state.user)&&ADMIN_UID!=='HIER_ADMIN_UID'&&state.user.uid===ADMIN_UID);
const myMatch=m=>(m.playerIds||[]).includes(myPlayer()?.id);
const formatFor=m=>tour(m.tournamentId)?.format||m.format||'eight';
const isCompleted=t=>t.status==='completed'||canComplete(t,state.matches);
const eligibleSchedule=m=>m.status==='pending'&&Boolean(tour(m.tournamentId)?.selfSchedule??m.selfSchedule)&&Boolean(myPlayer())&&myMatch(m);
const eligibleScore=m=>m.status==='pending'&&Boolean(tour(m.tournamentId)?.selfScore??m.selfScore)&&Boolean(myPlayer())&&myMatch(m);
const matchTitle=m=>tour(m.tournamentId)?.name||'Freies Spiel';
const syntheticEmail=id=>`spieler-${id.replace(/[^a-z0-9-]/gi,'')}@${firebaseConfig.projectId}.firebaseapp.com`;
const hasMyClaim=()=>state.claims.find(c=>c.id===state.user?.uid);

const sortedTours=()=>[...state.tournaments].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
const completion=t=>{const p=tournamentProgress(t,state.matches);return p.total?Math.round(p.done/p.total*100):0;};

function toast(message,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=message;$('#toast-container').appendChild(el);setTimeout(()=>el.remove(),4500);}
function explainErr(error){const s=String(error?.message||error);return s.includes('permission-denied')?'Zugriff verweigert. Bitte die neuen Firestore-Regeln, deine Freigabe und die Admin-UID prüfen.':s.includes('auth/invalid-credential')?'Anmeldedaten stimmen nicht.':s.includes('auth/email-already-in-use')?'Für diesen Spielernamen existiert schon ein Konto. Bitte anmelden oder die Turnierleitung kontaktieren.':s.includes('auth/weak-password')?'Bitte ein stärkeres Passwort (mindestens 6 Zeichen) wählen.':s.includes('auth/operation-not-allowed')?'E-Mail/Passwort in Firebase Authentication aktivieren.':s;}
function fail(err){console.error(err);toast(explainErr(err),true);}
function modal(content){$('#modal-root').innerHTML=`<div class="modal-cover" id="modal-cover"><section class="modal" role="dialog" aria-modal="true">${content}</section></div>`;}
function closeModal(){$('#modal-root').innerHTML='';}
const modalTitle=title=>`<div class="modal-head"><h2>${esc(title)}</h2><button class="close-btn" type="button" data-action="close-modal" aria-label="Schließen">×</button></div>`;
function empty(title,desc){return `<div class="section-blank"><div class="emoji">🎾</div><h3>${esc(title)}</h3><p>${esc(desc)}</p></div>`;}
const icon=(n)=>({home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',schedule:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h2M14 14h2M8 18h2"/>',table:'<path d="M4 4h16M4 10h16M4 16h16M4 22h16M8 4v18M16 4v18"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0V4ZM7 6H4v3a4 4 0 0 0 4 4M17 6h3v3a4 4 0 0 1-4 4"/>',admin:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2M2 21h20"/>',edit:'<path d="M4 20h4L20 8l-4-4L4 16v4z"/>'})[n]||'';
const svgIcon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icon(name)}</svg>`;

function render(){
  const page=({home:renderHome,schedule:renderSchedule,standings:renderStandings,overall:renderOverall,profile:renderProfile,admin:renderAdmin})[state.page]||renderHome;
  $('#app').innerHTML=`
    <header class="topbar"><div class="bar-inner">
      <div class="brand"><img class="brand-logo" src="./logo.svg" alt="Málaga Padel Cup Logo"><div><div class="brand-title condensed">MÁLAGA PADEL CUP</div><div class="brand-small">${state.demo?'Lokale Testversion · ohne Cloud':`${state.tournaments.length} Turnier${state.tournaments.length===1?'':'e'} · Live-Ergebnisse`}</div></div></div>
      <div class="bar-actions">${state.demo?'<span class="pill mode-demo">DEMO</span>':'<span class="pill pill-live"><span class="live-dot"></span> LIVE</span>'}
      <button type="button" class="btn btn-light btn-sm" data-action="auth">${state.demo?'Demo-Admin':state.user?(isAdmin()?'Admin ✓':esc(myPlayer()?.name||'Konto')):'Anmelden'}</button></div>
    </div></header>
    <main class="wrap page">${state.demo?'<div class="alert"><strong>DEMO-MODUS:</strong> Du kannst alles ausprobieren. Änderungen werden nur in diesem Browser gespeichert. Für gemeinsame Live-Daten Firebase einrichten (siehe ANLEITUNG.md).</div>':''}${state.loading?empty('Live-Daten werden geladen','Verbindung mit der Datenbank wird aufgebaut.') : page()}</main>
    <nav class="mobile-nav" aria-label="Hauptnavigation">${[['home','Übersicht','home'],['schedule','Spielplan','schedule'],['standings','Tabellen','table'],['overall','Gesamt','trophy'],['profile','Mein Bereich','admin'],['admin','Admin','edit']].map(([id,label,ic])=>`<button type="button" class="navbtn ${state.page===id?'active':''}" data-action="navigate" data-page="${id}" aria-current="${state.page===id?'page':'false'}">${svgIcon(ic)}<span>${label}</span></button>`).join('')}</nav>`;
}
function navigate(page){state.page=page;render();window.scrollTo({top:0,behavior:'smooth'});}
function statusPill(m){return `<span class="badge ${m.status==='done'?'done':'wait'}">${m.status==='done'?'Abgeschlossen':m.scheduledAt?'Geplant':'Offen'}</span>`;}
function sideNames(m,side){const t=tour(m.tournamentId),ids=m[side==='A'?'sideA':'sideB'];if(isTeamMode(t?.mode)){const tt=t.teams.find(x=>x.id===m[side==='A'?'teamAId':'teamBId']);return tt?.name||ids.map(name).join(' / ');}return ids.map(name).join(' / ');}
function scoreOf(m,side){return m.status==='done'?(formatFor(m)==='sets'?(m.sets||[]).reduce((v,s)=>v+(side==='A'?(s.a>s.b?1:0):(s.b>s.a?1:0)),0):m[side==='A'?'scoreA':'scoreB']):'–';}
function matchCard(m){const mayEdit=isAdmin()||eligibleScore(m),maySchedule=isAdmin()||eligibleSchedule(m);
  return `<article class="match-card ${m.status==='done'?'done':m.scheduledAt?'live':''}">
    <div class="card-top"><span class="court-tag">${esc(m.court||'COURT –')}</span>${statusPill(m)}</div>
    <div class="card-stage">${esc(m.label||matchTitle(m))}</div>
    <div class="team-line"><span class="team-name ${m.winner==='A'?'win':''}">${esc(sideNames(m,'A'))}</span><span class="team-score">${scoreOf(m,'A')}</span></div>
    <div class="team-line"><span class="team-name ${m.winner==='B'?'win':''}">${esc(sideNames(m,'B'))}</span><span class="team-score">${scoreOf(m,'B')}</span></div>
    ${formatFor(m)==='sets'&&m.status==='done'?`<div class="small muted">Sätze: ${esc(formatScore(m,{format:formatFor(m)}))}</div>`:''}
    <div class="match-footer"><span class="match-meta">${esc(m.scheduledAt?showDate(m.scheduledAt):matchTitle(m))}</span>
      <span class="list-row-actions">${maySchedule?`<button class="text-btn" data-action="schedule-match" data-id="${esc(m.id)}" type="button">Termin</button>`:''}${mayEdit?`<button class="text-btn" data-action="score" data-id="${esc(m.id)}" type="button">${isAdmin()?'Ergebnis':'Ergebnis melden'}</button>`:''}</span></div>
  </article>`;
}
function renderHome(){const tours=sortedTours();const active=tours.find(t=>!isCompleted(t))||tours[0];const allDone=state.matches.filter(m=>m.status==='done').length;
  if(!tours.length)return `<section class="hero"><div class="hero-head"><div class="eyebrow">DEIN PADEL-EVENT</div><h1>READY TO PLAY?</h1></div><div class="hero-body"><div><div class="hero-status">TURNIER STARTEN</div><div class="muted">Lege deine Spieler und dein erstes Turnier an oder spiele freie Doppel.</div></div><div class="stat-big">🎾</div></div><div class="hero-bottom"><button class="btn btn-lime btn-wide" data-action="navigate" data-page="admin">ZUR TURNIERLEITUNG</button></div></section>${state.matches.length?`<div class="section-title"><h2>FREIE MATCHES</h2></div><div class="match-grid">${state.matches.map(matchCard).join('')}</div>${leaderboardTable(globalStandings(state.players,state.tournaments,state.matches).slice(0,5),true)}`:''}`;
  const progress=tournamentProgress(active,state.matches);let cards=state.matches.filter(m=>m.status==='pending'&&m.scheduledAt).sort((a,b)=>a.scheduledAt.localeCompare(b.scheduledAt)).slice(0,3);
  if(!cards.length)cards=state.matches.filter(m=>m.status==='pending').slice(0,3);
  if(!cards.length)cards=state.matches.filter(m=>m.status==='done').slice(-3).reverse();
  const overall=globalStandings(state.players,state.tournaments,state.matches).filter(r=>r.total>0);
  return `<section class="hero"><div class="hero-head"><div class="eyebrow">${esc(active.name)} · ${esc(MODES[active.mode])}</div><h1>PADEL-TURNIER<br>IN MÁLAGA</h1></div><div class="hero-body"><div><div class="eyebrow">AKTUELL</div><div class="hero-status">${isCompleted(active)?'TURNIER BEENDET':'TURNIER LÄUFT'}</div><div class="muted">${isCompleted(active)?'Alle Ergebnisse bestätigt':`${progress.done} von ${progress.total} Matches abgeschlossen`}</div></div><div style="text-align:right"><div class="eyebrow">MATCHES</div><div class="stat-big">${progress.done}<span style="font-size:24px;color:#c6d7e9">/${progress.total}</span></div></div></div><div class="hero-bottom"><div class="progress"><span style="width:${completion(active)}%"></span></div><button class="btn btn-lime btn-wide" type="button" data-action="navigate" data-page="standings">ZUR LIVE-TABELLE</button></div></section>
  <div class="top-panes"><div class="stat-card"><div><div class="small muted">Turniere</div><strong>${tours.length}</strong></div><span>🏆</span></div><div class="stat-card"><div><div class="small muted">Spieler</div><strong>${state.players.length}</strong></div><span>👥</span></div><div class="stat-card"><div><div class="small muted">Ergebnisse</div><strong>${allDone}</strong></div><span>✅</span></div></div>
  <div class="section-title"><h2>COURTS · LIVE MATCHES</h2><span class="section-note">${cards.some(m=>m.scheduledAt)?'Nächste Ansetzungen':'Aktuelle Paarungen'}</span></div>
  ${cards.length?`<div class="match-grid">${cards.map(matchCard).join('')}</div>`:empty('Noch keine Matches','Erstelle dein erstes Turnier.')}
  <div class="section-title"><h2>ALLE TURNIERE</h2><button class="text-btn" data-action="navigate" data-page="standings">Tabellen ansehen ›</button></div><div class="tile-grid">${tours.map(renderTourTile).join('')}</div>
  ${overall.length?`<div class="section-title"><h2>GESAMTWERTUNG</h2><button class="text-btn" data-action="navigate" data-page="overall">Alle Platzierungen ›</button></div>${leaderboardTable(overall.slice(0,5),true)}`:''}`;
}
function renderTourTile(t){const p=tournamentProgress(t,state.matches);return `<article class="tile"><div class="subheading">${isCompleted(t)?'ABGESCHLOSSEN':'AKTIV · LIVE'}</div><h3>${esc(t.name)}</h3><div class="small muted">${esc(MODES[t.mode])}</div><div class="chip-row"><span class="chip">${t.participantIds.length} Spieler</span><span class="chip">${esc(FORMATS[t.format])}</span>${t.selfSchedule?'<span class="chip">Selbstterminierung</span>':''}</div><div class="tile-bottom"><div><strong>${p.done}/${p.total}</strong> <span class="muted small">Matches</span></div><button class="btn btn-outline btn-sm" data-action="show-table" data-id="${esc(t.id)}">Tabelle ansehen</button></div></article>`;}
function renderSchedule(){const m=state.matches.filter(x=>state.scheduleFilter==='all'||(state.scheduleFilter==='friendly'?!x.tournamentId:x.tournamentId===state.scheduleFilter)).sort((a,b)=>{const dateA=a.scheduledAt||'9999',dateB=b.scheduledAt||'9999';return dateA.localeCompare(dateB)||a.order-b.order;});
  return `<div class="page-heading"><div><h1>SPIELPLAN</h1><p>Alle Spiele, Courts und Anstoßzeiten auf einen Blick.</p></div>${isAdmin()?'<button class="btn btn-blue" data-action="auto-schedule">Zeitplan erstellen</button>':''}</div>${renderTourFilters(state.scheduleFilter,'schedule-filter',true,true)}
  ${m.length?`<div class="match-grid">${m.map(matchCard).join('')}</div>`:empty('Keine Spiele vorhanden','Erstelle in der Administration ein Turnier.')}`;
}
function renderTourFilters(selected,action,withAll=true,withFriendlies=false){return `<div class="filters">${withAll?`<button class="filter-btn ${selected==='all'?'active':''}" data-action="${action}" data-id="all">Alle Spiele</button>`:''}${withFriendlies?`<button class="filter-btn ${selected==='friendly'?'active':''}" data-action="${action}" data-id="friendly">Freie Spiele</button>`:''}${sortedTours().map(t=>`<button class="filter-btn ${selected===t.id?'active':''}" data-action="${action}" data-id="${esc(t.id)}">${esc(t.name)}</button>`).join('')}</div>`;}
function renderStandings(){const tours=sortedTours();const id=tour(state.filter)?.id||tours[0]?.id;const t=tour(id);
  if(!t)return `<div class="page-heading"><h1>LIVE-TABELLEN</h1></div>${empty('Noch keine Turniere','Die Ranglisten erscheinen nach dem Erstellen.')}`;
  const matches=tMatches(t),prog=tournamentProgress(t,state.matches);
  return `<div class="page-heading"><div><h1>LIVE-TABELLEN</h1><p>Tabellen, Platzierungen und Turnierfortschritt.</p></div><span class="pill" style="background:#dfeafa;color:#295682">${prog.done}/${prog.total} Matches</span></div>${renderTourFilters(t.id,'table-filter',false)}
    <div class="tile" style="margin-bottom:17px"><div class="subheading">${esc(MODES[t.mode])}</div><h2 style="margin:8px 0">${esc(t.name)}</h2><div class="chip-row"><span class="chip">${esc(FORMATS[t.format])}</span><span class="chip">${t.participantIds.length} Spieler</span><span class="chip">${isCompleted(t)?'Endstand':'Zwischenstand'}</span></div></div>
    ${isTeamMode(t.mode)?renderTeamStandings(t,matches):renderIndividualStandings(t,matches)}
    <div class="section-title"><h2>SPIELE & PLATZIERUNGEN</h2><span class="section-note">Alle Spielphasen</span></div>
    <div class="match-grid">${matches.map(matchCard).join('')}</div>`;
}
function renderTeamStandings(t,m){let html='';
  if(t.mode==='groups'){
    for(const group of ['A','B']){const teams=t.teams.filter((_,i)=>i%2===(group==='A'?0:1));const rows=teamStandings(teams,m.filter(x=>x.group===group&&x.phase==='groups'));html+=`<div class="section-title"><h2>GRUPPE ${group}</h2></div>${teamTable(rows)}`;}
  } else {const rows=teamStandings(t.teams,m.filter(x=>x.phase==='league'));html+=`<div class="section-title"><h2>VORRUNDE</h2></div>${teamTable(rows)}`;}
  const rankings=isCompleted(t)?finishRanks(t,m):[];
  if(rankings.length){const teamRanks=t.teams.map(tt=>({name:tt.name,rank:rankings.find(r=>tt.playerIds.includes(r.id))?.rank})).filter(x=>x.rank).sort((a,b)=>a.rank-b.rank);
    html+=`<div class="section-title"><h2>ENDPLATZIERUNGEN</h2></div><div class="table-wrap"><table><thead><tr><th>Platz</th><th>Team</th></tr></thead><tbody>${teamRanks.map(x=>`<tr><td class="rank">${x.rank}.</td><td><strong>${esc(x.name)}</strong></td></tr>`).join('')}</tbody></table></div>`;}
  return html;
}
function teamTable(rows){return `<div class="table-wrap"><table><thead><tr><th>Pl.</th><th>Team</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>Gew. Bälle/Games</th><th>Verl.</th><th>Diff.</th><th>Pkt.</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i===0?'tr-top':''}"><td class="rank">${i+1}.</td><td><strong>${esc(r.name)}</strong><div class="small muted">${r.playerIds.map(name).map(esc).join(' · ')}</div></td><td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td><td>${r.for}</td><td>${r.against}</td><td>${r.diff>0?'+':''}${r.diff}</td><td class="metric">${r.points}</td></tr>`).join('')}</tbody></table></div>`;}
function renderIndividualStandings(t,m){const rows=individualStandings(t,m);return `<div class="section-title"><h2>${isCompleted(t)?'ENDSTAND':'EINZELRANGLISTE'}</h2><span class="section-note">${t.mode==='americano'?'Partner wechseln jede Runde':'Gegner nach Tabellenstand'}</span></div><div class="table-wrap"><table><thead><tr><th>Pl.</th><th>Spieler</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>Gew. Bälle/Games</th><th>Verl.</th><th>Diff.</th><th>Match-Pkt.</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i===0?'tr-top':''}"><td class="rank">${r.rank}.</td><td><strong>${esc(name(r.id))}</strong></td><td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td><td>${r.balls}</td><td>${r.against}</td><td>${r.diff>0?'+':''}${r.diff}</td><td class="metric">${r.points}</td></tr>`).join('')}</tbody></table></div>`;}
function leaderboardTable(rows,compact=false){return `<div class="table-wrap"><table><thead><tr><th>Pl.</th><th>Spieler</th><th>Sp.</th><th>S</th><th>U</th><th>N</th><th>Gew.</th><th>Diff.</th><th>Match-Pkt.</th><th>Turnier-Bonus</th><th>Turniere</th><th>Gesamt</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i===0?'tr-top':''}"><td class="rank">${i+1}.</td><td><strong>${esc(r.name)}</strong>${!compact&&r.results.length?`<div class="small muted">${r.results.map(x=>`${esc(x.name)}: ${x.rank}. Platz (+${x.points})`).join(' · ')}</div>`:''}</td><td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td><td>${r.for}</td><td>${r.diff>0?'+':''}${r.diff}</td><td>${r.matchPoints}</td><td>${r.bonusPoints}</td><td>${r.appearances}</td><td class="metric">${r.total}</td></tr>`).join('')}</tbody></table></div>`;}

function renderOverall(){const standings=globalStandings(state.players,state.tournaments,state.matches);const finished=state.tournaments.filter(isCompleted).length;
  return `<div class="page-heading"><div><h1>GESAMTWERTUNG</h1><p>Matchpunkte und Turnierplatzierungen – für alle Spieler.</p></div><span class="pill" style="background:#dfeafa;color:#245b88">${finished} gewertete Turniere</span></div>
  <div class="info"><strong>Wertung:</strong> Jedes beendete Match bringt jedem Spieler des Siegerteams 2 Punkte, bei Unentschieden beiden Seiten je 1 Punkt (Niederlage 0). Das gilt auch für freie Spiele. Bei abgeschlossenem Turnier gibt es <strong>zusätzlich</strong> einen Platzierungsbonus zwischen dem pro Turnier eingestellten Mindest- und Höchstwert (Standard 30–100). Gesamt = Matchpunkte + Turnierbonus. Mehr gespielte Matches wirken sich auf die Gesamtsumme aus.</div>
  ${standings.some(r=>r.played||r.appearances)?leaderboardTable(standings):empty('Noch keine Gesamtpunkte','Nach dem ersten gespielten Match erscheinen hier die Punkte.')}`;
}
function renderProfile(){if(!state.user&&!state.demo)return `<div class="page-heading"><h1>MEIN BEREICH</h1></div><div class="panel"><h3>Deine persönliche Spielübersicht</h3><p>Registriere dich mit deinem Spielernamen und Passwort oder melde dich an.</p><button class="btn btn-lime" data-action="auth">Anmelden / Registrieren</button></div>`;
  const p=myPlayer();if(!p&&!state.demo)return `<div class="page-heading"><h1>MEIN BEREICH</h1></div><div class="panel"><h3>Dein Konto ist noch nicht zugeordnet</h3><p>Deine Registrierung ist angekommen, sobald die Turnierleitung sie freigibt, wird dein Spielerprofil aktiviert. Du kannst die Spiele bis dahin unter „Spielplan“ ansehen.</p>${state.user?`<p class="small muted">Konto-UID: ${esc(state.user.uid)}</p>`:''}<button class="btn btn-outline" data-action="auth">Konto ansehen</button></div>`;
  const chosen=p||state.players[0];if(!chosen)return empty('Noch keine Spieler','Die Turnierleitung muss zunächst Spieler anlegen.');
  const games=state.matches.filter(m=>(m.playerIds||[]).includes(chosen.id));
  const coming=games.filter(m=>m.status==='pending').sort((a,b)=>(a.scheduledAt||'9999').localeCompare(b.scheduledAt||'9999')||a.order-b.order);
  const done=games.filter(m=>m.status==='done').sort((a,b)=>(b.scheduledAt||'').localeCompare(a.scheduledAt||''));
  const r=globalStandings(state.players,state.tournaments,state.matches).find(x=>x.id===chosen.id);
  return `<div class="page-heading"><div><h1>MEIN BEREICH</h1><p>${esc(chosen.name)} · Deine persönlichen Ergebnisse und nächsten Termine.</p></div></div>
    ${state.demo?'<div class="info">Demo-Vorschau: Hier wird beispielhaft der erste Spieler gezeigt. In Firebase sieht jeder nur sein eigenes Profil.</div>':''}
    <div class="top-panes profile-metrics"><div class="stat-card"><div><div class="small muted">Gesamtpunkte</div><strong>${r?.total||0}</strong></div><span>🏆</span></div><div class="stat-card"><div><div class="small muted">Matchsiege</div><strong>${r?.wins||0}</strong></div><span>🎾</span></div><div class="stat-card"><div><div class="small muted">Meine Spiele</div><strong>${games.length}</strong></div><span>📅</span></div></div>
    <div class="section-title"><h2>MEINE OFFENEN MATCHES</h2><span class="section-note">Nach Datum und Uhrzeit</span></div>${coming.length?`<div class="match-grid">${coming.map(matchCard).join('')}</div>`:empty('Keine offenen Matches','Du bist aktuell nicht für weitere Spiele eingeteilt.')}
    <div class="section-title"><h2>MEINE GESPIELTEN MATCHES</h2></div>${done.length?`<div class="match-grid">${done.map(matchCard).join('')}</div>`:empty('Noch keine Ergebnisse','Deine abgeschlossenen Partien erscheinen hier.')}
    <div class="section-title"><h2>TURNIERPLATZIERUNGEN</h2></div><div class="panel">${r?.results.length?r.results.map(x=>`<div class="list-row"><span>${esc(x.name)} · Platz ${x.rank}</span><strong>+${x.points} Bonus</strong></div>`).join(''):'Noch keine abgeschlossenen Turniere.'}</div>`;
}

function ensureDraft(){if(state.draft)return;state.draft={name:'Málaga Padel Cup',mode:'groups',format:'twentyfour',participantIds:state.players.slice(0,12).map(p=>p.id),randomTeams:true,teams:[],rounds:5,selfSchedule:false,selfScore:false,bonusFirst:100,bonusLast:30};syncDraftTeams();}
function syncDraftTeams(){const d=state.draft;if(!d)return;
  const count=Math.floor(d.participantIds.length/2),old=d.teams;
  d.teams=Array.from({length:count},(_,i)=>({name:old[i]?.name??`Team ${i+1}`,playerIds:[old[i]?.playerIds?.[0]||d.participantIds[2*i]||'',old[i]?.playerIds?.[1]||d.participantIds[2*i+1]||'']}));
  d.teams.forEach((tm,i)=>tm.playerIds=tm.playerIds.map((id,j)=>d.participantIds.includes(id)?id:(d.participantIds[i*2+j]||'')));
}
function renderAdmin(){if(!isAdmin())return `<div class="page-heading"><div><h1>TURNIERLEITUNG</h1><p>Der Admin-Bereich ist geschützt.</p></div></div><div class="panel" style="max-width:550px"><h3>Admin-Anmeldung</h3><p class="muted">Nur das in der Firebase-Konfiguration hinterlegte Admin-Konto darf Spieler verwalten, Turniere erstellen, Ergebnisse ändern oder Turniere löschen.</p><button class="btn btn-blue" data-action="auth">Mit E-Mail anmelden</button>${!configured?'<p class="small muted">Im Demo-Modus wird der Admin-Bereich ohne Anmeldung freigeschaltet.</p>':''}</div>`;
  ensureDraft();
  const tabs=[['tournaments','Turniere'],['players','Spieler & Zugänge'],['friendlies','Freies Spiel'],['create','Turnier erstellen']];
  return `<div class="page-heading"><div><h1>TURNIERLEITUNG</h1><p>Teams, Spielpläne, Ergebnisse und Zugänge verwalten.</p></div><button class="btn btn-outline btn-sm" data-action="export">Backup (JSON)</button></div>
  <div class="tabs">${tabs.map(([id,txt])=>`<button class="tab ${state.adminPanel===id?'active':''}" data-action="admin-panel" data-id="${id}">${txt}</button>`).join('')}</div>
  ${state.adminPanel==='create'?renderCreatePanel():state.adminPanel==='players'?renderPlayersPanel():state.adminPanel==='friendlies'?renderFriendliesPanel():renderTournamentPanel()}`;
}
function renderTournamentPanel(){const tours=sortedTours();return `<div class="admin-grid"><section class="panel admin-panel-full"><h3>Turniere verwalten</h3>${tours.length?`<div class="list-rows">${tours.map(t=>{
    const p=tournamentProgress(t,state.matches),canAdvance=(t.mode==='groups'&&['groups','semis'].includes(t.phase))||(t.mode==='league'&&t.phase==='league')||(t.mode==='mexicano'&&t.phase==='mexicano'&&Math.max(0,...tMatches(t).map(m=>m.round||0))<+t.rounds);
    return `<div class="list-row"><div><strong>${esc(t.name)}</strong><div class="detail">${esc(MODES[t.mode])} · ${p.done}/${p.total} Spiele · ${isCompleted(t)?'Beendet':esc(t.phase)}</div></div><div class="list-row-actions">${canAdvance?`<button class="btn btn-blue btn-sm" data-action="next-phase" data-id="${esc(t.id)}">Nächste Phase</button>`:''}<button class="btn btn-outline btn-sm" data-action="edit-tour" data-id="${esc(t.id)}">Bearbeiten</button><button class="btn btn-outline btn-sm" data-action="show-table" data-id="${esc(t.id)}">Tabelle</button><button class="btn btn-danger btn-sm" data-action="delete-tour" data-id="${esc(t.id)}">Löschen</button></div></div>`;}).join('')}</div>`:empty('Noch keine Turniere','Über „Turnier erstellen“ legst du dein erstes Event an.')}
    <div style="margin-top:16px"><button class="btn btn-lime" data-action="admin-panel" data-id="create">+ Neues Turnier</button> <button class="btn btn-outline" data-action="auto-schedule">Spielplan generieren</button></div>
    <hr class="subtle-hr"><p class="small muted"><strong>Turnierablauf:</strong> Im Modus „2 Gruppen + KO“ erzeugst du nach den Gruppenspielen Halbfinals und anschließend Finale/Spiel um Platz 3. In der Liga-Variante erzeugst du die Platzierungsspiele nach der Vorrunde. Im Mexicano erzeugt „Nächste Phase“ nach jeder fertigen Runde die Paarungen gemäß aktueller Rangliste.</p></section></div>`;}
function renderPlayersPanel(){return `<div class="admin-grid"><section class="panel"><h3>Spieler hinzufügen</h3><form id="player-add-form"><div class="field"><label for="playername">Spielername</label><input id="playername" name="playername" maxlength="65" placeholder="z. B. Max Muster" required></div><button class="btn btn-blue btn-wide" type="submit">+ Spieler hinzufügen</button></form><hr class="subtle-hr"><p class="small muted">Maximal 12 Personen pro Turnier. Die Spielerliste darf größer sein, wenn verschiedene Gruppen an unterschiedlichen Turnieren teilnehmen.</p><div class="info">Spieler registrieren sich über ihren Namen und ein Passwort. Du bestätigst die Anfrage unten. Erst danach dürfen sie freigegebene Termine und Ergebnisse bearbeiten. Bestehende E-Mail-Konten können weiterhin per UID verknüpft werden.</div></section>
  <section class="panel"><h3>Spielerliste (${state.players.length})</h3><div class="list-rows">${state.players.length?state.players.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(p=>`<div class="list-row"><div><strong>${esc(p.name)}</strong><div class="detail">${p.authUid?'🔗 Firebase-Konto verknüpft':'Kein Konto verknüpft'}</div></div><div class="list-row-actions"><button class="btn btn-outline btn-sm" data-action="edit-player" data-id="${esc(p.id)}">Bearbeiten</button><button class="btn btn-danger btn-sm" data-action="delete-player" data-id="${esc(p.id)}">×</button></div></div>`).join(''):'<div class="empty-small">Noch keine Spieler eingetragen.</div>'}</div></section>${renderClaimPanel()}</div>`;}
function renderCreatePanel(){const d=state.draft;const teamMode=isTeamMode(d.mode);
  const formatOptions=Object.entries(FORMATS).map(([id,title])=>`<option value="${id}" ${d.format===id?'selected':''}>${esc(title)}</option>`).join('');
  return `<div class="admin-grid"><section class="panel"><h3>1. Turnier konfigurieren</h3>
    <div class="field"><label>Turniername</label><input name="draft-name" maxlength="90" value="${esc(d.name)}" placeholder="z. B. Málaga Cup · Freitag"></div>
    <div class="field"><label>Turniermodus</label><select name="draft-mode">${Object.entries(MODES).map(([id,title])=>`<option value="${id}" ${d.mode===id?'selected':''}>${esc(title)}</option>`).join('')}</select></div>
    <div class="field"><label>Spiel- / Punktesystem</label><select name="draft-format">${formatOptions}</select><div class="field-help">Best of 3: Sätze bis 6, zwei Punkte Abstand, bei 6:6 Golden Point (7:6). Oder 8 bzw. 24 Bälle pro Match; bei Unentschieden ist ein zusätzlicher Golden Point möglich.</div></div>
    ${d.mode==='mexicano'?`<div class="field"><label>Mexicano-Runden (1–30)</label><input name="draft-rounds" type="number" min="1" max="30" value="${d.rounds}"></div>`:''}
    <label class="checkline"><input name="draft-random" type="checkbox" ${d.randomTeams?'checked':''}><span>${teamMode?'Teams automatisch zufällig mischen':'Startreihenfolge zufällig mischen'}</span></label>
    <label class="checkline" style="margin-top:8px"><input name="draft-self" type="checkbox" ${d.selfSchedule?'checked':''}><span>Spieler dürfen eigene Matches terminieren</span></label>
    <label class="checkline" style="margin-top:8px"><input name="draft-selfscore" type="checkbox" ${d.selfScore?'checked':''}><span>Spieler dürfen Ergebnisse ihrer offenen Matches eintragen</span></label>
    <div class="inline-fields" style="margin-top:14px"><div class="field"><label>Turnierbonus für 1. Platz</label><input type="number" name="draft-bonusfirst" min="0" max="1000" value="${d.bonusFirst}"></div><div class="field"><label>Turnierbonus für letzten Platz</label><input type="number" name="draft-bonuslast" min="0" max="1000" value="${d.bonusLast}"></div></div>
    <div class="field-help">Matchwertung: Sieg 2 Punkte, Unentschieden 1 Punkt, Niederlage 0. Die Platzierungsboni werden erst nach Turnierabschluss addiert. Spieler brauchen ein von dir bestätigtes Konto.</div>
    <div style="margin-top:20px"><button class="btn btn-lime btn-wide" data-action="create-tournament" type="button">TURNIER ERSTELLEN</button></div>
  </section><section class="panel"><h3>2. Teilnehmer auswählen</h3><p class="small muted">${d.participantIds.length} ausgewählt · maximal 12</p>
    <div class="checkbox-grid">${state.players.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(p=>`<label class="checkline"><input type="checkbox" name="participant" value="${esc(p.id)}" ${d.participantIds.includes(p.id)?'checked':''}><span>${esc(p.name)}</span></label>`).join('')}</div>
    ${!state.players.length?'<div class="alert">Füge zuerst im Tab „Spieler“ Teilnehmer hinzu.</div>':''}
    ${teamMode?`<h3>3. Zweierteams – manuell oder automatisch</h3>${d.randomTeams?'<div class="info">Die Teams werden beim Erstellen zufällig gebildet und mit Team 1, Team 2 usw. benannt. Du kannst die Namen anschließend über die Spieleranmeldung nicht ändern; nutze für individuelle Teamnamen die manuelle Zuteilung.</div>':renderTeamEditor(d)}`:`<div class="info">${d.mode==='americano'?'Jeder spielt genau einmal mit jedem anderen Spieler im Team.':`Pro Runde werden nach aktueller Tabellenplatzierung 1 + 4 gegen 2 + 3, 5 + 8 gegen 6 + 7 usw. angesetzt.`}</div>`}
    ${d.mode==='groups'&&!([8,12].includes(d.participantIds.length))?'<div class="alert">Zwei-Gruppen-Modus: bitte genau 8 oder 12 Spieler wählen.</div>':''}
    </section></div>`;
}
function renderTeamEditor(d){return d.teams.map((team,i)=>`<div class="team-editor"><div class="team-editor-row"><input aria-label="Name Team ${i+1}" placeholder="Teamname" data-team-name="${i}" value="${esc(team.name)}">${[0,1].map(j=>`<select aria-label="Spieler ${j+1} für Team ${i+1}" data-team-player="${i}" data-slot="${j}"><option value="">Spieler wählen …</option>${d.participantIds.map(id=>`<option value="${esc(id)}" ${team.playerIds[j]===id?'selected':''}>${esc(name(id))}</option>`).join('')}</select>`).join('')}</div></div>`).join('');}

function openAuth(){if(state.demo){modal(`${modalTitle('Demo-Modus')}<p>Im Demo-Modus kannst du alle Verwaltungs- und Tabellenfunktionen testen. Personenbezogene Anmeldung ist erst mit eingerichtetem Firebase möglich.</p><button class="btn btn-blue" data-action="close-modal">Schließen</button>`);return;}
  if(state.user){const p=myPlayer();modal(`${modalTitle('Dein Konto')}<p><strong>${esc(p?.name||(isAdmin()?'Turnierleitung':'Konto noch nicht zugeordnet'))}</strong></p><p class="small muted">${isAdmin()?'Du bist als Turnierleitung angemeldet.':p?'Dein Profil ist freigeschaltet.':'Bitte warte auf die Bestätigung durch die Turnierleitung.'}</p><div class="field"><label>Konto-UID (für manuellen Support)</label><input readonly value="${esc(state.user.uid)}"></div><div class="modal-actions"><button class="btn btn-outline" data-action="copy-uid">UID kopieren</button><button class="btn btn-danger" data-action="logout">Abmelden</button></div>`);return;}
  const options=state.players.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
  modal(`${modalTitle('Anmelden / Registrieren')}<div class="info">Für Spieler genügt der Name aus der Teilnehmerliste und ein Passwort. Die Turnierleitung muss neue Konten einmalig freigeben. Wenn du das Admin-Konto verwenden möchtest, nutze die E-Mail-Anmeldung unten.</div>
  <form id="player-auth-form"><div class="field"><label>Dein Name</label><select name="playerId" required><option value="">Spieler auswählen …</option>${options}</select></div><div class="field"><label>Passwort (mindestens 6 Zeichen)</label><input name="password" type="password" required minlength="6" autocomplete="current-password"></div><div class="modal-actions"><button class="btn btn-outline" name="operation" type="submit" value="register">Registrieren</button><button class="btn btn-blue" name="operation" type="submit" value="login">Als Spieler anmelden</button></div></form>
  <hr class="subtle-hr"><details><summary>Admin oder bestehendes Konto mit E-Mail anmelden</summary><form id="auth-form"><div class="field"><label>E-Mail-Adresse</label><input name="email" type="email" required autocomplete="email"></div><div class="field"><label>Passwort</label><input name="password" type="password" required autocomplete="current-password"></div><button class="btn btn-blue" type="submit">Admin anmelden</button></form></details>
  <p class="field-help">Spielerkonten ohne E-Mail können ihr Passwort nicht selbst zurücksetzen. Bei vergessenem Passwort muss die Turnierleitung das Konto in Firebase Authentication zurücksetzen/löschen und die Verknüpfung lösen.</p>`);
}
function renderClaimPanel(){return `<section class="panel admin-panel-full"><h3>Registrierungsanfragen (${state.claims.filter(c=>!c.approved).length})</h3><p class="small muted">Bestätige nur Konten, die du den richtigen Spielern zuordnen kannst. Registrierte Namen allein sind kein Identitätsnachweis.</p>${state.claims.filter(c=>!c.approved).length?state.claims.filter(c=>!c.approved).map(c=>`<div class="list-row"><div><strong>${esc(name(c.playerId))}</strong><div class="detail">UID: ${esc(c.id)}</div></div><button class="btn btn-blue btn-sm" data-action="approve-claim" data-id="${esc(c.id)}">Freigeben</button></div>`).join(''):'<div class="small muted">Keine offenen Anfragen.</div>'}</section>`;}
function renderFriendliesPanel(){const choices=state.players.slice().sort((a,b)=>a.name.localeCompare(b.name,'de')).map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');return `<div class="admin-grid"><section class="panel"><h3>Freies Doppel anlegen</h3><p class="small muted">Ein freies Spiel zählt mit 2/1/0 Matchpunkten in die Gesamttabelle, ohne Turnierbonus.</p><form id="friendly-form"><div class="field"><label>Bezeichnung</label><input name="label" maxlength="90" value="Freies Doppel" required></div><div class="field"><label>Spielsystem</label><select name="format">${Object.entries(FORMATS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join('')}</select></div><h3>Team A</h3><div class="inline-fields">${[0,1].map(i=>`<div class="field"><label>Spieler ${i+1}</label><select name="a${i}" required><option value="">Wählen</option>${choices}</select></div>`).join('')}</div><h3>Team B</h3><div class="inline-fields">${[0,1].map(i=>`<div class="field"><label>Spieler ${i+3}</label><select name="b${i}" required><option value="">Wählen</option>${choices}</select></div>`).join('')}</div><div class="field"><label>Spieltermin (optional)</label><input type="datetime-local" name="scheduledAt"></div><div class="field"><label>Court (optional)</label><input name="court" maxlength="40" placeholder="z. B. D6"></div><label class="checkline"><input type="checkbox" name="selfSchedule">Spieler dürfen Termin bearbeiten</label><label class="checkline"><input type="checkbox" name="selfScore">Spieler dürfen Ergebnis eintragen</label><button class="btn btn-lime btn-wide" type="submit" style="margin-top:16px">Freies Spiel erstellen</button></form></section><section class="panel"><h3>Freie Spiele (${state.matches.filter(m=>!m.tournamentId).length})</h3><div class="list-rows">${state.matches.filter(m=>!m.tournamentId).map(m=>`<div class="list-row"><div><strong>${esc(m.label)}</strong><div class="detail">${esc(sideNames(m,'A'))} vs. ${esc(sideNames(m,'B'))} · ${esc(showDate(m.scheduledAt))}</div></div><div class="list-row-actions"><button class="btn btn-outline btn-sm" data-action="score" data-id="${esc(m.id)}">Ergebnis</button><button class="btn btn-danger btn-sm" data-action="delete-match" data-id="${esc(m.id)}">Löschen</button></div></div>`).join('')||'<p class="muted">Noch keine freien Spiele.</p>'}</div></section></div>`;}

function openTournamentEdit(id){
  const t=tour(id);if(!t)return;
  const locked=tMatches(t).some(m=>m.status==='done');
  modal(`${modalTitle('Turnier bearbeiten')}<form id="tournament-edit-form" data-id="${esc(t.id)}">
    <div class="field"><label>Turniername</label><input name="name" maxlength="90" required value="${esc(t.name)}"></div>
    <label class="checkline"><input name="selfSchedule" type="checkbox" ${t.selfSchedule?'checked':''}> <span>Spieler dürfen ihre Match-Termine selbst eintragen</span></label><label class="checkline"><input name="selfScore" type="checkbox" ${t.selfScore?'checked':''}> <span>Spieler dürfen Match-Ergebnisse melden</span></label><div class="inline-fields"><div class="field"><label>Bonus 1. Platz</label><input name="bonusFirst" type="number" value="${t.bonusFirst??100}" min="0" max="1000" required></div><div class="field"><label>Bonus letzter Platz</label><input name="bonusLast" type="number" value="${t.bonusLast??30}" min="0" max="1000" required></div></div>
    ${isTeamMode(t.mode)?`<h3 style="margin:20px 0 10px">Teams & Zuteilung</h3>
      ${locked?'<div class="alert">Es wurden bereits Ergebnisse eingetragen. Um diese nicht zu verfälschen, kannst du nur noch Teamnamen ändern. Spielerzuteilungen bleiben gesperrt.</div>':'<p class="small muted">Du kannst Spieler zwischen Zweierteams tauschen. Bereits festgelegte Spieltermine werden bei Änderungen der Zuteilung gelöscht.</p>'}
      ${t.teams.map((tm,i)=>`<div class="team-editor"><div class="team-editor-row"><input name="teamName-${i}" maxlength="65" required value="${esc(tm.name)}" placeholder="Teamname">${tm.playerIds.map((p,j)=>`<select name="teamPlayer-${i}-${j}" ${locked?'disabled':''}>${t.participantIds.map(pid=>`<option value="${esc(pid)}" ${pid===p?'selected':''}>${esc(name(pid))}</option>`).join('')}</select>`).join('')}</div></div>`).join('')}`:''}
    <div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Abbrechen</button><button class="btn btn-blue" type="submit">Änderungen speichern</button></div>
  </form>`);
}
async function saveTournamentEdit(form){
  if(!isAdmin())throw Error('Keine Admin-Berechtigung.');
  const t=tour(form.dataset.id);if(!t)throw Error('Turnier nicht gefunden.');
  const title=form.elements.name.value.trim();if(!title||title.length>90)throw Error('Turniername fehlt.');
  const ops=[];const updates={name:title,selfSchedule:form.elements.selfSchedule.checked,selfScore:form.elements.selfScore.checked,bonusFirst:Number(form.elements.bonusFirst.value),bonusLast:Number(form.elements.bonusLast.value)};if(!Number.isFinite(updates.bonusFirst)||!Number.isFinite(updates.bonusLast)||updates.bonusLast<0||updates.bonusFirst<updates.bonusLast||updates.bonusFirst>1000)throw Error('Ungültige Bonusgrenzen.');
  if(isTeamMode(t.mode)){
    const locked=tMatches(t).some(m=>m.status==='done');
    const teams=t.teams.map((old,i)=>({id:old.id,name:form.elements[`teamName-${i}`].value.trim(),playerIds:locked?[...old.playerIds]:old.playerIds.map((_,j)=>form.elements[`teamPlayer-${i}-${j}`].value)}));
    if(teams.some(tm=>!tm.name))throw Error('Bitte alle Teamnamen ausfüllen.');
    const ids=teams.flatMap(tm=>tm.playerIds);
    if(new Set(ids).size!==t.participantIds.length||ids.some(id=>!t.participantIds.includes(id)))throw Error('Jeder Spieler muss genau einem Team zugeordnet sein.');
    updates.teams=teams;
    if(!locked){
      const oldTeams=Object.fromEntries(t.teams.map(x=>[x.id,x]));const newTeams=Object.fromEntries(teams.map(x=>[x.id,x]));
      for(const match of tMatches(t)){
        if(!match.teamAId||!match.teamBId)continue;
        const a=newTeams[match.teamAId].playerIds,b=newTeams[match.teamBId].playerIds;
        const changed=JSON.stringify(a)!==JSON.stringify(oldTeams[match.teamAId].playerIds)||JSON.stringify(b)!==JSON.stringify(oldTeams[match.teamBId].playerIds);
        if(changed)ops.push({action:'update',collection:'matches',id:match.id,data:{sideA:a,sideB:b,playerIds:[...a,...b],scheduledAt:'',court:''}});
      }
    }
  }
  ops.unshift({action:'update',collection:'tournaments',id:t.id,data:updates});
  await mutate(ops);closeModal();toast('Turnierdaten aktualisiert.');
}
function openPlayerEdit(id){const p=player(id);if(!p)return;modal(`${modalTitle('Spieler bearbeiten')}<form id="player-edit-form" data-id="${esc(id)}"><div class="field"><label>Name</label><input name="name" maxlength="65" required value="${esc(p.name)}"></div><div class="field"><label>Firebase-Konto-UID des Spielers (optional)</label><input name="authUid" maxlength="130" value="${esc(p.authUid||'')}" placeholder="Hier die UID aus dem Spieler-Konto einfügen"><p class="field-help">Automatische Kontofreigabe erfolgt über „Registrierungsanfragen“. UID hier nur für bestehende E-Mail-Konten oder manuelle Korrekturen eintragen.</p></div><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Abbrechen</button><button type="submit" class="btn btn-blue">Speichern</button></div></form>`);}
function openScore(id){const m=state.matches.find(x=>x.id===id),t=tour(m?.tournamentId);if(!m)return;
  const format=formatFor(m);
  const labels=`<p class="small muted"><strong>${esc(sideNames(m,'A'))}</strong> gegen <strong>${esc(sideNames(m,'B'))}</strong></p>`;
  const fields=format==='sets'?`<p class="small muted">Trage 2 oder 3 Sätze ein. Möglich: 6:0 bis 6:4, 7:5 oder 7:6 (Golden Point).</p>${Array.from({length:3},(_,i)=>`<div class="set-grid"><div class="field"><label>${i+1}. Satz · ${esc(sideNames(m,'A'))}</label><input type="number" name="set-a-${i}" min="0" max="7" ${i<2?'required':''} value="${m.sets?.[i]?.a??''}"></div><div class="field"><label>${i+1}. Satz · ${esc(sideNames(m,'B'))}</label><input type="number" name="set-b-${i}" min="0" max="7" ${i<2?'required':''} value="${m.sets?.[i]?.b??''}"></div></div>`).join('')}`:`<p class="small muted">Insgesamt ${format==='eight'?'8':'24'} Bälle. Bei Gleichstand ist ein entscheidender Golden Point möglich.</p><div class="inline-fields"><div class="field"><label>${esc(sideNames(m,'A'))}</label><input type="number" name="score-a" min="0" step="1" required value="${m.scoreA??''}"></div><div class="field"><label>${esc(sideNames(m,'B'))}</label><input type="number" name="score-b" min="0" step="1" required value="${m.scoreB??''}"></div></div>`;
  const followUps=t&&((t.mode==='groups' && m.phase==='groups' && !['groups'].includes(t.phase)) ||
    (t.mode==='league' && m.phase==='league' && !['league'].includes(t.phase)) ||
    (t.mode==='mexicano' && m.round < Math.max(0,...tMatches(t).map(x=>x.round))));
  const caution=followUps?'<div class="alert"><strong>Achtung:</strong> Für dieses Ergebnis wurden bereits Folgerunden erzeugt. Eine Korrektur ändert die Tabelle, baut die bestehenden Paarungen aber nicht neu auf. Prüfe die Paarungen sorgfältig.</div>':'';
  modal(`${modalTitle('Ergebnis eintragen')}${labels}${caution}<form id="score-form" data-id="${esc(m.id)}">${fields}<div class="modal-actions">${m.status==='done'?'<button type="button" class="btn btn-danger" data-action="reset-score" data-id="'+esc(m.id)+'">Zurücksetzen</button>':''}<button class="btn btn-blue" type="submit">Ergebnis speichern</button></div></form>`);
}
function openSchedule(id){const m=state.matches.find(x=>x.id===id),t=tour(m?.tournamentId);if(!m)return;
  modal(`${modalTitle('Spieltermin vereinbaren')}<p class="small muted">${esc(matchTitle(m))} · ${esc(m.label)}<br><strong>${esc(sideNames(m,'A'))}</strong> gegen <strong>${esc(sideNames(m,'B'))}</strong></p><form id="schedule-match-form" data-id="${esc(m.id)}"><div class="field"><label>Datum und Uhrzeit (lokale Turnierzeit)</label><input type="datetime-local" name="scheduledAt" required value="${esc(m.scheduledAt||localDate(new Date(Date.now()+60*60*1000)))}"></div><div class="field"><label>Court / Feld</label><input name="court" maxlength="40" required placeholder="z. B. D6" value="${esc(m.court||'D6')}"></div><div class="info">Die App prüft, ob ein Spieler oder Court bereits für ein anderes Match gebucht ist (45 Minuten pro Match). Bitte Zeitänderungen mit der Gegenseite absprechen.</div><div class="modal-actions"><button class="btn btn-outline" type="button" data-action="close-modal">Abbrechen</button><button class="btn btn-blue" type="submit">Termin speichern</button></div></form>`);
}
function openAutoSchedule(){if(!state.tournaments.length){toast('Bitte zuerst ein Turnier anlegen.',true);return;}const available=state.tournaments.filter(t=>tMatches(t).some(m=>m.status==='pending'&&!m.scheduledAt));
  if(!available.length){toast('Es gibt aktuell keine unterminierten offenen Matches.',true);return;}
  const date=new Date();date.setDate(date.getDate()+1);date.setHours(10,0,0,0);
  modal(`${modalTitle('Spielplan automatisch erzeugen')}<p class="small muted">Ordnet die noch nicht terminierten Spiele des gewählten Turniers automatisch den Courts zu. Andere Turniere und bereits gebuchte Courts und Spieler werden berücksichtigt.</p><form id="auto-form"><div class="field"><label>Turnier</label><select name="tournamentId">${available.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}</select></div><div class="field"><label>Start</label><input type="datetime-local" required name="start" value="${localDate(date)}"></div><div class="inline-fields"><div class="field"><label>Spieldauer / Slot (Min.)</label><input type="number" name="minutes" min="15" max="180" value="45" required></div><div class="field"><label>Courts (mit Komma trennen)</label><input name="courts" value="D6, D7, D8" required></div></div><p class="small muted">Neue KO-Runden oder Mexicano-Runden musst du erst nach Abschluss der vorherigen Phase erzeugen und dann erneut einplanen.</p><div class="modal-actions"><button type="button" class="btn btn-outline" data-action="close-modal">Abbrechen</button><button class="btn btn-blue" type="submit">Termine generieren</button></div></form>`);
}
/* Persistence adapter: Firestore in production, browser-local sample data in demo mode. */
const plural={players:'players',tournaments:'tournaments',matches:'matches',claims:'claims'};
async function mutate(operations){
  if(state.demo){
    for(const op of operations){const list=state[plural[op.collection]];
      if(op.action==='create')list.push({id:op.id,...op.data});
      if(op.action==='update'){const item=list.find(x=>x.id===op.id);if(item)Object.assign(item,op.data);}
      if(op.action==='delete'){const i=list.findIndex(x=>x.id===op.id);if(i>=0)list.splice(i,1);}
    }
    localStorage.setItem('malaga-padel-demo-v1',JSON.stringify({players:state.players,tournaments:state.tournaments,matches:state.matches}));render();return;
  }
  const batch=fb.writeBatch(fb.db);
  for(const op of operations){const ref=fb.doc(fb.db,op.collection,op.id);
    if(op.action==='create')batch.set(ref,op.data);
    if(op.action==='update')batch.update(ref,op.data);
    if(op.action==='delete')batch.delete(ref);
  }
  await batch.commit();
}
async function addPlayer(value){if(!isAdmin())throw Error('Nur die Turnierleitung darf Spieler anlegen.');const name=value.trim();if(!name||name.length>65)throw Error('Bitte einen gültigen Namen eingeben.');if(state.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('Spielername bereits vorhanden.');await mutate([{action:'create',collection:'players',id:key(),data:{name,authUid:''}}]);state.draft=null;toast(`${name} hinzugefügt.`);}
async function createTournament(){
  if(!isAdmin())throw Error('Keine Admin-Berechtigung.');ensureDraft();const d=state.draft;
  const id=key(),part=[...d.participantIds];const assigned=d.randomTeams?shuffle(part):part;
  const teams=isTeamMode(d.mode)?Array.from({length:part.length/2},(_,i)=>({id:`team-${i+1}`,name:d.randomTeams?`Team ${i+1}`:(d.teams[i]?.name||'').trim(),playerIds:d.randomTeams?assigned.slice(i*2,i*2+2):[...(d.teams[i]?.playerIds||[])]})):[];
  const t={id,name:d.name.trim(),mode:d.mode,format:d.format,participantIds:part,teams,seed:assigned,rounds:+d.rounds||5,selfSchedule:d.selfSchedule,selfScore:d.selfScore,bonusFirst:+d.bonusFirst,bonusLast:+d.bonusLast,phase:({groups:'groups',league:'league',americano:'americano',mexicano:'mexicano'})[d.mode],status:'running',createdAt:Date.now()};
  if(!t.name||t.name.length>90)throw Error('Bitte einen Turniernamen eingeben.');if(t.bonusFirst<t.bonusLast||t.bonusLast<0||t.bonusFirst>1000)throw Error('Bonus: erster Platz muss mindestens so viele Punkte wie der letzte erhalten (0–1000).');validateTournament(t);
  const matches=buildInitialMatches(t).map(m=>({...m,id:key()}));
  await mutate([{action:'create',collection:'tournaments',id:t.id,data:Object.fromEntries(Object.entries(t).filter(([k])=>k!=='id'))},...matches.map(m=>({action:'create',collection:'matches',id:m.id,data:Object.fromEntries(Object.entries(m).filter(([k])=>k!=='id'))}))]);
  state.draft=null;state.filter=id;state.scheduleFilter=id;state.adminPanel='tournaments';state.page='admin';render();toast(`Turnier „${t.name}“ mit ${matches.length} Matches angelegt.`);
}
async function addNextPhase(id){if(!isAdmin())throw Error('Keine Berechtigung.');const t=tour(id);if(!t)throw Error('Turnier fehlt.');
  const result=nextPhase(t,state.matches);const newMatches=result.matches.map(m=>({...m,id:key()}));
  await mutate([...newMatches.map(m=>({action:'create',collection:'matches',id:m.id,data:Object.fromEntries(Object.entries(m).filter(([k])=>k!=='id'))})),{action:'update',collection:'tournaments',id:t.id,data:{phase:result.phase}}]);
  toast(`${newMatches.length} Matches für die nächste Phase erstellt.`);
}
async function removeTournament(id){if(!isAdmin())throw Error('Keine Berechtigung.');const t=tour(id);if(!t)return;if(!window.confirm(`Turnier „${t.name}“ inklusive ALLER Ergebnisse und Spieltermine endgültig löschen?`))return;
  await mutate([...tMatches(t).map(m=>({action:'delete',collection:'matches',id:m.id})),{action:'delete',collection:'tournaments',id}]);state.filter='all';state.scheduleFilter='all';toast('Turnier gelöscht.');}
async function removePlayer(id){if(!isAdmin())throw Error('Keine Berechtigung.');if(state.tournaments.some(t=>t.participantIds.includes(id))||state.matches.some(m=>(m.playerIds||[]).includes(id)))throw Error('Spieler ist noch einem Turnier oder Match zugeordnet. Erst die betreffenden Spiele löschen.');const p=player(id);if(!p)return;if(!window.confirm(`Spieler „${p.name}“ löschen?`))return;await mutate([{action:'delete',collection:'players',id}]);state.draft=null;toast('Spieler gelöscht.');}
async function saveScore(form){const id=form.dataset.id,m=state.matches.find(x=>x.id===id),t=tour(m?.tournamentId);if(!m)throw Error('Match fehlt.');
  if(!isAdmin()&&!eligibleScore(m))throw Error('Dieses Ergebnis darfst du nicht eintragen.');
  const format=formatFor(m);let result;
  if(format==='sets'){
    const sets=[];for(let i=0;i<3;i++){
      const a=form.elements[`set-a-${i}`].value,b=form.elements[`set-b-${i}`].value;
      if(a===''&&b==='')continue;if(a===''||b==='')throw Error('Beide Werte eines Satzes eingeben.');
      sets.push({a:Number(a),b:Number(b)});
    }result=checkScore(format,m.phase,0,0,sets);
  }else result=checkScore(format,m.phase,Number(form.elements['score-a'].value),Number(form.elements['score-b'].value));
  const changed={...result,status:'done'},updated=state.matches.map(x=>x.id===id?{...x,...changed}:x);
  const ops=[{action:'update',collection:'matches',id,data:changed}];
  if(isAdmin()&&t&&canComplete(t,updated))ops.push({action:'update',collection:'tournaments',id:t.id,data:{status:'completed',phase:'completed'}});
  await mutate(ops);closeModal();toast(t&&canComplete(t,updated)?'Ergebnis gespeichert. Turnier abgeschlossen!':'Ergebnis gespeichert.');
}
async function resetScore(id){if(!isAdmin())throw Error('Keine Berechtigung.');const m=state.matches.find(x=>x.id===id),t=tour(m?.tournamentId);if(!m)return;
  if(!window.confirm('Dieses Ergebnis zurücksetzen? Die Platzierungen ändern sich dadurch.'))return;
  const ops=[{action:'update',collection:'matches',id,data:{scoreA:null,scoreB:null,sets:[],winner:null,status:'pending'}}];
  if(t?.status==='completed')ops.push({action:'update',collection:'tournaments',id:t.id,data:{status:'running',phase:t.mode==='groups'?'final':t.mode==='league'?'placement':t.mode}});
  await mutate(ops);closeModal();toast('Ergebnis zurückgesetzt.');
}
async function addFriendly(form){if(!isAdmin())throw Error('Nur Admins dürfen Spiele anlegen.');const e=form.elements;
  const m=makeStandaloneMatch({id:key(),sideA:[e.a0.value,e.a1.value],sideB:[e.b0.value,e.b1.value],format:e.format.value,label:e.label.value,selfSchedule:e.selfSchedule.checked,selfScore:e.selfScore.checked,scheduledAt:e.scheduledAt.value,court:e.court.value.trim()});
  if(m.scheduledAt&&(!m.court||state.matches.some(x=>conflict(m,x))))throw Error('Bitte Court angeben und Terminkollisionen vermeiden.');
  await mutate([{action:'create',collection:'matches',id:m.id,data:Object.fromEntries(Object.entries(m).filter(([k])=>k!=='id'))}]);toast('Freies Match angelegt.');form.reset();
}
async function approveClaim(id){if(!isAdmin())throw Error('Nur Admins dürfen Konten freigeben.');const c=state.claims.find(x=>x.id===id),p=player(c?.playerId);if(!p)throw Error('Passender Spieler wurde nicht gefunden.');
  if(p.authUid&&p.authUid!==id)throw Error('Dieser Spieler hat bereits ein anderes Konto. Prüfe die Zuordnung.');
  if(state.players.some(x=>x.id!==p.id&&x.authUid===id))throw Error('UID ist bereits anderweitig verknüpft.');
  if(!window.confirm(`Spielerkonto für „${p.name}“ freigeben? Nur bestätigen, wenn du die Person kennst.`))return;
  await mutate([{action:'update',collection:'players',id:p.id,data:{authUid:id}},{action:'update',collection:'claims',id,data:{approved:true}}]);
  state.claims=state.claims.filter(x=>x.id!==id);toast('Spielerkonto freigegeben.');render();
}
async function deleteFriendly(id){if(!isAdmin())throw Error('Keine Berechtigung.');const m=state.matches.find(x=>x.id===id);if(!m||m.tournamentId)return;
  if(!window.confirm('Dieses freie Spiel dauerhaft löschen?'))return;await mutate([{action:'delete',collection:'matches',id}]);toast('Freies Match gelöscht.');
}

function conflict(candidate,m,mins=45){if(!candidate.scheduledAt||!m.scheduledAt||candidate.id===m.id)return false;
  const a=new Date(candidate.scheduledAt).getTime(),b=new Date(m.scheduledAt).getTime();if(Number.isNaN(a)||Number.isNaN(b))return false;
  const overlap=a<b+(Number(m.slotMinutes)||45)*60000 && b<a+mins*60000;
  if(!overlap)return false;
  const courtUsed=candidate.court?.trim()?.toLowerCase()===m.court?.trim()?.toLowerCase();
  const playersUsed=(candidate.playerIds||[]).some(id=>m.playerIds?.includes(id));
  return courtUsed||playersUsed;
}
async function saveSchedule(form){const m=state.matches.find(x=>x.id===form.dataset.id);if(!m)throw Error('Match fehlt.');if(!isAdmin()&&!eligibleSchedule(m))throw Error('Du darfst dieses Match nicht terminieren.');if(m.status==='done')throw Error('Ein abgeschlossenes Match kann nicht umgeplant werden.');
  const scheduledAt=form.elements.scheduledAt.value,court=form.elements.court.value.trim();if(!scheduledAt||!court)throw Error('Datum, Uhrzeit und Court angeben.');
  const candidate={...m,scheduledAt,court};
  if(state.matches.some(x=>conflict(candidate,x)))throw Error('Court oder mindestens ein Spieler ist zur gewählten Uhrzeit bereits gebucht.');
  await mutate([{action:'update',collection:'matches',id:m.id,data:{scheduledAt,court}}]);closeModal();toast('Spieltermin gespeichert.');
}
async function autoSchedule(form){if(!isAdmin())throw Error('Keine Berechtigung.');const t=tour(form.elements.tournamentId.value),start=form.elements.start.value;
  const mins=Number(form.elements.minutes.value),courts=form.elements.courts.value.split(',').map(s=>s.trim()).filter(Boolean);
  if(!t||!start||!Number.isFinite(mins)||mins<15||mins>180||!courts.length)throw Error('Bitte korrekte Startzeit, Dauer und Courts angeben.');
  if(new Set(courts.map(s=>s.toLowerCase())).size!==courts.length)throw Error('Courts dürfen nicht doppelt vorkommen.');
  const todo=tMatches(t).filter(m=>m.status==='pending'&&!m.scheduledAt);if(!todo.length)throw Error('Keine unterminierten offenen Matches.');
  const occupied=[...state.matches],ops=[],startMs=new Date(start).getTime();if(Number.isNaN(startMs))throw Error('Ungültige Startzeit.');
  for(const m of todo){let candidate=null;
    for(let slot=0;slot<2500 && !candidate;slot++)for(const court of courts){const time=localDate(new Date(startMs+slot*mins*60000));const choice={...m,scheduledAt:time,court,slotMinutes:mins};
      if(!occupied.some(x=>conflict(choice,x,mins))){candidate=choice;break;}
    }
    if(!candidate)throw Error('Keine freien Termine für alle Matches gefunden. Bitte weitere Courts hinzufügen.');
    occupied.push(candidate);ops.push({action:'update',collection:'matches',id:m.id,data:{scheduledAt:candidate.scheduledAt,court:candidate.court,slotMinutes:mins}});
  }
  await mutate(ops);closeModal();toast(`${ops.length} Match-Termine automatisch geplant.`);navigate('schedule');
}
function exportBackup(){if(!isAdmin())return;const data={created:new Date().toISOString(),players:state.players,tournaments:state.tournaments,matches:state.matches};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`malaga-padel-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);}

/* All event handlers use delegation so live Firestore renders do not detach controls. */
document.addEventListener('click',async event=>{
  if(event.target.id==='modal-cover'){closeModal();return;}
  const btn=event.target.closest('[data-action]');if(!btn)return;
  const {action,id,page}=btn.dataset;
  try{
    if(action==='close-modal'){closeModal();return;}
    if(action==='navigate'){navigate(page);return;}
    if(action==='auth'){openAuth();return;}
    if(action==='logout'){await fb.signOut(fb.auth);closeModal();toast('Abgemeldet.');return;}
    if(action==='copy-uid'){await navigator.clipboard.writeText(state.user?.uid||'');toast('UID kopiert.');return;}
    if(action==='table-filter'){state.filter=id;render();return;}
    if(action==='schedule-filter'){state.scheduleFilter=id;render();return;}
    if(action==='show-table'){state.filter=id;navigate('standings');return;}
    if(action==='admin-panel'){state.adminPanel=id;render();return;}
    if(action==='create-tournament'){await createTournament();return;}
    if(action==='score'){openScore(id);return;}
    if(action==='edit-tour'){openTournamentEdit(id);return;}
    if(action==='reset-score'){await resetScore(id);return;}
    if(action==='schedule-match'){openSchedule(id);return;}
    if(action==='auto-schedule'){openAutoSchedule();return;}
    if(action==='next-phase'){await addNextPhase(id);return;}
    if(action==='edit-player'){openPlayerEdit(id);return;}
    if(action==='delete-player'){await removePlayer(id);return;}
    if(action==='delete-tour'){await removeTournament(id);return;}
    if(action==='delete-match'){await deleteFriendly(id);return;}
    if(action==='approve-claim'){await approveClaim(id);return;}
    if(action==='export'){exportBackup();return;}
  }catch(error){fail(error);}
});
document.addEventListener('input',event=>{
  const el=event.target;if(!state.draft)return;
  if(el.name==='draft-name')state.draft.name=el.value;
  if(el.hasAttribute('data-team-name'))state.draft.teams[Number(el.dataset.teamName)].name=el.value;
  if(el.name==='draft-rounds')state.draft.rounds=Number(el.value);
});
document.addEventListener('change',event=>{
  const el=event.target,d=state.draft;if(!d)return;
  if(el.name==='draft-mode'){d.mode=el.value;syncDraftTeams();render();}
  if(el.name==='draft-format')d.format=el.value;
  if(el.name==='draft-random'){d.randomTeams=el.checked;render();}
  if(el.name==='draft-self')d.selfSchedule=el.checked;
  if(el.name==='draft-selfscore')d.selfScore=el.checked;
  if(el.name==='draft-bonusfirst')d.bonusFirst=Number(el.value);
  if(el.name==='draft-bonuslast')d.bonusLast=Number(el.value);
  if(el.name==='participant'){
    if(el.checked){if(d.participantIds.length>=12){el.checked=false;toast('Maximal 12 Teilnehmer je Turnier.',true);return;}d.participantIds.push(el.value);}else d.participantIds=d.participantIds.filter(x=>x!==el.value);
    syncDraftTeams();render();
  }
  if(el.hasAttribute('data-team-player'))d.teams[Number(el.dataset.teamPlayer)].playerIds[Number(el.dataset.slot)]=el.value;
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!['player-add-form','player-edit-form','tournament-edit-form','score-form','schedule-match-form','auto-form','auth-form','player-auth-form','friendly-form'].includes(form.id))return;event.preventDefault();
  const pressed=event.submitter;
  try{
    if(form.id==='player-add-form'){await addPlayer(form.elements.playername.value);form.reset();}
    if(form.id==='player-edit-form'){if(!isAdmin())throw Error('Keine Berechtigung.');const fullName=form.elements.name.value.trim(),authUid=form.elements.authUid.value.trim();if(!fullName)throw Error('Spielername fehlt.');if(authUid&&state.players.some(x=>x.id!==form.dataset.id&&x.authUid===authUid))throw Error('Diese UID gehört schon einem anderen Spieler.');await mutate([{action:'update',collection:'players',id:form.dataset.id,data:{name:fullName,authUid}}]);closeModal();toast('Spieler gespeichert.');}
    if(form.id==='tournament-edit-form')await saveTournamentEdit(form);
    if(form.id==='score-form')await saveScore(form);
    if(form.id==='schedule-match-form')await saveSchedule(form);
    if(form.id==='auto-form')await autoSchedule(form);
    if(form.id==='friendly-form')await addFriendly(form);
    if(form.id==='player-auth-form'){
      const id=form.elements.playerId.value,p=player(id),password=form.elements.password.value;
      if(!p)throw Error('Bitte deinen Spielernamen auswählen.');
      if(password.length<6)throw Error('Bitte mindestens 6 Zeichen als Passwort wählen.');
      const email=syntheticEmail(id);
      if(pressed?.value==='register'){
        const credential=await fb.createUserWithEmailAndPassword(fb.auth,email,password);
        await fb.setDoc(fb.doc(fb.db,'claims',credential.user.uid),{playerId:id,requestedAt:Date.now(),approved:false});
        toast('Registriert! Bitte um Freigabe durch die Turnierleitung.');
      }else{await fb.signInWithEmailAndPassword(fb.auth,email,password);toast('Als Spieler angemeldet.');}
      closeModal();state.page='profile';render();
    }
    if(form.id==='auth-form'){
      const email=form.elements.email.value.trim(),password=form.elements.password.value;
      await fb.signInWithEmailAndPassword(fb.auth,email,password);
      closeModal();toast('Anmeldung erfolgreich. Öffne dein Konto für die UID.');
    }
  }catch(error){fail(error);}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

async function startup(){
  if(!configured){
    try{
      const saved=JSON.parse(localStorage.getItem('malaga-padel-demo-v1')||'null');
      if(saved && ['players','tournaments','matches'].every(k=>Array.isArray(saved[k]))){Object.assign(state,saved);}
      else createDemo();
    }catch(e){console.warn(e);createDemo();}
    state.loading=false;render();return;
  }
  try{
    const [{initializeApp},{getFirestore,collection,onSnapshot,doc,writeBatch,setDoc,getDocs},{getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js')
    ]);
    const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app);
    fb={db,auth,doc,writeBatch,setDoc,getDocs,collection,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut};
    onAuthStateChanged(auth,user=>{unsubscribeClaims();unsubscribeClaims=()=>{};state.user=user;state.claims=[];render();if(isAdmin())unsubscribeClaims=onSnapshot(collection(db,'claims'),snap=>{state.claims=snap.docs.map(x=>({id:x.id,...x.data()}));render();},fail);},fail);
    const loaded=new Set();
    for(const col of ['players','tournaments','matches']){
      onSnapshot(collection(db,col),snapshot=>{
        state[col]=snapshot.docs.map(x=>({id:x.id,...x.data()}));
        loaded.add(col);state.loading=loaded.size<3;render();
      },error=>{state.loading=false;fail(error);render();});
    }
  }catch(error){state.loading=false;fail(error);render();}
}
function createDemo(){
  const sampleNames=['Alex','Ben','Chris','Daniel','Emilia','Felix','Giulia','Hannes','Ida','Jonas','Kira','Luca'];
  state.players=sampleNames.map((name,i)=>({id:`demo-player-${i}`,name,authUid:''}));
  const players=state.players;
  const a={id:'demo-tour-1',name:'Hanse Padel Cup',mode:'groups',format:'twentyfour',participantIds:players.slice(0,8).map(x=>x.id),teams:[['Spannenlanger Hansel','Alex','Ben'],['Schmetterlinge','Chris','Daniel'],['Smash Bros','Emilia','Felix'],['Schlüpfer','Giulia','Hannes']].map(([teamName,p1,p2],i)=>({id:`team-${i+1}`,name:teamName,playerIds:[players.find(x=>x.name===p1).id,players.find(x=>x.name===p2).id]})),seed:players.slice(0,8).map(p=>p.id),phase:'groups',status:'running',rounds:5,selfSchedule:true,createdAt:Date.now()-10000};
  const b={id:'demo-tour-2',name:'Sonne & Smash · Mexicano',mode:'mexicano',format:'eight',participantIds:players.slice(4,12).map(x=>x.id),teams:[],seed:players.slice(4,12).map(x=>x.id),phase:'mexicano',status:'running',rounds:4,selfSchedule:false,createdAt:Date.now()};
  state.tournaments=[a,b];
  state.matches=[...buildInitialMatches(a).map((m,i)=>({...m,id:`sample-a-${i}`})),...buildInitialMatches(b).map((m,i)=>({...m,id:`sample-b-${i}`}))];
  const sample=state.matches.filter(m=>m.tournamentId===a.id).slice(0,2);
  sample.forEach((m,i)=>Object.assign(m,{status:'done',scoreA:i?13:15,scoreB:i?11:9,winner:'A',court:`D${6+i}`,scheduledAt:'2026-11-06T10:00'}));
  state.matches.find(m=>m.tournamentId===b.id).scheduledAt='2026-11-06T12:00';
  localStorage.setItem('malaga-padel-demo-v1',JSON.stringify({players:state.players,tournaments:state.tournaments,matches:state.matches}));
}
startup();
