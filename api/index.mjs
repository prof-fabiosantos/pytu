import {readHistory} from '../history-cloud.mjs';
import {dateRange,csv} from '../history.mjs';
import {cloudEvidence,reserveChat} from '../cloud.mjs';
import {resolveLocation} from '../locations.mjs';
import {instructions} from '../agent-instructions.mjs';
function json(res,status,value,shared=false){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(shared?{'Vercel-CDN-Cache-Control':'public, s-maxage=300'}:{}),'X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
export default async function handler(req,res){
 try{
  const url=new URL(req.url,'https://pytu.invalid');const route=url.searchParams.get('route')??url.pathname.split('/').pop();
  if(route==='history'&&req.method==='GET'){
   let days;try{days=dateRange(url.searchParams.get('start'),url.searchParams.get('end'));}catch{return json(res,400,{error:'Selecione datas válidas em um intervalo de até 31 dias.'});}
   const data=await readHistory(days);const type=url.searchParams.get('csv');
   if(type){if(!['air','fire'].includes(type))return json(res,400,{error:'Tipo CSV inválido.'});res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="pytu-'+type+'-'+days[0]+'-'+days.at(-1)+'.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(csv(data.days.flatMap(d=>d[type]),type));}
   return json(res,200,data,true);
  }
  if(route==='collect'){
   if(req.method!=='GET'||!process.env.CRON_SECRET||req.headers.authorization!=='Bearer '+process.env.CRON_SECRET)return json(res,401,{error:'Não autorizado'});
   await cloudEvidence({force:true});return json(res,200,{ok:true});
  }
  if(route==='evidence'&&req.method==='GET')return json(res,200,await cloudEvidence(),true);
  if(route!=='chat')return json(res,404,{error:'Rota não encontrada'});
  if(req.method!=='POST')return json(res,405,{error:'Método não permitido'});
  if(req.headers.origin&&req.headers.origin!=='https://'+req.headers.host)return json(res,403,{error:'Origem não permitida'});
  if(!process.env.GEMINI_API_KEY)return json(res,503,{error:'IA indisponível'});
  let data=req.body;if(!data){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>24000)return json(res,413,{error:'Mensagem muito longa'});}try{data=JSON.parse(raw);}catch{return json(res,400,{error:'Mensagem inválida'});}}
  if(typeof data==='string'){try{data=JSON.parse(data);}catch{return json(res,400,{error:'Mensagem inválida'});}}
  if(!data||Buffer.byteLength(JSON.stringify(data))>24000)return json(res,413,{error:'Mensagem muito longa'});
  const selectedLocation=resolveLocation(data.locationId);
  if(!selectedLocation||typeof data.question!=='string'||!data.question.trim()||data.question.length>1500)return json(res,400,{error:'Selecione um bairro e escreva uma pergunta de até 1.500 caracteres.'});
  if(!await reserveChat())return json(res,429,{error:'Limite de uso do piloto atingido (6 perguntas por minuto e 100 por dia, compartilhadas). Tente mais tarde.'});
  const evidence=await cloudEvidence();const municipalities={};if(evidence.fire&&!evidence.fire.stale)for(const f of evidence.fire.points)municipalities[f.municipality]=(municipalities[f.municipality]??0)+1;
  const facts={...evidence,fire:evidence.fire?{...evidence.fire,points:undefined,count:evidence.fire.stale?null:evidence.fire.points.length,geographicScope:'ESTADO DO AMAZONAS, cobertura parcial, detecções não incêndios únicos',municipalities:Object.entries(municipalities).sort((a,b)=>b[1]-a[1]).slice(0,8)}:null,selectedLocation};
  const history=Array.isArray(data.history)?data.history.slice(-6).filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content.slice(0,2500)}]})):[];
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:instructions+'\nEVIDENCIAS: '+JSON.stringify(facts)}]},contents:[...history,{role:'user',parts:[{text:data.question}]}],generationConfig:{temperature:.2,maxOutputTokens:1800,thinkingConfig:{thinkingBudget:0}}}),signal:AbortSignal.timeout(55000)});
  if(!response.ok)return json(res,502,{error:'Gemini indisponível. Tente novamente mais tarde.'});const result=await response.json();const candidate=result.candidates?.[0];const answer=candidate?.content?.parts?.filter(p=>typeof p.text==='string'&&!p.thought).map(p=>p.text).join('\n');
  if(!answer||candidate.finishReason!=='STOP')return json(res,502,{error:'A IA não retornou uma resposta completa.'});
  return json(res,200,{answer,model:'gemini-2.5-flash',evidenceTime:evidence.generatedAt,sources:evidence.sources});
 }catch(e){console.error('PYTU:',e.name);return json(res,503,{error:'Serviço temporariamente indisponível. Tente novamente em instantes.'});}
}
