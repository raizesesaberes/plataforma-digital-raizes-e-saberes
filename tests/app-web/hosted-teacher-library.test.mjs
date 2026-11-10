import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from '../../mobile/node_modules/typescript/lib/typescript.js';
import {libraryEditionClient} from '../../library-edition-client.mjs';

const source = path => readFile(new URL(`../../mobile/src/${path}`, import.meta.url), 'utf8');
const studentBook = {book_id:'student-book-fixture', title:'Livro sintético do aluno', page_count:3, audience:'student'};
const teacherBook = {book_id:'teacher-book-fixture', title:'Livro sintético do professor', page_count:3, audience:'teacher'};

// Exercise the rendered home controls without browser, effects or backend access.
test('each home exposes one working Biblioteca control at narrow widths, including the teacher', async () => {
  const profilesContext = {exports:{}};
  vm.runInNewContext(ts.transpileModule(await source('data/fixtures.ts'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS},
  }).outputText, profilesContext);
  const profiles = profilesContext.exports.appProfiles;
  const homeSource = await source('screens/ExperienceHome.tsx');
  const react = {
    createElement:(type, props, ...children) => ({type, props:{...props, children}}),
    useState:initial => [initial, () => {}], useEffect:() => {},
  };
  const walk = node => Array.isArray(node) ? node.flatMap(walk) : node && typeof node === 'object' ? [node, ...walk(node.props?.children)] : [];
  for (const width of [320, 390]) {
    const context = {exports:{}, require:name => {
      if (name === 'react') return {...react, default:react};
      if (name === 'react-native') return {View:'View', Text:'Text', Image:'Image', Pressable:'Pressable', StyleSheet:{create:x => x}, useWindowDimensions:() => ({width})};
      if (name.includes('readBetaPolicy')) return {READ_BETA:true, isReadBetaRoute:(_role, route) => ['home','library','profile','classes','notifications'].includes(route)};
      if (name.includes('AppIcon')) return {AppIcon:'AppIcon'};
      if (name.includes('services/library')) return {};
      if (name.endsWith('.png')) return name;
      throw Error(`Unexpected test import: ${name}`);
    }};
    vm.runInNewContext(ts.transpileModule(homeSource, {
      compilerOptions:{module:ts.ModuleKind.CommonJS, jsx:ts.JsxEmit.React},
    }).outputText, context);
    for (const role of ['professor', 'crescer', 'fundamental']) {
      const opened = [];
      const tree = context.exports.ExperienceHome({profile:profiles[role], session:null, hosted:true, onOpen:key => opened.push(key), onLogout:() => {}});
      const buttons = walk(tree).filter(node => node.type === 'Pressable' && node.props.accessibilityLabel === 'Biblioteca');
      assert.equal(buttons.length, 1, `${role} at ${width}px`);
      buttons[0].props.onPress();
      assert.deepEqual(opened, ['library']);
      assert.equal(profiles[role].modules.filter(item => item.key === 'library').length, 1);
    }
  }
});

let moduleGeneration = 0;
async function sessionModules() {
  const urls = {};
  const generation = ++moduleGeneration;
  for (const name of ['readBetaPolicy', 'webSessionCore', 'library', 'webSession']) {
    let code = await source(`services/${name}.ts`);
    code = code.replace("process.env.EXPO_PUBLIC_REAL_READ_BETA === 'true'", 'true');
    let js = ts.transpile(code, {target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ES2022});
    for (const [dependency, url] of Object.entries(urls)) {
      for (const ext of ['', '.ts']) js = js.replaceAll(`'./${dependency}${ext}'`, JSON.stringify(url)).replaceAll(`"./${dependency}${ext}"`, JSON.stringify(url));
    }
    urls[name] = `data:text/javascript;base64,${Buffer.from(`${js}\n// isolated fixture ${generation}`).toString('base64')}`;
  }
  return {web:await import(urls.webSession), library:await import(urls.library)};
}

