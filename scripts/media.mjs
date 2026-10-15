#!/usr/bin/env node
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import path from 'node:path';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table as textTable} from './lib/format.mjs';
import {page,table,writeOut} from './lib/render.mjs';

export const reads={
 campaigns:'select * from campaigns order by name,id',
 'media-plan':'select * from media_plan order by campaign,starts_on,id',
 pacing:'select campaign,placement,currency,planned_cents,spent_cents,expected_cents,variance_cents,freshness from pacing order by campaign,placement,id',
 'launch-check':'select campaign,placement,starts_on,approved_by,blocking_checks from launch_check order by starts_on,id',
 reconcile:'select campaign,placement,currency,spent_cents,invoiced_cents,invoice_variance_cents from reconciliation order by campaign,placement,id',
 claims:'select c.*,p.name placement from claims c join placements p on p.id=c.placement_id order by p.name,c.name,c.id',
 overdue:'select * from overdue_tasks order by due_on,id',
 compliance:'select campaign,placement,rule,issue from compliance_issues order by campaign,placement,rule,issue',
 allocations:'select * from allocations order by campaign,channel',
 activity:'select * from events order by created_at,id',
};
const flags={
 ...Object.fromEntries(Object.keys(reads).map(x=>[x,[]])),attention:[], 'weekly-review':[],help:[],
 'add-campaign':['name','client','currency','budget','owner','start','end'],
 'add-placement':['campaign','name','vendor','channel','start','end','cost'],
 'update-placement':['placement','name','vendor','channel','start','end','cost'],
 'approve-placement':['placement','evidence'],
 'add-claim':['placement','name'], 'review-claim':['claim','evidence','until'],
 'log-delivery':['placement','day','spend','impressions','clicks','evidence'],
 'log-invoice':['placement','reference','amount','due'],
 'add-task':['campaign','name','owner','due'], 'complete-task':['task'],
 import:['campaign','file','map'],export:['out'],
 'draft-authorization':['campaign'],'draft-order':['placement']
};
const mutations=new Set(['add-campaign','add-placement','update-placement','approve-placement','add-claim','review-claim','log-delivery','log-invoice','add-task','complete-task','import']);
const args=process.argv.slice(2), cmd=args.shift()||'help';
const opts={};const positional=[];
try {
 if(!flags[cmd])throw Error(`Unknown command ${cmd}`);
 for(const arg of args){
  if(!arg.startsWith('--')){positional.push(arg);continue;}
  const at=arg.indexOf('='), k=arg.slice(2,at<0?undefined:at),v=at<0?true:arg.slice(at+1);
  if(Object.hasOwn(opts,k))throw Error(`Repeated flag --${k}`);
  if(![...flags[cmd],'json',...(mutations.has(cmd)?['actor','dry-run']:[])].includes(k))throw Error(`Unknown flag --${k}`);
  if(['json','dry-run'].includes(k)?v!==true:v===true||v==='')throw Error(`Invalid value for --${k}`);
  opts[k]=v;
 }
 if(cmd==='import'?positional.join(' ')!=='bionic':positional.length)throw Error('Unexpected arguments; import requires bionic');
 if(cmd==='help'){
  console.log(Object.entries(flags).map(([c,f])=>`${c}${c==='import'?' bionic':''} ${f.map(x=>'--'+x+'=VALUE').join(' ')}${mutations.has(c)?' --actor=NAME [--dry-run]':''} [--json]`).join('\n'));process.exit(0);
 }
 const db=await getDb();
 try {
  const today=(await db.query('select current_date::text as today'))[0].today;
  const req=k=>{if(typeof opts[k]!=='string'||!opts[k].trim())throw Error(`Required --${k}=VALUE`);return opts[k].trim();};
  const date=(v)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error(`Invalid ISO date: ${v}`);return v;};
  const money=v=>{if(!/^\d+(\.\d{1,2})?$/.test(String(v)))throw Error(`Invalid nonnegative amount: ${v}`);const [a,b='']=String(v).split('.');const n=Number(a)*100+Number(b.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>9000000000000)throw Error('Amount too large');return n;};
  const integer=v=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw Error(`Invalid nonnegative integer: ${v}`);return Number(v);};
  const resolve=async(t,s)=>{
   const rows=await db.query(`select * from ${t} where id::text=$1 or lower(name)=lower($1) or starts_with(id::text,lower($1)) order by name,id`,[s]);
   if(rows.length!==1)throw Error(rows.length?`Ambiguous ${t}: ${rows.map(r=>`${r.id} ${r.name}`).join('; ')}`:`No ${t} match: ${s}`);return rows[0];
  };
  const log=async(action,before,after)=>db.query('insert into events(actor,action,record_id,before_record,after_record) values($1,$2,$3,$4::jsonb,$5::jsonb)',[req('actor'),action,after?.id||before?.id||null,before?JSON.stringify(before):null,JSON.stringify(after)]);
  const insert=async(t,obj)=>{const keys=Object.keys(obj);return (await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(obj)))[0];};
  const update=async(t,before,obj)=>{const keys=Object.keys(obj);return(await db.query(`update ${t} set ${keys.map((k,i)=>`${k}=$${i+1}`).join(',')} where id=$${keys.length+1} returning *`,[...Object.values(obj),before.id]))[0];};
  const flight=async(p)=>{
   date(p.starts_on);date(p.ends_on);
   const c=(await db.query('select * from campaigns where id=$1',[p.campaign_id]))[0];
   if(p.starts_on>p.ends_on||p.starts_on<c.starts_on||p.ends_on>c.ends_on)throw Error('Flight dates must fit inside campaign dates');
   if(p.id){const outside=await db.query('select id from delivery where placement_id=$1 and (day<$2 or day>$3)',[p.id,p.starts_on,p.ends_on]);if(outside.length)throw Error('Flight date change would exclude recorded delivery');}
   return c;
  };
  let out;
  const isMutation=mutations.has(cmd);
  if(isMutation){req('actor');await db.exec('BEGIN');await db.exec('LOCK TABLE campaigns,placements,delivery,invoices,claims,tasks,events IN EXCLUSIVE MODE');}
  try {
   if(reads[cmd])out=await db.query(reads[cmd]);
   else if(['attention','weekly-review'].includes(cmd)){
    out={pacing:await db.query(reads.pacing),compliance:await db.query(reads.compliance),overdue:await db.query(reads.overdue),reconciliation:await db.query(reads.reconcile)};
   } else if(cmd==='add-campaign'){
    const c={name:req('name'),client:req('client'),currency:req('currency'),budget_cents:money(req('budget')),owner:req('owner'),starts_on:date(req('start')),ends_on:date(req('end'))};
    out=await insert('campaigns',c);await log(cmd,null,out);
   } else if(cmd==='add-placement'){
    const c=await resolve('campaigns',req('campaign'));
    const p={campaign_id:c.id,name:req('name'),vendor:req('vendor'),channel:req('channel'),starts_on:date(req('start')),ends_on:date(req('end')),planned_cents:money(req('cost'))};await flight(p);
    out=await insert('placements',p);await log(cmd,null,out);
   } else if(cmd==='update-placement'){
    const p=await resolve('placements',req('placement'));const changes={};
    for(const [flag,key] of Object.entries({name:'name',vendor:'vendor',channel:'channel',start:'starts_on',end:'ends_on',cost:'planned_cents'}))if(opts[flag]!==undefined)changes[key]=flag==='cost'?money(req(flag)):req(flag);
    if(!Object.keys(changes).length)throw Error('Provide at least one changed field');await flight({...p,...changes});
    out=await update('placements',p,{...changes,approved_by:null,approved_at:null,approval_evidence:null});await log(cmd,p,out);
   } else if(cmd==='approve-placement'){
    const p=await resolve('placements',req('placement'));await flight(p);
    const issues=await db.query("select * from compliance_issues where (id=$1 or (campaign_id=$2 and rule='BUDGET')) and rule<>'PLAN_APPROVAL'",[p.id,p.campaign_id]);
    if(issues.length)throw Error(`Approval blocked: ${issues.map(r=>r.issue).join('; ')}`);
    out=await update('placements',p,{approved_by:req('actor'),approved_at:new Date().toISOString(),approval_evidence:req('evidence')});await log(cmd,p,out);
   } else if(cmd==='add-claim'){
    const p=await resolve('placements',req('placement'));out=await insert('claims',{placement_id:p.id,name:req('name')});await log(cmd,null,out);
    const changed=await update('placements',p,{approved_by:null,approved_at:null,approval_evidence:null});await log('invalidate-approval',p,changed);
   } else if(cmd==='review-claim'){
    const c=await resolve('claims',req('claim'));const until=date(req('until'));if(until<today)throw Error('Review expiry cannot be in the past');
    out=await update('claims',c,{evidence:req('evidence'),reviewer:req('actor'),reviewed_on:today,review_due:until});await log(cmd,c,out);
   } else if(cmd==='log-delivery'){
    const p=await resolve('placements',req('placement')),day=date(req('day'));
    if(day>today||day<p.starts_on||day>p.ends_on)throw Error('Actuals date must be inside the flight and not in the future');
    const data={placement_id:p.id,day,spend_cents:money(req('spend')),impressions:integer(req('impressions')),clicks:integer(req('clicks')),evidence:req('evidence')};
    const old=(await db.query('select * from delivery where placement_id=$1 and day=$2',[p.id,day]))[0];out=old?await update('delivery',old,data):await insert('delivery',data);await log(cmd,old,out);
   } else if(cmd==='log-invoice'){
    const p=await resolve('placements',req('placement'));out=await insert('invoices',{placement_id:p.id,reference:req('reference'),amount_cents:money(req('amount')),due_on:date(req('due'))});await log(cmd,null,out);
   } else if(cmd==='add-task'){
    const c=await resolve('campaigns',req('campaign'));out=await insert('tasks',{campaign_id:c.id,name:req('name'),owner:req('owner'),due_on:date(req('due'))});await log(cmd,null,out);
   } else if(cmd==='complete-task'){
    const t=await resolve('tasks',req('task'));if(t.done_at)throw Error('Task is already complete');out=await update('tasks',t,{done_at:new Date().toISOString()});await log(cmd,t,out);
   } else if(cmd==='import'){
    const c=await resolve('campaigns',req('campaign')),file=path.resolve(req('file'));let rows;
    if(file.toLowerCase().endsWith('.xlsx')){
     const {default:ExcelJS}=await import('exceljs');const w=new ExcelJS.Workbook();await w.xlsx.readFile(file);
     const sheet=w.getWorksheet('Data Sheet');if(!sheet)throw Error('Workbook must contain Data Sheet');
     const vals=[];sheet.eachRow({includeEmpty:true},r=>vals.push(r.values.slice(1).map(v=>{
      if(v instanceof Date)return v.toISOString().slice(0,10);
      if(v&&typeof v==='object'){if('formula' in v||'sharedFormula' in v)throw Error('Formula cells are not accepted; save a values-only worksheet');if(v.richText)return v.richText.map(x=>x.text).join('');throw Error('Unsupported cell type');}return v??'';
     })));
     const header=vals.shift()||[];if(!header.length||new Set(header.map(x=>String(x).trim().toLowerCase())).size!==header.length||header.some(x=>!String(x).trim()))throw Error('Workbook requires unique nonempty headers');
     rows=vals.filter(r=>r.some(x=>String(x).trim())).map(r=>Object.fromEntries(header.map((h,i)=>[String(h).trim(),String(r[i]??'')])));
    }else if(file.toLowerCase().endsWith('.csv'))rows=parseCsv(readFileSync(file,'utf8'));else throw Error('Use .csv or .xlsx');
    if(!rows.length)throw Error('Empty import');
    const mapping=opts.map?JSON.parse(readFileSync(req('map'),'utf8')):{};
    const defaults={line:'Line ID',placement:'Placement ID',name:'Placement Name',vendor:'Program',channel:'Channel',start:'Start Date',end:'End Date',cost:'Net Media Cost'};
    for(const [k,v] of Object.entries(mapping))if(!Object.hasOwn(defaults,k)||typeof v!=='string'||!v)throw Error(`Invalid mapping: ${k}`);
    const cols={...defaults,...mapping},seen=new Set(),summary={inserted:0,updated:0,unchanged:0};
    for(const [i,r] of rows.entries()){
     const val=k=>{const v=pick(r,cols[k]).trim();if(!v)throw Error(`Row ${i+2}: missing ${cols[k]}`);return v;};
     if(pick(r,'Group ID','Group Type','Flight Group Using'))throw Error(`Row ${i+2}: packages and roadblocks require a separate mapping`);
     if(pick(r,'Bionic ID').toUpperCase()==='DELETE')throw Error('Deletion directives are not imported');
     const rowCurrency=pick(r,'Currency','Currency Code').trim();if(rowCurrency&&rowCurrency!==c.currency)throw Error(`Row ${i+2}: currency differs from the campaign`);
     const source_line=val('line');if(seen.has(source_line))throw Error(`Duplicate Line ID ${source_line}`);seen.add(source_line);
     const cost=val('cost');if(!/^\d+(\.\d{1,2})?$/.test(cost))throw Error(`Row ${i+2}: cost must be a plain decimal without symbols or separators`);
     const p={campaign_id:c.id,source_line,source_placement:val('placement'),name:val('name'),vendor:val('vendor'),channel:val('channel'),starts_on:date(val('start')),ends_on:date(val('end')),planned_cents:money(cost),source_row:JSON.stringify(r)};await flight(p);
     const old=(await db.query('select * from placements where campaign_id=$1 and source_line=$2',[c.id,source_line]))[0];
     if(old){
      await flight({...p,id:old.id});
      const same=Object.entries(p).filter(([k])=>k!=='source_row').every(([k,v])=>String(old[k])===String(v)) && JSON.stringify(old.source_row,Object.keys(old.source_row).sort())===JSON.stringify(r,Object.keys(r).sort());
      if(same){summary.unchanged++;continue;}
      out=await update('placements',old,{...p,approved_by:null,approved_at:null,approval_evidence:null});summary.updated++;await log('import-bionic',old,out);
     }else{out=await insert('placements',p);summary.inserted++;await log('import-bionic',null,out);}
    }
    out={...summary,currency:c.currency,notice:'Planned costs only; no approvals, claims, actuals or invoices imported.'};
   } else if(cmd==='export'){
    out={format:'media-planning-archive-v1',created:new Date().toISOString(),records:{}};await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');
    try{for(const t of ['campaigns','placements','delivery','invoices','claims','tasks','events'])out.records[t]=await db.query(`select * from ${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
    const f=path.resolve(req('out'));mkdirSync(path.dirname(f),{recursive:true});writeFileSync(f,JSON.stringify(out,null,2)+'\n',{flag:'wx'});out={file:f,counts:Object.fromEntries(Object.entries(out.records).map(([k,v])=>[k,v.length]))};
   } else if(cmd==='draft-authorization'||cmd==='draft-order'){
    const isOrder=cmd==='draft-order',record=await resolve(isOrder?'placements':'campaigns',req(isOrder?'placement':'campaign'));
    const field=isOrder?'id':'campaign_id';const items=await db.query(`select * from media_plan where ${field}=$1 order by starts_on,id`,[record.id]);
    const issues=await db.query(`select campaign,placement,rule,issue from compliance_issues where ${isOrder?'(id=$1 or (campaign_id=$2 and rule=\'BUDGET\'))':'campaign_id=$1'}`,isOrder?[record.id,record.campaign_id]:[record.id]);
    const file=writeOut('drafts',`${cmd}-${record.id}-${Date.now()}`,page({title:isOrder?'DRAFT insertion order':'DRAFT media authorization',subtitle:record.name,sections:[{title:'Review before use',note:'Internal draft only. No supplier booking, client signature, sending or payment has occurred.',html:table(issues)},{title:'Planned media',html:table(items)}]}));out={file,open_checks:issues.length};
   }
   if(isMutation)await db.exec(opts['dry-run']?'ROLLBACK':'COMMIT');
  }catch(e){if(isMutation)await db.exec('ROLLBACK');throw e;}
  if(opts.json)console.log(JSON.stringify(out,null,2));
  else {
   const show=rows=>{if(!rows.length)return '(none)';return textTable(rows,Object.keys(rows[0]).map(k=>({key:k,label:k.replace(/_cents$/,''),format:(v,r)=>k.endsWith('_cents')?`${r.currency||''} ${(Number(v)/100).toFixed(2)}`.trim():typeof v==='object'?JSON.stringify(v):v,width:70})));};
   if(Array.isArray(out))console.log(show(out));else if(['weekly-review','attention'].includes(cmd))for(const [k,v] of Object.entries(out))console.log(k+'\n'+show(v));else console.log(JSON.stringify(out,null,2));
   if(opts['dry-run'])console.log('Preview only. No records changed.');
  }
 } finally {await db.close();}
} catch(e){console.error(e.message);process.exitCode=1;}
