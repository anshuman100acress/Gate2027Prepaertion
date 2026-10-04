/* Strict validation of authored TeX independent of browser error recovery. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),katex=require(path.join(root,'vendor/katex/katex.min.js'));
let expressions=0;const failures=[];
function inspect(value,location){
 if(typeof value==='string'){
  const math=/\.(equation|latex)$/.test(location)?[value]:Array.from(value.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$/g),m=>m[1]??m[2]??m[3]);
  for(const expression of math){if(!expression)continue;expressions++;try{katex.renderToString(expression,{throwOnError:true,strict:'error',trust:false});}catch(error){failures.push({location,expression,message:error.message});}}
 }else if(Array.isArray(value))value.forEach((x,i)=>inspect(x,`${location}[${i}]`));
 else if(value&&typeof value==='object')Object.entries(value).forEach(([key,x])=>inspect(x,`${location}.${key}`));
}
for(const file of ['syllabus.json','lesson-questions.json','questions.json','pyqs.json'])inspect(JSON.parse(fs.readFileSync(path.join(root,'data',file),'utf8')),file);
if(failures.length){console.error(failures);process.exit(1);}
console.log(`Passed: ${expressions} authored LaTeX expressions parse in strict mode.`);
