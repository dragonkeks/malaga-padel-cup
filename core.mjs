/* Pure tournament rules: no database or browser dependencies. */
export const MODES = { groups:'2 Gruppen + KO', league:'Jeder gegen jeden + Platzierung', americano:'Americano', mexicano:'Mexicano' };
export const FORMATS = { sets:'Best of 3 Sätze', eight:'8 Bälle', twentyfour:'24 Bälle' };
export const isTeamMode = mode => mode === 'groups' || mode === 'league';
export const shuffle = (items, rng=Math.random) => {
  const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
};
export function roundRobinRounds(items){
  const arr=[...items]; if(arr.length%2) arr.push(null);
  const rounds=[];
  for(let r=0;r<arr.length-1;r++){
    const pairs=[];
    for(let i=0;i<arr.length/2;i++) if(arr[i]!=null && arr[arr.length-1-i]!=null) pairs.push([arr[i],arr[arr.length-1-i]]);
    rounds.push(pairs);
    arr.splice(1,0,arr.pop());
  }
  return rounds;
}
function makeMatch(t, sideA, sideB, extra={}){
  return { tournamentId:t.id, sideA:[...sideA], sideB:[...sideB], playerIds:[...sideA,...sideB], status:'pending', scoreA:null,scoreB:null,sets:[],winner:null,scheduledAt:'',court:'',round:1,order:0,phase:'',label:'',...extra };
}
export function buildInitialMatches(t){
  const out=[]; const add=(m)=>{m.order=out.length;out.push(m);};
  if(t.mode==='groups'){
    if(t.teams.length!==4 && t.teams.length!==6) throw Error('Für die Zwei-Gruppen-Variante werden 8 oder 12 Spieler benötigt.');
    for(const g of ['A','B']){
      const groupTeams=t.teams.filter((_,i)=>i%2===(g==='A'?0:1));
      roundRobinRounds(groupTeams).forEach((pairs,ri)=>pairs.forEach(([a,b])=>add(makeMatch(t,a.playerIds,b.playerIds,{teamAId:a.id,teamBId:b.id,phase:'groups',group:g,round:ri+1,label:`Gruppe ${g} · Runde ${ri+1}`}))));
    }
  } else if(t.mode==='league'){
    roundRobinRounds(t.teams).forEach((pairs,ri)=>pairs.forEach(([a,b])=>add(makeMatch(t,a.playerIds,b.playerIds,{teamAId:a.id,teamBId:b.id,phase:'league',round:ri+1,label:`Vorrunde · Runde ${ri+1}`}))));
  } else if(t.mode==='americano'){
    if(t.participantIds.length%4) throw Error('Americano benötigt 4, 8 oder 12 Spieler.');
    const opponentCounts={};
    const partnerRounds=roundRobinRounds(t.seed || t.participantIds);
    const optimized=partnerRounds.length===7?optimizeOpponentCoverage(partnerRounds,t.seed||t.participantIds):null;
    partnerRounds.forEach((pairs,ri)=>{
      const best=optimized?.[ri] || balancedGamePairs(pairs,opponentCounts);
      best.forEach(([p1,p2])=>{
        for(const x of p1) for(const y of p2) {const k=[x,y].sort().join('|');opponentCounts[k]=(opponentCounts[k]||0)+1;}
        add(makeMatch(t,p1,p2,{phase:'americano',round:ri+1,label:`Americano · Runde ${ri+1}`}));
      });
    });
  } else if(t.mode==='mexicano'){
    return buildMexicanoRound(t,[],1);
  }
  return out;
}
function balancedGamePairs(partners,counts){
  let best=null, bestScore=Infinity;
  const rec=(remaining,cur)=>{
    if(!remaining.length){
      let cost=0;
      for(const [a,b] of cur)for(const x of a)for(const y of b){const n=counts[[x,y].sort().join('|')]||0;cost+=(n+1)*(n+1)-n*n;}
      if(cost<bestScore){bestScore=cost;best=cur.map(pair=>pair.map(p=>[...p]));}
      return;
    }
    const first=remaining[0];
    for(let i=1;i<remaining.length;i++)rec(remaining.slice(1,i).concat(remaining.slice(i+1)),[...cur,[first,remaining[i]]]);
  };
  rec(partners,[]);return best||[];
}
// For 8 players there are only 3^7 = 2187 ways to connect the four
// doubles partnerships into matches. Check all of them so everyone also
// faces every other player as an opponent at least once where possible.
function optimizeOpponentCoverage(rounds,ids){
  const options=rounds.map(partnerPairs=>{
    const [a,b,c,d]=partnerPairs;
    return [ [[a,b],[c,d]], [[a,c],[b,d]], [[a,d],[b,c]] ];
  });
  const counts=new Map();let best=null,bestCost=Infinity;
  const scoreAtEnd=()=>{
    let missing=0,spread=0;
    for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
      const k=[ids[i],ids[j]].sort().join('|'),v=counts.get(k)||0;
      if(!v)missing++;spread+=v*v;
    }
    return missing*10000+spread;
  };
  const dfs=(index,chosen)=>{
    if(index===options.length){const c=scoreAtEnd();if(c<bestCost){bestCost=c;best=chosen.map(round=>round.map(x=>x.map(side=>[...side])));}return;}
    for(const option of options[index]){
      for(const [a,b] of option)for(const x of a)for(const y of b){const k=[x,y].sort().join('|');counts.set(k,(counts.get(k)||0)+1);}
      dfs(index+1,[...chosen,option]);
      for(const [a,b] of option)for(const x of a)for(const y of b){const k=[x,y].sort().join('|');counts.set(k,counts.get(k)-1);}
    }
  };
  dfs(0,[]);return best;
}
export function buildMexicanoRound(t,prior,round){
  if(t.mode!=='mexicano') throw Error('Nicht Mexicano.');
  let ids=[...(t.seed || t.participantIds)];
  if(round>1){ids=individualStandings(t,prior).map(x=>x.id);}
  const out=[];
  for(let i=0;i<ids.length;i+=4){
    const sideA=[ids[i],ids[i+3]],sideB=[ids[i+1],ids[i+2]];
    out.push(makeMatch(t,sideA,sideB,{phase:'mexicano',round,order:(round-1)*(ids.length/4)+out.length,label:`Mexicano · Runde ${round}`}));
  }
  return out;
}
export function formatScore(m,t){
  if(m.status!=='done')return '– : –';
  if(t?.format==='sets')return (m.sets||[]).map(s=>`${s.a}:${s.b}`).join(' · ');
  return `${m.scoreA} : ${m.scoreB}`;
}
export function checkScore(format,phase,a,b,sets=[]){
  if(format==='sets'){
    if(sets.length<2||sets.length>3)throw Error('Bitte 2 oder 3 vollständige Sätze eingeben.');
    let winsA=0,winsB=0,totalA=0,totalB=0;
    for(const {a:x,b:y} of sets){
      if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0)throw Error('Ungültige Satzzahlen.');
      const high=Math.max(x,y),low=Math.min(x,y);
      if(!((high===6 && low<=4)||(high===7 && (low===5||low===6))))throw Error('Ein Satz endet 6:x (bis 4), 7:5 oder 7:6 mit Golden Point.');
      if(x>y)winsA++;else winsB++;totalA+=x;totalB+=y;
    }
    if((sets.length===3 && ((sets[0].a>sets[0].b)===(sets[1].a>sets[1].b))) || Math.max(winsA,winsB)!==2 || (sets.length===2 && Math.min(winsA,winsB)!==0) || (sets.length===3 && Math.min(winsA,winsB)!==1))throw Error('Das Match muss mit 2:0 oder 2:1 Sätzen enden.');
    return {scoreA:totalA,scoreB:totalB,sets,winner:winsA>winsB?'A':'B'};
  }
  const n=format==='eight'?8:24;
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0)throw Error('Bitte ganze nichtnegative Ballpunkte eingeben.');
  const regular=a+b===n;
  const golden=a+b===n+1 && Math.max(a,b)===n/2+1 && Math.min(a,b)===n/2;
  if(!regular&&!golden)throw Error(`Es werden genau ${n} Bälle gespielt. Bei Gleichstand entscheidet ein zusätzlicher Golden Point (${n/2+1}:${n/2}).`);
  if(a===b && ['semis','placement','final'].includes(phase))throw Error('In KO- und Platzierungsspielen muss ein Sieger feststehen: Golden Point spielen und erfassen.');
  return {scoreA:a,scoreB:b,sets:[],winner:a===b?null:a>b?'A':'B'};
}
export function teamStandings(teams,matches){
  return teams.map((team,i)=>{
    const row={id:team.id,name:team.name,playerIds:team.playerIds,seed:i,played:0,wins:0,draws:0,losses:0,points:0,for:0,against:0,diff:0};
    matches.filter(m=>m.status==='done' && (m.teamAId===team.id||m.teamBId===team.id)).forEach(m=>{
      const side=m.teamAId===team.id?'A':'B', f=side==='A'?m.scoreA:m.scoreB,a=side==='A'?m.scoreB:m.scoreA;
      row.played++;row.for+=f;row.against+=a;row.diff+=f-a;
      if(f===a && m.winner===null){row.draws++;row.points++;}
      else if(m.winner===side){row.wins++;row.points+=3;}
      else row.losses++;
    });return row;
  }).sort((a,b)=>b.points-a.points||b.diff-a.diff||b.for-a.for||a.seed-b.seed);
}
export function individualStandings(t,matches){
  const standings=t.participantIds.map((id,seed)=>({id,seed,played:0,balls:0,against:0,diff:0,wins:0,draws:0,rank:0}));
  const map=Object.fromEntries(standings.map(s=>[s.id,s]));
  for(const m of matches){if(m.status!=='done')continue;
    for(const side of ['A','B'])for(const id of m[side==='A'?'sideA':'sideB']){
      const r=map[id];if(!r)continue;
      const own=side==='A'?m.scoreA:m.scoreB,opp=side==='A'?m.scoreB:m.scoreA;
      r.played++;r.balls+=own;r.against+=opp;r.diff+=own-opp;
      if(m.winner===side)r.wins++;else if(m.winner===null)r.draws++;
    }
  }
  standings.sort((a,b)=>b.balls-a.balls||b.diff-a.diff||b.wins-a.wins||a.seed-b.seed);
  standings.forEach((r,i)=>{r.rank=(i && r.balls===standings[i-1].balls && r.diff===standings[i-1].diff && r.wins===standings[i-1].wins)?standings[i-1].rank:i+1;});
  return standings;
}
export function nextPhase(t,matches){
  const scoped=matches.filter(m=>m.tournamentId===t.id);
  const created=[];const add=m=>{m.order=scoped.length+created.length;created.push(m);};
  if(t.mode==='groups'&&t.phase==='groups'){
    const prelim=scoped.filter(m=>m.phase==='groups');
    if(prelim.some(m=>m.status!=='done'))throw Error('Erst alle Gruppenspiele abschließen.');
    const a=teamStandings(t.teams.filter((_,i)=>i%2===0),prelim),b=teamStandings(t.teams.filter((_,i)=>i%2===1),prelim);
    const find=id=>t.teams.find(x=>x.id===id);
    const semi1=[find(a[0].id),find(b[1].id)],semi2=[find(b[0].id),find(a[1].id)];
    for(const [i,[x,y]] of [semi1,semi2].entries())add(makeMatch(t,x.playerIds,y.playerIds,{teamAId:x.id,teamBId:y.id,phase:'semis',round:1,label:`Halbfinale ${i+1}`}));
    if(a[2]&&b[2]){const x=find(a[2].id),y=find(b[2].id);add(makeMatch(t,x.playerIds,y.playerIds,{teamAId:x.id,teamBId:y.id,phase:'placement',round:1,label:'Spiel um Platz 5',placementFor:5}));}
    return {phase:'semis',matches:created};
  }
  if(t.mode==='groups'&&t.phase==='semis'){
    const semis=scoped.filter(m=>m.phase==='semis');
    const fifth=scoped.filter(m=>m.placementFor===5);
    if(semis.length!==2||[...semis,...fifth].some(m=>m.status!=='done'))throw Error('Halbfinals und Spiel um Platz 5 abschließen.');
    const find=id=>t.teams.find(x=>x.id===id);
    const win=m=>find(m.winner==='A'?m.teamAId:m.teamBId),lose=m=>find(m.winner==='A'?m.teamBId:m.teamAId);
    for(const [placementFor,x,y,label] of [[1,win(semis[0]),win(semis[1]),'FINALE'],[3,lose(semis[0]),lose(semis[1]),'Spiel um Platz 3']])add(makeMatch(t,x.playerIds,y.playerIds,{teamAId:x.id,teamBId:y.id,phase:'final',round:1,label,placementFor}));
    return {phase:'final',matches:created};
  }
  if(t.mode==='league'&&t.phase==='league'){
    const prelim=scoped.filter(m=>m.phase==='league');
    if(prelim.some(m=>m.status!=='done'))throw Error('Erst alle Vorrundenspiele abschließen.');
    const ranked=teamStandings(t.teams,prelim);const find=id=>t.teams.find(x=>x.id===id);
    for(let i=0;i+1<ranked.length;i+=2){const x=find(ranked[i].id),y=find(ranked[i+1].id);add(makeMatch(t,x.playerIds,y.playerIds,{teamAId:x.id,teamBId:y.id,phase:'placement',round:1,label:i===0?'FINALE':`Spiel um Platz ${i+1}`,placementFor:i+1}));}
    return {phase:'placement',matches:created};
  }
  if(t.mode==='mexicano'&&t.phase==='mexicano'){
    const rounds=Math.max(1,Number(t.rounds||1));
    const last=Math.max(0,...scoped.map(m=>m.round||0));
    if(last>=rounds)throw Error('Alle Mexicano-Runden sind bereits geplant.');
    if(scoped.some(m=>m.status!=='done'))throw Error('Erst alle bisherigen Mexicano-Spiele abschließen.');
    return {phase:'mexicano',matches:buildMexicanoRound(t,scoped,last+1)};
  }
  throw Error('Für dieses Turnier steht aktuell keine weitere Phase an.');
}
export function canComplete(t,matches){
  const m=matches.filter(x=>x.tournamentId===t.id);if(!m.length||m.some(x=>x.status!=='done'))return false;
  if(t.mode==='americano')return true;
  if(t.mode==='mexicano')return Math.max(...m.map(x=>x.round))>=Number(t.rounds);
  if(t.mode==='league')return t.phase==='placement';
  if(t.mode==='groups')return t.phase==='final';
  return false;
}
export function finishRanks(t,matches){
  const m=matches.filter(x=>x.tournamentId===t.id);
  if(isTeamMode(t.mode)){
    const placements=m.filter(x=>x.placementFor&&x.status==='done').sort((a,b)=>a.placementFor-b.placementFor);
    const ranks=new Map();
    placements.forEach(x=>{const w=x.winner==='A'?x.teamAId:x.teamBId,l=x.winner==='A'?x.teamBId:x.teamAId;ranks.set(w,x.placementFor);ranks.set(l,x.placementFor+1);});
    if(t.teams.length%2===1 && t.mode==='league'){
      const standing=teamStandings(t.teams,m.filter(x=>x.phase==='league'));ranks.set(standing[standing.length-1].id,t.teams.length);
    }
    return t.teams.flatMap(team=>team.playerIds.map(id=>({id,rank:ranks.get(team.id)??null,team:team.name}))).filter(x=>x.rank!==null);
  }
  return individualStandings(t,m).map(x=>({id:x.id,rank:x.rank}));
}
export function globalStandings(players,tournaments,matches){
  const rows=players.map(p=>({id:p.id,name:p.name,total:0,appearances:0,average:0,best:0,results:[]}));const lookup=Object.fromEntries(rows.map(x=>[x.id,x]));
  for(const t of tournaments){if(t.status!=='completed')continue;
    const ranks=finishRanks(t,matches);const n=isTeamMode(t.mode)?t.teams.length:t.participantIds.length;
    for(const r of ranks){const dest=lookup[r.id];if(!dest)continue;
      // Earned points = participation base + normalized finish score. Each tournament contributes independently.
      const value=Math.round((30+70*(n===1?1:(n-r.rank)/(n-1)))*10)/10;
      dest.total+=value;dest.appearances++;dest.results.push({tournamentId:t.id,name:t.name,rank:r.rank,points:value});dest.best=Math.max(dest.best,value);
    }
  }
  rows.forEach(x=>{x.total=Math.round(x.total*10)/10;x.average=x.appearances?Math.round(x.total/x.appearances*10)/10:0;});
  return rows.sort((a,b)=>b.total-a.total||b.average-a.average||b.best-a.best||a.name.localeCompare(b.name,'de'));
}
export function tournamentProgress(t,matches){const m=matches.filter(x=>x.tournamentId===t.id);return {done:m.filter(x=>x.status==='done').length,total:m.length};}
export function validateTournament(t){
  const n=t.participantIds.length;if(n<4||n>12)throw Error('Bitte 4 bis 12 Teilnehmer auswählen.');
  if(new Set(t.participantIds).size!==n)throw Error('Ein Spieler darf nicht zweimal ausgewählt werden.');
  if(isTeamMode(t.mode)){
    if(n%2)throw Error('Teamturniere brauchen eine gerade Spielerzahl.');
    if(t.mode==='groups' && ![8,12].includes(n))throw Error('Zwei Gruppen + KO funktioniert mit 8 oder 12 Spielern.');
    if(t.teams.length!==n/2)throw Error('Es fehlen Teams.');
    const all=t.teams.flatMap(x=>x.playerIds);
    if(all.length!==n||new Set(all).size!==n||all.some(x=>!t.participantIds.includes(x)))throw Error('Jeder Teilnehmer muss genau einem Zweierteam zugeordnet sein.');
    if(t.teams.some(x=>!x.name?.trim()))throw Error('Bitte alle Teamnamen ausfüllen.');
  } else if(n%4!==0)throw Error('Americano und Mexicano benötigen 4, 8 oder 12 Spieler.');
  if(t.mode==='mexicano' && (!Number.isInteger(+t.rounds)||+t.rounds<1||+t.rounds>30))throw Error('Mexicano: 1–30 Runden einstellen.');
}
