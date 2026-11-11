import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createPersonalLearningHandler} from './handler.mjs';
import {LearningError} from './domain.mjs';

const url = Deno.env.get('SUPABASE_URL') || '';
const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const admin = url && secret ? createClient(url, secret, {auth: {persistSession: false, autoRefreshToken: false}}) : null;
const db = () => { if (!admin) throw Error('configuration'); return admin; };
function checked(result: {data: any; error: any}) {
  if (!result.error) return result.data;
  let error: any;
  if (result.error.message === 'COURSE_ARCHIVED') error = new LearningError('course_not_found', 404);
  else if (result.error.message === 'COURSE_LIMIT') error = new LearningError('course_limit', 409);
  else if (result.error.message === 'CERTIFICATE_LIMIT') error = new LearningError('certificate_limit', 409);
  else if (result.error.code === '23505') error = new LearningError('already_saved', 409);
  else error = new Error('database_unavailable');
  // Only explicit PostgreSQL constraint/privilege rejections prove a failed write.
  // Fetch errors and PostgREST response/decoding errors have uncertain outcomes.
  error.writeRejected = /^(23[0-9A-Z]{3}|42501)$/.test(result.error.code || '');
  throw error;
}
const origins = Deno.env.get('PERSONAL_LEARNING_ALLOWED_ORIGINS')?.split(',').map((s: string) => s.trim()).filter(Boolean);
Deno.serve(createPersonalLearningHandler({
  allowedOrigins: origins?.length ? origins : undefined,
  authenticate: async (authorization: string) => {
    if (!url || !anon || !admin) throw Error('configuration');
    const client = createClient(url, anon, {global: {headers: {Authorization: authorization}}, auth: {persistSession: false, autoRefreshToken: false}});
    const {data, error} = await client.auth.getUser(); if (error || !data.user) return null;
    const profile = checked(await db().from('profiles').select('platform_role,status').eq('id', data.user.id).maybeSingle());
    return {id: data.user.id, profile};
  },
  list: async (owner: string) => {
    const courses = checked(await db().from('personal_learning_courses').select('*').eq('owner_id', owner).order('updated_at', {ascending: false}).limit(500));
    // Paginate because the project REST max_rows can be 1000, while 500 courses
    // can have up to 10 certificates each. Never silently lose stored evidence.
    let certificates: any[] = [];
    for (let from = 0; from < 6000; from += 500) {
      const page = checked(await db().from('personal_learning_certificates').select('*').eq('owner_id', owner).order('id').range(from, from + 499));
      certificates = certificates.concat(page); if (page.length < 500) break;
    }
    return {courses, certificates};
  },
  course: async (owner: string, id: string) => checked(await db().from('personal_learning_courses').select('*').eq('id', id).eq('owner_id', owner).maybeSingle()),
  courseCount: async (owner: string) => { const r = await db().from('personal_learning_courses').select('id', {head: true, count: 'exact'}).eq('owner_id', owner); checked(r); return r.count || 0; },
  createCourse: async (fields: any) => checked(await db().from('personal_learning_courses').insert(fields).select('*').single()),
  updateCourse: async (owner: string, id: string, fields: any) => checked(await db().from('personal_learning_courses').update({...fields, updated_at: new Date().toISOString()}).eq('id', id).eq('owner_id', owner).is('archived_at', null).select('*').maybeSingle()),
  archiveCourse: async (owner: string, id: string, archived: boolean) => checked(await db().from('personal_learning_courses').update({archived_at: archived ? new Date().toISOString() : null, updated_at: new Date().toISOString()}).eq('id', id).eq('owner_id', owner).select('*').maybeSingle()),
  certificate: async (owner: string, id: string) => checked(await db().from('personal_learning_certificates').select('*').eq('id', id).eq('owner_id', owner).maybeSingle()),
  certificateCount: async (owner: string, courseId: string) => { const r = await db().from('personal_learning_certificates').select('id', {head: true, count: 'exact'}).eq('owner_id', owner).eq('course_id', courseId); checked(r); return r.count || 0; },
  insertCertificate: async (fields: any) => checked(await db().from('personal_learning_certificates').insert(fields).select('*').single()),
  bucketPrivate: async (bucket: string) => { const r = await db().storage.getBucket(bucket); return !r.error && r.data?.public === false; },
  upload: async (bucket: string, path: string, bytes: Uint8Array, mime: string) => {
    const b = await db().storage.getBucket(bucket); if (b.error || b.data?.public !== false) throw Error('private_bucket_required');
    const r = await db().storage.from(bucket).upload(path, bytes, {contentType: mime, upsert: false, cacheControl: '0'}); if (r.error) throw Error('upload_failed');
  },
  discardUpload: async (bucket: string, path: string) => { const r = await db().storage.from(bucket).remove([path]); if (r.error) throw Error('cleanup_failed'); },
  sign: async (bucket: string, path: string, ttl: number, filename: string) => {
    const r = await db().storage.from(bucket).createSignedUrl(path, ttl, {download: filename});
    if (r.error || !r.data?.signedUrl) throw Error('certificate_unavailable'); return r.data.signedUrl;
  }
}));
