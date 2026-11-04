'use strict';

const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {mkdtempSync,rmSync} = require('node:fs');
const Module = require('node:module');
const {tmpdir} = require('node:os');
const path = require('node:path');
const {buildSync} = require('esbuild');

const revision = '2c3ef2aa49a3fd3bacf2a1f15b9f2b15aeb39372';
const repository = process.argv[2] || path.resolve(__dirname,'..');
const scratch = mkdtempSync(path.join(tmpdir(),'webnovel-old-writer-'));

class TFile {
  constructor(path) { this.path = path; }
}

function loadImporter() {
  const archive = execFileSync('git',['-C',repository,'archive',revision,'src']);
  execFileSync('tar',['-xf','-','-C',scratch],{input:archive});
  const output = path.join(scratch,'old-importer.cjs');
  buildSync({entryPoints:[path.join(scratch,'src/importer.ts')],outfile:output,bundle:true,
    platform:'node',format:'cjs',external:['obsidian']});
  const originalLoad = Module._load;
  try {
    Module._load = function(request,parent,isMain) {
      if (request === 'obsidian') return {TFile,normalizePath:value=>value,
        requestUrl:async ()=>({status:200,headers:{'content-type':'image/png'},arrayBuffer:new ArrayBuffer(8)})};
      return originalLoad.call(this,request,parent,isMain);
    };
    return require(output).Importer;
  } finally { Module._load = originalLoad; }
}

const first = {provider:'fanqie',id:'000000000000000000001',url:'https://fanqienovel.com/page/000000000000000000001'};
const second = {provider:'qidian',id:'0002',url:'https://www.qidian.com/book/0002/'};
const third = {provider:'fanqie',id:'000000000000000000003',url:'https://fanqienovel.com/page/000000000000000000003'};
const metadata = (ref,overrides={}) => ({...ref,title:'原书名',authors:['作者'],description:'来源完整简介',
  fetched_at:'2026-11-01T00:00:00.000Z',acquisition:'remote',
  evidence:{description:'详情页简介'},warnings:['首发年份未知'],...overrides});
const independent = {
  uid:'existing-uid',type:'work',media:'webnovel',title:'原书名',summary:'人工简介',rating:0,user_flag:false,
  webnovel_import:{schema_version:1,sources:[metadata(first,{retained_fields:{description:'2026-10-01T00:00:00.000Z'}}),metadata(second)],
    adopted:{title:{source_key:'fanqie:'+first.id,value:'原书名'},
      summary:{source_key:'manual:qidian:0002',value:'人工简介',evidence:'manual:用户补填'}},unknownLegacyField:{keep:true}},
};

function managed(pending) {
  const frontmatter = structuredClone(independent);
  frontmatter.schema_version = 3;
  Object.assign(frontmatter.webnovel_import,{schema_version:2,managed_by:'media-core'});
  if (pending) frontmatter.webnovel_import.handoff_pending = {version:1,provider:first.provider,id:first.id};
  assert.deepEqual(frontmatter.webnovel_import.sources,independent.webnovel_import.sources);
  assert.deepEqual(frontmatter.webnovel_import.adopted,independent.webnovel_import.adopted);
  return frontmatter;
}

function fixture(Importer,frontmatter,{downloadCovers=false}={}) {
  const file = new TFile('existing-work.md');
  const body = '\n# 本地正文\n\n我自己的笔记。\n';
  const files = new Map([[file.path,file]]);
  const counters = {writes:0,creates:0,covers:0};
  let bytes = JSON.stringify(frontmatter) + body;
  const app = {
    vault:{
      getMarkdownFiles:()=>[file],
      getAbstractFileByPath:name=>files.get(name),
      create:async ()=>{counters.creates++; throw Error('unexpected Work creation');},
      createFolder:async name=>files.set(name,{path:name}),
      createBinary:async name=>{counters.covers++; files.set(name,new TFile(name));},
    },
    metadataCache:{getFileCache:()=>({frontmatter})},
    fileManager:{processFrontMatter:async (_target,callback)=>{
      const next = structuredClone(frontmatter);
      callback(next);
      Object.assign(frontmatter,next);
      bytes = JSON.stringify(frontmatter) + body;
      counters.writes++;
    }},
  };
  const importer = new Importer(app,()=>({downloadCovers,coverFolder:'covers',summaryLength:200}));
  return {file,importer,counters,get bytes(){return bytes;}};
}

async function run() {
  const Importer = loadImporter();
  const control = fixture(Importer,structuredClone(independent));
  const updated = await control.importer.import(metadata(first,{title:'来源改名'}));
  assert.equal(updated.file,control.file);
  assert.equal(control.counters.writes,1);
  assert.ok(updated.preserved.includes('summary'));

  for (const pending of [true,false]) {
    const state = fixture(Importer,managed(pending));
    const before = state.bytes;
    assert.throws(()=>state.importer.sources(state.file),/schema_version 必须为 1/);
    for (const ref of [first,second]) {
      assert.throws(()=>state.importer.previewMatches(metadata(ref)),/已记录此来源.*不兼容/);
      await assert.rejects(state.importer.import(metadata(ref)),/已记录此来源.*不兼容/);
    }
    await assert.rejects(state.importer.import(metadata(third),state.file),/schema_version 必须为 1/);
    assert.deepEqual(state.counters,{writes:0,creates:0,covers:0});
    assert.equal(state.bytes,before);
  }
  const coverCase = fixture(Importer,managed(false),{downloadCovers:true});
  const beforeCover = coverCase.bytes;
  await assert.rejects(coverCase.importer.import(metadata(third,{cover_url:'https://example.invalid/cover.png'}),coverCase.file),
    /schema_version 必须为 1/);
  assert.deepEqual(coverCase.counters,{writes:0,creates:0,covers:1});
  assert.equal(coverCase.bytes,beforeCover);

  console.log('旧 schema 1 文件仍可更新。待完成与已完成交接均拒绝旧端刷新、重复建档和直接关联。');
  console.log('开启旧端封面下载时，直接关联可先生成一个未绑定封面。托管 Work 保持字节一致。');
}

run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>rmSync(scratch,{recursive:true,force:true}));
