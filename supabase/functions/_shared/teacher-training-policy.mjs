// SQL is the authorization authority. This transport never accepts a role,
// storage bucket/path, or entitlement from the browser.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const objectPath = /^formacao\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/volume-[1-9][0-9]*\/unidade-[1-9][0-9]*\/aula-[1-9][0-9]*\/([0-9a-f]{64})\.(mp4|mp3|m4a)$/;
const status = (code, statusCode) => ({ ok: false, status: statusCode, code });
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function catalogForClient(data) {
  if (!record(data) || data.ok !== true || !['admin', 'teacher'].includes(data.actor)
    || !['available', 'license_required'].includes(data.access) || !Array.isArray(data.lessons)
    || (data.schoolId !== null && !uuid.test(data.schoolId || '')))
    throw Error('invalid_catalog');
  if (data.access === 'license_required') {
    if (data.actor !== 'teacher' || data.lessons.length) throw Error('invalid_catalog');
    return { ok: true, actor: data.actor, schoolId: data.schoolId, access: data.access, lessons: [] };
  }
  const lessons = data.lessons.map(lesson => {
    const h = lesson?.hierarchy;
    if (!record(lesson) || !uuid.test(lesson.id || '') || typeof lesson.title !== 'string'
      || typeof lesson.description !== 'string' || !['draft', 'review', 'published'].includes(lesson.status)
      || (data.actor === 'teacher' && lesson.status !== 'published')
      || !Number.isSafeInteger(lesson.lessonNumber) || lesson.lessonNumber < 1 || !record(h)
      || !['collection', 'subject', 'schoolYear'].every(key => typeof h[key] === 'string' && h[key].length)
      || !Number.isSafeInteger(h.volume) || h.volume < 1 || !Number.isSafeInteger(h.unit) || h.unit < 1
      || !Array.isArray(lesson.availableKinds) || !lesson.availableKinds.every(kind => ['video', 'audio'].includes(kind))
      || typeof lesson.canPlay !== 'boolean' || lesson.canPlay !== (lesson.availableKinds.length > 0)
      || (lesson.durationSeconds !== null && (typeof lesson.durationSeconds !== 'number' || !Number.isFinite(lesson.durationSeconds) || lesson.durationSeconds <= 0)))
      throw Error('invalid_catalog');
    return {
      id: lesson.id, title: lesson.title, description: lesson.description, lessonNumber: lesson.lessonNumber,
      status: lesson.status, hierarchy: {
        collection: h.collection, subject: h.subject, schoolYear: h.schoolYear,
        volume: h.volume, unit: h.unit, unitTitle: typeof h.unitTitle === 'string' ? h.unitTitle : '',
      },
      availableKinds: [...new Set(lesson.availableKinds)], canPlay: lesson.canPlay,
      durationSeconds: lesson.durationSeconds,
    };
  });
  return { ok: true, actor: data.actor, schoolId: data.schoolId, access: data.access, lessons };
}

export async function deliverTeacherTraining(payload, dependencies) {
  if (!record(payload) || !['catalog', 'asset'].includes(payload.action)) return status('invalid_request', 400);
  const allowedKeys = payload.action === 'catalog' ? ['action', 'schoolId'] : ['action', 'schoolId', 'lessonId', 'kind'];
  if (Object.keys(payload).some(key => !allowedKeys.includes(key))) return status('invalid_request', 400);
  if (payload.schoolId !== undefined && !uuid.test(payload.schoolId || '')) return status('invalid_request', 400);
  const schoolId = payload.schoolId?.toLowerCase() || null;
  if (payload.action === 'catalog') {
    try {
      return { ...catalogForClient(await dependencies.catalog(schoolId)), status: 200 };
    } catch (error) {
      return status(error?.code === '42501' ? 'training_access_denied' : 'service_unavailable', error?.code === '42501' ? 403 : 503);
    }
  }
  if (!uuid.test(payload.lessonId || '') || !['video', 'audio'].includes(payload.kind)) return status('invalid_request', 400);
  const lessonId = payload.lessonId.toLowerCase();
  try {
    // Denial and RPC errors are never converted to permissive fallback behavior.
    if (await dependencies.authorize(lessonId, schoolId) !== true) return status('training_access_denied', 403);
    const binding = await dependencies.binding(lessonId, payload.kind);
    const match = typeof binding?.path === 'string' && binding.path.match(objectPath);
    const validType = payload.kind === 'video'
      ? binding?.bucket === 'videos' && binding?.mimeType === 'video/mp4' && match?.[2] === 'mp4'
      : binding?.bucket === 'audios' && ((binding?.mimeType === 'audio/mpeg' && match?.[2] === 'mp3')
        || (binding?.mimeType === 'audio/mp4' && match?.[2] === 'm4a'));
    if (!record(binding) || binding.lessonId !== lessonId || binding.kind !== payload.kind
      || !match || match[1] !== binding.sha256 || !validType) return status('asset_unavailable', 404);
    const signedUrl = await dependencies.sign(binding.bucket, binding.path, 300);
    if (typeof signedUrl !== 'string' || !signedUrl.startsWith('https://')) return status('asset_unavailable', 404);
    return { ok: true, status: 200, asset: { lessonId, kind: payload.kind, mimeType: binding.mimeType, signedUrl, expiresIn: 300 } };
  } catch {
    return status('service_unavailable', 503);
  }
}
