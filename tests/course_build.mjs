import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,cp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildSite} from '../scripts/build.mjs';
import {protectedCatalog,readCourseCatalog,publicCourseSettings,courseRows} from '../scripts/course-catalog.mjs';
import {assignCourseOwner} from '../scripts/set-course-owner.mjs';
import {publishCourse} from '../scripts/publish-course.mjs';
if ((await readCourseCatalog(process.cwd())).publicOnly) {
 await import('./course_release.mjs');
 process.exit(0);
}
const dir=await mkdtemp(join(tmpdir(),'gatewise-course-build-'));
try{
 const catalog=await readCourseCatalog(process.cwd());const reduced=protectedCatalog(catalog);
 assert.equal(reduced.syllabus.flatMap(s=>s.lessons).filter(l=>!l.locked).length,3);
 assert.equal(reduced.syllabus.flatMap(s=>s.lessons).filter(l=>l.locked).length,69);
 assert.equal(reduced.pyqs.length,1);assert.equal(reduced['lesson-questions'].length,6);
 assert.equal(reduced.questions.length+reduced.pyqs.length+reduced['lesson-questions'].length,10);
 assert.equal(reduced.pyqs[0].id,'pyq-2026_CS1-GA-3');
 for(const l of reduced.syllabus.flatMap(s=>s.lessons))for(const key of ['studyCards','examClinic','premiumTopics','premiumPreviewLessons'])assert.equal(l[key],undefined,'Public lesson leaked '+key);
 assert(reduced.questions.every(q=>!q.premium));
 const rows=courseRows(catalog,'gate-cs-2027').lessons;
 assert.equal(rows.filter(r=>r.is_preview).length,3);
 for(const row of rows.filter(r=>r.is_preview))for(const key of ['studyCards','examClinic','premiumTopics'])assert.equal(row.payload[key],undefined,'RLS preview row leaked '+key);
 assert.equal(rows.flatMap(r=>r.payload.premiumPreviewLessons||[]).length,3);
 for(const l of reduced.syllabus.flatMap(s=>s.lessons).filter(l=>l.locked)){assert.equal(l.tutorials.length,0);assert.equal(l.examples.length,0);assert.equal(l.checks.length,0);assert(l.workedExampleCount>0)}
 const fixture=join(dir,'source');await mkdir(join(fixture,'data'),{recursive:true});
 for(const name of ['syllabus','questions','pyqs','lesson-questions','topic-coverage','papers'])await cp('data/'+name+'.json',join(fixture,'data',name+'.json'));
 const source=JSON.parse(await readFile(join(fixture,'data/syllabus.json'),'utf8'));
 source[0].lessons[1].tutorials[0].body+=' PREMIUM_ONLY_CANARY';
 source[0].lessons[0].premiumTopics[0].explanation+=' PREMIUM_PREVIEW_CANARY';await writeFile(join(fixture,'data/syllabus.json'),JSON.stringify(source));
 const env={GATEWISE_COURSE_MODE:'protected',GATEWISE_SUPABASE_URL:'https://gatewise-test.supabase.co',GATEWISE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_public',GATEWISE_SUPABASE_SERVICE_ROLE_KEY:'sb_secret_privateCanary',GATEWISE_RAZORPAY_KEY_ID:'rzp_test_PUBLIC',GATEWISE_RAZORPAY_KEY_SECRET:'PAYMENT_SECRET_CANARY',GATEWISE_RAZORPAY_WEBHOOK_SECRET:'WEBHOOK_SECRET_CANARY'};
 const out=join(dir,'protected');await buildSite({outdir:out,env,catalogRoot:fixture});
 const course=await readFile(join(out,'course-config.js'),'utf8');assert(course.includes('"checkoutEnabled":true'));
 const files=['course-config.js','cloud-config.js','course.js','app.js','pyq-practice.js','data/syllabus.json','data/questions.json','data/pyqs.json','data/lesson-questions.json','data/topic-coverage.json'];
 for(const file of files){const text=await readFile(join(out,file),'utf8');for(const secret of ['PREMIUM_ONLY_CANARY','PREMIUM_PREVIEW_CANARY','privateCanary','PAYMENT_SECRET_CANARY','WEBHOOK_SECRET_CANARY'])assert(!text.includes(secret),file+' leaked '+secret)}
 for(const name of ['server','api','supabase','scripts','tests','.env','data/content','data/build.py'])await assert.rejects(()=>access(join(out,name)));
 const publicPyqs=JSON.parse(await readFile(join(out,'data/pyqs.json'),'utf8'));
 assert.deepEqual(publicPyqs,reduced.pyqs);
 for(const q of catalog.pyqs.filter(q=>q.id!==publicPyqs[0].id))assert(!JSON.stringify(publicPyqs).includes(q.id),'Locked PYQ shipped in public build');
 assert.equal(publicCourseSettings({...env,GATEWISE_RAZORPAY_KEY_SECRET:''}).checkoutEnabled,false);
 await assert.rejects(()=>buildSite({outdir:join(dir,'bad'),env:{GATEWISE_COURSE_MODE:'protected'}}));
 const open=join(dir,'open');await buildSite({outdir:open,env:{},catalogRoot:fixture});assert((await readFile(join(open,'data/syllabus.json'),'utf8')).includes('PREMIUM_ONLY_CANARY'));
 let verified=0,assigned=0;const uid='11111111-1111-4111-8111-111111111111';
 const client={auth:{admin:{getUserById:async id=>{verified++;return {data:{user:{id}}}}}},rpc:async(name,args)=>{assigned++;assert.equal(name,'assign_course_owner');assert.equal(args.p_user_id,uid);return {data:{userId:uid,role:'owner',changed:true}}}};
 await assignCourseOwner(uid,{client});assert.equal(verified,1);assert.equal(assigned,1);
 await assert.rejects(()=>assignCourseOwner('not-a-uuid',{client}));
 await assert.rejects(()=>assignCourseOwner(uid,{client:{...client,auth:{admin:{getUserById:async()=>({data:{user:null}})}}}}));assert.equal(assigned,1,'unverified account cannot be assigned');
 const writes=[];await publishCourse({env:{},client:{from:table=>({upsert:async rows=>{writes.push({table,rows});return {data:null,error:null}}})}});
 assert.equal(writes.filter(w=>w.table==='course_lessons').flatMap(w=>w.rows).length,72);assert.equal(writes.find(w=>w.table==='course_resources').rows.length,3);
 console.log('Protected build checks passed: 3 previews/69 restricted lessons, exactly 10 sample questions, paid preview additions protected through RLS rows, no premium canary or secrets, and 72-lesson upload.');
}finally{await rm(dir,{recursive:true,force:true})}
