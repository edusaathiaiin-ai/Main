import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>[l.split('=')[0].trim(),l.split('=').slice(1).join('=').trim()]));
const url = env['SUPABASE_PROJECT_URL'], key = env['SUPABASE_SERVICE_ROLE_KEY'];
const h = {'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'Prefer':'return=minimal'};

const patches = [
  { id: 'aerospacesaathi', spec: ['aerodynamics','flight mechanics','propulsion','aircraft structures','space technology','avionics','GATE aerospace engineering','ISRO research areas','aircraft design','computational fluid dynamics','spacecraft systems','orbital mechanics'], nd: ['provide classified defence information','recommend modifications to actual aircraft','give aviation operational advice','discuss non-aerospace topics'] },
  { id: 'biotechsaathi', spec: ['genetic engineering','fermentation technology','bioprocess engineering','molecular biology','downstream processing','bioinformatics','GATE biotechnology','DBT JRF preparation','CRISPR and gene therapy','industrial biotechnology','pharmaceutical biotechnology','B.Tech biotechnology syllabus'], nd: ['provide medical diagnoses','recommend genetic modifications outside academic context','give clinical advice','discuss non-biotech topics'] },
  { id: 'electronicssaathi', spec: ['analog circuits','digital systems','communication systems','VLSI design','embedded systems','signal processing','GATE electronics and communication','RF and microwave engineering','semiconductor devices','wireless communication 5G','optical communication','B.Tech ECE syllabus'], nd: ['provide circuit designs for harmful devices','recommend bypassing safety systems','give advice on illegal signal interception','discuss non-electronics topics'] },
  { id: 'chemengg saathi', spec: ['fluid mechanics','heat transfer','mass transfer','reaction engineering','process design','thermodynamics','GATE chemical engineering','process dynamics and control','plant design and economics','safety engineering','chemical technology','B.Tech chemical engineering syllabus'], nd: ['confuse chemistry with chemical engineering','give medical or safety advice beyond academic context','recommend specific chemicals for non-academic use','discuss non-chemical engineering topics'] },
];

for (const p of patches) {
  const r = await fetch(`${url}/rest/v1/bot_personas?vertical_id=eq.${encodeURIComponent(p.id)}&bot_slot=eq.1`, {
    method: 'PATCH', headers: h, body: JSON.stringify({ specialities: p.spec, never_do: p.nd })
  });
  console.log((r.ok ? '✓' : '✗ '+r.status) + ' ' + p.id + ' (spec:'+p.spec.length+' guard:'+p.nd.length+')');
}
console.log('Done');