async function withSession(role, run) {
  const {web, library} = await sessionModules();
  const saved = {fetch:globalThis.fetch, window:globalThis.window, document:globalThis.document};
  const uid = `fixture-${role}`;
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = `x.${Buffer.from(JSON.stringify({sub:uid, exp:expires})).toString('base64url')}.x`;
  const teacher = role === 'professor';
  const storage = new Map([['raizes:supabase-auth-session', JSON.stringify({access_token:token, user:{id:uid}, expires_at:expires, platform_role:teacher ? 'aluno' : 'professor'})]]);
  const config = {profileRole:teacher ? 'professor' : 'aluno', profileId:uid, contextId:uid, school:'fixture-school', links:1, books:teacher ? [studentBook, teacherBook] : [studentBook], denyRead:false, asset:null};
  const calls = [];
  globalThis.window = {
    location:{protocol:'https:', hostname:'fixture.invalid', pathname:'/app/', search:'?role=professor&school_id=other', hash:'#library:teacher'},
    RAIZES_SUPABASE:{url:'https://backend.invalid', anonKey:'sb_publishable_fixture'},
    localStorage:{getItem:key => storage.get(key), removeItem:key => storage.delete(key)},
    addEventListener(){}, setInterval(){}, setTimeout, clearTimeout,
  };
  globalThis.document = {visibilityState:'visible', addEventListener(){}};
  globalThis.fetch = async (url, init = {}) => {
    assert.ok(url.startsWith('https://backend.invalid/'), 'Tests never contact a real backend');
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({url, body, method:init.method || 'GET'});
    if (url.endsWith('/auth/v1/user')) return Response.json({id:uid});
    if (url.endsWith('/rpc/app_get_self_profile')) return Response.json([{profile_id:config.profileId, platform_role:config.profileRole, status:'active', student_ids:['fixture-student']}]);
    if (url.endsWith('/rpc/teacher_get_context')) return Response.json([{profile_id:config.contextId, teacher_id:'fixture-teacher', school_id:config.school, active_class_links:config.links}]);
    if (url.endsWith('/rpc/student_get_context')) return Response.json([{student_id:'fixture-student', school_id:config.school, class_id:'fixture-class', segment:role === 'crescer' ? 'EDUCACAO_INFANTIL' : 'ENSINO_FUNDAMENTAL'}]);
    if (url.endsWith('/rpc/library_list_editions')) return Response.json(config.books);
    if (url.endsWith('/functions/v1/library-edition-read-access')) {
      if (config.denyRead) return Response.json({ok:false, code:'EDITION_ACCESS_DENIED'}, {status:403});
      return Response.json(config.asset ? {ok:true, asset:config.asset} : {ok:true, manifest:{pageCount:3, firstPage:1, lastPage:3}});
    }
    if (url.endsWith('/functions/v1/library-edition-search')) return Response.json({ok:true, results:[], total:0});
    throw Error(`Unexpected mock request: ${url}`);
  };
  const clientFor = session => libraryEditionClient({
    rpc:async (name, args = {}) => ({data:await library.rpc(session, name, args)}),
    functions:{invoke:async (name, {body}) => ({data:await web.callPlatformLibraryFunction(session, name, body)})},
  });
  try {
    web.enablePlatformSession();
    await run({web, config, calls, clientFor});
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.window === undefined) delete globalThis.window; else globalThis.window = saved.window;
    if (saved.document === undefined) delete globalThis.document; else globalThis.document = saved.document;
  }
}

test('teacher and both student profiles use canonical session and the same server-scoped library contracts', async () => {
  for (const role of ['professor', 'crescer', 'fundamental']) await withSession(role, async ({web, config, calls, clientFor}) => {
    const loaded = await web.loadPlatformSession();
    assert.equal(loaded.role, role, 'URL and stored roles do not choose the profile');
    assert.deepEqual(calls.map(call => new URL(call.url).pathname), ['/auth/v1/user', '/rest/v1/rpc/app_get_self_profile', `/rest/v1/rpc/${role === 'professor' ? 'teacher' : 'student'}_get_context`]);
    const client = clientFor(loaded.session);
    assert.deepEqual(await client.list(), config.books);
    const selected = config.books.at(-1);
    await client.read(selected.book_id);
    await client.search(selected.book_id, 'texto');
    assert.deepEqual(calls.slice(3).map(({url, body}) => ({path:new URL(url).pathname, body})), [
      {path:'/rest/v1/rpc/library_list_editions', body:{}},
      {path:'/functions/v1/library-edition-read-access', body:{bookId:selected.book_id, assetKind:'manifest'}},
      {path:'/functions/v1/library-edition-search', body:{bookId:selected.book_id, query:'texto', offset:0}},
    ]);
    const before = calls.length;
    await assert.rejects(clientFor({...loaded.session}).list(), /session_unverified/);
    assert.equal(calls.length, before, 'A cloned or forged session never dispatches');
  });
});

test('invalid canonical teacher identity, role or school context prevents any library request', async () => {
  for (const patch of [{profileId:'other-user'}, {profileRole:'admin'}, {contextId:'other-teacher'}, {school:null}, {links:0}]) {
    await withSession('professor', async ({web, config, calls}) => {
      Object.assign(config, patch);
      await assert.rejects(web.loadPlatformSession());
      assert.ok(calls.every(call => !call.url.includes('library')));
      assert.equal(web.currentPlatformSessionIdentity(), null);
    });
  }
});

test('server denies a student request for a teacher-only edition and invalidates later reads', async () => {
  await withSession('fundamental', async ({web, config, calls, clientFor}) => {
    const loaded = await web.loadPlatformSession();
    const client = clientFor(loaded.session);
    assert.deepEqual(await client.list(), [studentBook]);
    config.denyRead = true;
    await assert.rejects(client.read(teacherBook.book_id));
    assert.equal(web.currentPlatformSessionIdentity(), null);
    const before = calls.length;
    await assert.rejects(client.read(studentBook.book_id));
    assert.equal(calls.length, before);
  });
});

test('teacher library rejects malformed catalogue and untrusted signed asset URLs without fallback', async () => {
  await withSession('professor', async ({web, config, calls, clientFor}) => {
    const loaded = await web.loadPlatformSession();
    const client = clientFor(loaded.session);
    for (const books of [null, {}, [{...teacherBook, audience:'admin'}], [{...teacherBook, page_count:'3'}]]) {
      config.books = books;
      await assert.rejects(client.list(), /invalid_edition_list/);
    }
    for (const signedUrl of ['javascript:alert(1)', 'data:image/svg+xml,test', 'http://backend.invalid/page', 'https://other.invalid/page', 'https://user:password@backend.invalid/page', '/storage/page']) {
      config.asset = {kind:'page', pageNumber:1, signedUrl};
      await assert.rejects(client.read(teacherBook.book_id, 'page', 1), /invalid_edition_asset_url/);
    }
    assert.ok(calls.every(call => !call.url.includes('student_get_library_books') && !call.url.includes('save')));
  });
});

// Synthetic transport proves client behavior, not live RLS, licences or cross-school authorization.
