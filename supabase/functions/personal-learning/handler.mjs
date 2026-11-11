import {ALLOWED_ROLES, BUCKET, MAX_FILE_BYTES, SIGNED_TTL, LearningError, courseInput, fileInfo, fail, validId, readBounded, publicCertificate, publicCourse} from './domain.mjs';

// Dependencies keep security decisions executable in Node tests as well as Deno.
export function createPersonalLearningHandler(deps) {
  const allowedOrigins = new Set(deps.allowedOrigins || ['https://www.raizesesaberes.com.br', 'https://raizesesaberes.com.br']);
  return async request => {
    const origin = request.headers.get('origin');
    const headers = {'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info,x-file-name', 'Access-Control-Allow-Methods': 'POST,OPTIONS'};
    if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (status, body) => new Response(JSON.stringify({ok: status === 200, ...body}), {status, headers});
    if (origin && !allowedOrigins.has(origin)) return reply(403, {code: 'origin_not_allowed'});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (request.method !== 'POST') return reply(405, {code: 'method_not_allowed'});
    const authorization = request.headers.get('authorization') || '';
    if (!/^Bearer\s+\S+$/i.test(authorization)) return reply(401, {code: 'session_required'});
    try {
      // Always round-trip auth.getUser. Never decode JWT/user_metadata to authorize.
      const actor = await deps.authenticate(authorization);
      if (!actor) fail('invalid_session', 401);
      if (actor.profile?.status !== 'active' || !ALLOWED_ROLES.has(actor.profile.platform_role)) fail('active_educator_required', 403);
      const owner = validId(actor.id);
      const endpoint = new URL(request.url);
      if (endpoint.searchParams.get('action') === 'upload') {
        const courseId = validId(endpoint.searchParams.get('courseId'));
        const course = await deps.course(owner, courseId);
        if (!course || course.archived_at) fail('course_not_found', 404);
        if (await deps.certificateCount(owner, courseId) >= 10) fail('certificate_limit', 409);
        let filename; try { filename = decodeURIComponent(request.headers.get('x-file-name') || 'certificado'); } catch { fail('invalid_filename'); }
        if (filename.length > 500) fail('invalid_filename');
        const bytes = await readBounded(request, MAX_FILE_BYTES);
        const info = fileInfo(bytes, request.headers.get('content-type'), filename);
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
        const id = crypto.randomUUID();
        const path = `${owner}/${courseId}/${id}/${hash}.${info.extension}`;
        // Use immutable server-generated object names. Never upsert user files.
        await deps.upload(BUCKET, path, bytes, info.mime_type);
        let certificate;
        try {
          certificate = await deps.insertCertificate({id, owner_id: owner, course_id: courseId,
            original_name: info.original_name, mime_type: info.mime_type, byte_size: info.byte_size, sha256: hash, storage_path: path});
        } catch (error) {
          // A database write may commit before its response is lost. Reconcile
          // the server-generated ID before any compensation, never delete the
          // evidence behind a committed row. Unknown outcomes retain private bytes.
          let persisted;
          try { persisted = await deps.certificate(owner, id); } catch { throw error; }
          if (persisted && persisted.owner_id === owner && persisted.course_id === courseId &&
              persisted.storage_path === path && persisted.sha256 === hash && persisted.byte_size === bytes.length) {
            certificate = persisted;
          } else {
            if (!persisted && error?.writeRejected === true) {
              try { await deps.discardUpload(BUCKET, path); } catch { /* private orphan; no sensitive logs */ }
            }
            throw error;
          }
        }
        return reply(200, {certificate: publicCertificate(certificate)});
      }
      if (!request.headers.get('content-type')?.startsWith('application/json')) fail('invalid_request');
      const bytes = await readBounded(request, 8192);
      let input; try { input = JSON.parse(new TextDecoder().decode(bytes)); } catch { fail('invalid_request'); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_request');
      if (['owner_id', 'ownerId', 'user_id', 'userId', 'path', 'storage_path', 'bucket', 'role'].some(key => key in input)) fail('invalid_request');
      switch (input.action) {
        case 'list': {
          const result = await deps.list(owner);
          return reply(200, {courses: result.courses.map(publicCourse), certificates: result.certificates.map(publicCertificate)});
        }
        case 'create': {
          const fields = courseInput(input);
          if (await deps.courseCount(owner) >= 500) fail('course_limit', 409);
          const course = await deps.createCourse({owner_id: owner, ...fields});
          return reply(200, {course: publicCourse(course)});
        }
        case 'update': {
          const id = validId(input.id); const fields = courseInput(input);
          const course = await deps.updateCourse(owner, id, fields);
          if (!course) fail('course_not_found', 404);
          return reply(200, {course: publicCourse(course)});
        }
        case 'archive': {
          const id = validId(input.id);
          if (typeof input.archived !== 'boolean') fail('invalid_request');
          const course = await deps.archiveCourse(owner, id, input.archived);
          if (!course) fail('course_not_found', 404);
          return reply(200, {course: publicCourse(course)});
        }
        case 'sign': {
          const certificate = await deps.certificate(owner, validId(input.id));
          if (!certificate) fail('certificate_not_found', 404);
          const course = await deps.course(owner, certificate.course_id);
          const ext = {'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg'}[certificate.mime_type];
          const expected = `${owner}/${certificate.course_id}/${certificate.id}/${certificate.sha256}.${ext}`;
          if (!course || certificate.owner_id !== owner || !ext || certificate.storage_path !== expected || !/^[a-f0-9]{64}$/.test(certificate.sha256)) fail('certificate_unavailable', 404);
          if (!await deps.bucketPrivate(BUCKET)) fail('certificate_unavailable', 503);
          const signedUrl = await deps.sign(BUCKET, expected, SIGNED_TTL, certificate.original_name);
          return reply(200, {signedUrl, expiresIn: SIGNED_TTL});
        }
        default: fail('invalid_action');
      }
    } catch (error) {
      if (error instanceof LearningError) return reply(error.status, {code: error.code});
      return reply(503, {code: 'service_unavailable'});
    }
  };
}
