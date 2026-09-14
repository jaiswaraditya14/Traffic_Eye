/* eslint-env jest */
import { supabase } from '../../supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { createReportSubmission, submitReportWithMedia, checkUserRateLimit,
    checkPlateDuplicate, removeReportMedia, validateMediaFile } from '../index';

jest.mock('../../supabase', () => {
    const upload = jest.fn(), getPublicUrl = jest.fn(), remove = jest.fn();
    return { supabase: { from: jest.fn(), rpc: jest.fn(), storage: {
        from: jest.fn(() => ({ upload, getPublicUrl, remove })),
        __upload: upload, __getPublicUrl: getPublicUrl, __remove: remove,
    } } };
});
jest.mock('expo-file-system/legacy', () => ({
    getInfoAsync: jest.fn(), readAsStringAsync: jest.fn(), EncodingType: { Base64: 'base64' },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '11111111-1111-4111-8111-111111111111' }));
jest.mock('base64-arraybuffer', () => ({ decode: jest.fn(() => new Uint8Array([1, 2, 3]).buffer) }));

function chain(result, reject = false) {
    const q = {};
    for (const m of ['select', 'insert', 'eq', 'gte', 'order', 'single', 'maybeSingle']) q[m] = jest.fn(() => q);
    q.then = (resolve, fail) => (reject ? Promise.reject(result) : Promise.resolve(result)).then(resolve, fail);
    return q;
}
const MEDIA = { uri: 'file:///synthetic.jpg?access=synthetic', mimeType: 'image/jpeg', fileType: 'image' };
const REPORT = { violation_type: 'No Helmet', vehicle_number: 'MH 12 AB 1234', latitude: 19.08, longitude: 72.85, severity: 'high' };
const CREATED = { id: '11111111-1111-4111-8111-111111111111', user_id: 'u1', status: 'pending' };
const allow = () => chain({ data: [], count: 0, error: null });
const args = (overrides = {}) => ({ userId: 'u1', report: { ...REPORT }, media: { ...MEDIA }, ...overrides });

beforeEach(() => {
    jest.resetAllMocks();
    supabase.storage.from.mockImplementation(() => ({
        upload: supabase.storage.__upload, getPublicUrl: supabase.storage.__getPublicUrl, remove: supabase.storage.__remove,
    }));
    supabase.rpc.mockResolvedValue({ data: { is_duplicate: false, existing_report_id: null }, error: null });
    supabase.storage.__upload.mockResolvedValue({ error: null });
    supabase.storage.__remove.mockResolvedValue({ error: null });
    supabase.storage.__getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://synthetic.invalid/evidence.jpg' } });
    FileSystem.readAsStringAsync.mockResolvedValue('AQID');
    FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 3 });
    decode.mockReturnValue(new Uint8Array([1, 2, 3]).buffer);
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('fail-closed activity validation', () => {
    test.each([
        [null, null], [null, 0], [[], null], [[], -1], [[], NaN], [[], '0'], [{}, 0],
    ])('blocks malformed rows/count: %j / %j', async (data, count) => {
        supabase.from.mockReturnValue(chain({ data, count, error: null }));
        expect(await checkUserRateLimit('u1')).toMatchObject({ allowed: false, indeterminate: true });
    });
    test('allows a verified zero count', async () => {
        supabase.from.mockReturnValue(allow());
        expect(await checkUserRateLimit('u1')).toMatchObject({ allowed: true, count: 0, indeterminate: false });
    });
    test('blocks a known limit even when no timestamp row is returned', async () => {
        supabase.from.mockReturnValue(chain({ data: [], count: 3, error: null }));
        expect(await checkUserRateLimit('u1')).toMatchObject({ allowed: false, indeterminate: false, count: 3 });
    });
    test('returns a bounded reset window for the oldest report', async () => {
        supabase.from.mockReturnValue(chain({ data: [{ submitted_at: new Date(Date.now() - 30 * 60000).toISOString() }], count: 3, error: null }));
        expect(await checkUserRateLimit('u1')).toMatchObject({ allowed: false, remainingMinutes: 30 });
    });
    test.each([false, true])('blocks returned/thrown failures (%s) without logging detail', async thrown => {
        const err = new Error(MEDIA.uri);
        supabase.from.mockReturnValue(chain(thrown ? err : { error: err }, thrown));
        expect(await checkUserRateLimit('u1')).toMatchObject({ allowed: false, indeterminate: true });
        expect(JSON.stringify(console.warn.mock.calls)).not.toContain(MEDIA.uri);
    });
    test('missing identity makes no request', async () => {
        expect(await checkUserRateLimit(null)).toMatchObject({ allowed: false, indeterminate: true });
        expect(supabase.from).not.toHaveBeenCalled();
    });
});

describe('duplicate validation', () => {
    test.each([null, undefined, {}, [], { is_duplicate: 'false' }, { is_duplicate: true }])(
        'blocks indeterminate RPC data %j', async data => {
            supabase.rpc.mockResolvedValue({ data, error: null });
            expect(await checkPlateDuplicate('MH12AB1234')).toMatchObject({ indeterminate: true });
        });
    test('normalizes plate and returns a confirmed match', async () => {
        supabase.rpc.mockResolvedValue({ data: { is_duplicate: true, existing_report_id: 'existing' }, error: null });
        expect(await checkPlateDuplicate('mh 12 ab 1234')).toMatchObject({ isDuplicate: true, indeterminate: false, existingReportId: 'existing' });
        expect(supabase.rpc).toHaveBeenCalledWith('check_plate_duplicate', { p_vehicle_number: 'MH12AB1234' });
    });
    test('returns verified nonduplicate', async () => {
        expect(await checkPlateDuplicate('MH12AB1234')).toMatchObject({ isDuplicate: false, indeterminate: false });
    });
    test.each([null, '', 'Not detected', 'Not applicable', 'PLATE_NOT_READABLE', 'N/A'])('no fabricated plate for %s', async plate => {
        expect(await checkPlateDuplicate(plate)).toMatchObject({ isDuplicate: false, indeterminate: false });
        expect(supabase.rpc).not.toHaveBeenCalled();
    });
    test.each([false, true])('fails closed on RPC errors (%s)', async thrown => {
        const err = new Error(MEDIA.uri);
        if (thrown) supabase.rpc.mockRejectedValue(err);
        else supabase.rpc.mockResolvedValue({ data: null, error: err });
        expect(await checkPlateDuplicate(REPORT.vehicle_number)).toMatchObject({ indeterminate: true });
        expect(JSON.stringify(console.warn.mock.calls)).not.toContain(MEDIA.uri);
    });
    test('malformed plate types are indeterminate', async () => {
        expect(await checkPlateDuplicate(1234)).toMatchObject({ indeterminate: true });
    });
});

describe('canonical submission', () => {
    test('validates before upload, normalizes final plate and strips privileged workflow input', async () => {
        const insert = chain({ data: CREATED, error: null }), link = chain({ data: {}, error: null });
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(insert).mockReturnValueOnce(link);
        const result = await submitReportWithMedia(args({ report: { ...REPORT, status: 'approved', reward_amount: 999, submitted_at: 'forged' } }));
        expect(result).toEqual({ data: CREATED, error: null });
        expect(supabase.rpc).toHaveBeenCalledWith('check_plate_duplicate', { p_vehicle_number: 'MH12AB1234' });
        expect(insert.insert).toHaveBeenCalledWith([expect.objectContaining({
            id: CREATED.id, user_id: 'u1', status: 'pending', reward_amount: 0,
            vehicle_number: 'MH12AB1234', image_storage_path: 'u1/' + CREATED.id + '.jpg',
        })]);
        expect(insert.insert.mock.calls[0][0][0]).not.toHaveProperty('submitted_at');
        expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(MEDIA.uri, { encoding: 'base64' });
        expect(supabase.storage.__upload).toHaveBeenCalledWith(expect.any(String), expect.any(ArrayBuffer),
            { contentType: 'image/jpeg', upsert: false });
        expect(link.insert).toHaveBeenCalledWith(expect.objectContaining({ id: CREATED.id, report_id: CREATED.id, file_size: 3 }));
        expect(supabase.storage.__remove).not.toHaveBeenCalled();
    });
    test.each([
        { userId: null }, { report: null }, { report: [] },
        { report: { ...REPORT, latitude: null } }, { report: { ...REPORT, longitude: 181 } },
        { report: { ...REPORT, violation_type: '' } }, { media: null },
        { media: { uri: 'file:///a.gif', mimeType: 'image/gif' } },
        { media: { ...MEDIA, mimeType: 'video/mp4' } },
    ])('rejects invalid inputs before I/O: %j', async override => {
        expect((await submitReportWithMedia(args(override))).error).toBeTruthy();
        expect(supabase.from).not.toHaveBeenCalled();
        expect(supabase.storage.__upload).not.toHaveBeenCalled();
    });
    test('blocks rate-limit failure before uploading', async () => {
        supabase.from.mockReturnValue(chain({ data: null, count: null, error: null }));
        expect((await submitReportWithMedia(args())).error.code).toBe('RATE_LIMIT');
        expect(supabase.storage.__upload).not.toHaveBeenCalled();
    });
    test('blocks duplicate-check failure even for manual-review reports', async () => {
        supabase.from.mockReturnValue(allow());
        supabase.rpc.mockResolvedValue({ data: null, error: null });
        expect((await submitReportWithMedia(args({ report: { ...REPORT, ai_raw_result: { requiresManualReview: true } } }))).error.code).toBe('DUPLICATE_CHECK');
        expect(supabase.storage.__upload).not.toHaveBeenCalled();
    });
    test('preserves confirmed possible-duplicate officer review behavior', async () => {
        const insert = chain({ data: CREATED, error: null });
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(insert).mockReturnValueOnce(chain({ error: null }));
        supabase.rpc.mockResolvedValue({ data: { is_duplicate: true, existing_report_id: 'earlier' }, error: null });
        expect((await submitReportWithMedia(args())).error).toBeNull();
        expect(insert.insert.mock.calls[0][0][0]).toMatchObject({ possible_duplicate: true, duplicate_report_id: 'earlier' });
    });
    test('upload rejection creates no report', async () => {
        const rate = allow();
        supabase.from.mockReturnValue(rate);
        supabase.storage.__upload.mockResolvedValue({ error: { message: MEDIA.uri } });
        const result = await submitReportWithMedia(args());
        expect(result.error.code).toBe('UPLOAD_FAILED');
        expect(rate.insert).not.toHaveBeenCalled();
        expect(result.error.message).not.toContain(MEDIA.uri);
    });
    test('a timed-out upload retries the same object and accepts an already-uploaded 409', async () => {
        const submission = createReportSubmission();
        supabase.from.mockReturnValue(allow());
        supabase.storage.__upload.mockResolvedValueOnce({ error: { statusCode: 504 } });
        expect((await submitReportWithMedia(args({ submission }))).error.code).toBe('UPLOAD_FAILED');
        expect(submission.uploadStarted).toBe(true);
        supabase.from.mockReset();
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: CREATED, error: null })).mockReturnValueOnce(chain({ error: null }));
        supabase.storage.__upload.mockResolvedValueOnce({ error: { statusCode: 409 } });
        expect((await submitReportWithMedia(args({ submission }))).error).toBeNull();
        expect(supabase.storage.__upload).toHaveBeenCalledTimes(2);
        expect(supabase.storage.__upload.mock.calls[0][0]).toBe(supabase.storage.__upload.mock.calls[1][0]);
    });
    test('definite SQL rejection cleans up the orphan and permits retry', async () => {
        const submission = createReportSubmission();
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: null, error: { code: '23514', message: MEDIA.uri } }));
        expect((await submitReportWithMedia(args({ submission }))).error).toBeTruthy();
        expect(supabase.storage.__remove).toHaveBeenCalledWith(['u1/' + submission.id + '.jpg']);
        expect(submission.uncertain).toBe(false);
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: CREATED, error: null })).mockReturnValueOnce(chain({ error: null }));
        expect((await submitReportWithMedia(args({ submission }))).error).toBeNull();
    });
    test.each([false, true])('lost insert response (%s) is reconciled without reupload or deletion', async thrown => {
        const submission = createReportSubmission();
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain(thrown ? new Error(MEDIA.uri) : { data: null, error: { message: MEDIA.uri } }, thrown));
        expect((await submitReportWithMedia(args({ submission }))).error).toBeTruthy();
        expect(supabase.storage.__remove).not.toHaveBeenCalled();
        const recovery = chain({ data: CREATED, error: null });
        supabase.from.mockReturnValueOnce(recovery).mockReturnValueOnce(chain({ error: null }));
        expect(await submitReportWithMedia(args({ submission }))).toEqual({ data: CREATED, error: null });
        expect(recovery.eq).toHaveBeenCalledWith('id', submission.id);
        expect(recovery.eq).toHaveBeenCalledWith('user_id', 'u1');
        expect(supabase.storage.__upload).toHaveBeenCalledTimes(1);
    });
    test('unknown reconciliation blocks a new insert', async () => {
        const submission = createReportSubmission();
        submission.uncertain = true;
        supabase.from.mockReturnValue(chain({ data: null, error: new Error('offline') }));
        expect((await submitReportWithMedia(args({ submission }))).error.code).toBe('STATUS_UNKNOWN');
        expect(supabase.storage.__upload).not.toHaveBeenCalled();
    });
    test('concurrent taps and repeated success share one operation', async () => {
        const submission = createReportSubmission();
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: CREATED, error: null })).mockReturnValueOnce(chain({ error: null }));
        const first = submitReportWithMedia(args({ submission }));
        const second = submitReportWithMedia(args({ submission }));
        const third = submitReportWithMedia(args({ submission }));
        expect(second).toBe(first);
        expect(third).toBe(first);
        await first;
        expect(await submitReportWithMedia(args({ submission }))).toEqual({ data: CREATED, error: null });
        expect(supabase.storage.__upload).toHaveBeenCalledTimes(1);
    });
    test.each([false, true])('media-link failure (%s) preserves the successful report', async thrown => {
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: CREATED, error: null }))
            .mockReturnValueOnce(chain(thrown ? new Error(MEDIA.uri) : { error: { message: MEDIA.uri } }, thrown));
        expect(await submitReportWithMedia(args())).toEqual({ data: CREATED, error: null });
        expect(supabase.storage.__remove).not.toHaveBeenCalled();
        expect(JSON.stringify(console.warn.mock.calls)).not.toContain(MEDIA.uri);
    });
    test('account changes cannot reuse another owner operation', async () => {
        const submission = createReportSubmission();
        submission.userId = 'different-user';
        expect((await submitReportWithMedia(args({ submission }))).error.code).toBe('AUTH_CHANGED');
    });
    test('supports extensionless Android content URIs with explicit MIME', async () => {
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: CREATED, error: null })).mockReturnValueOnce(chain({ error: null }));
        const media = { uri: 'content://synthetic.media/42?access=yes', fileType: 'video', mimeType: 'video/mp4' };
        expect((await submitReportWithMedia(args({ media }))).error).toBeNull();
        expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(media.uri, expect.any(Object));
        expect(supabase.storage.__upload.mock.calls[0][2].contentType).toBe('video/mp4');
    });
    test.each([
        ['content://synthetic.media/43', 'video/quicktime', 'mov'],
        ['content://synthetic.media/44', 'video/mp4', 'mp4'],
    ])('preserves %s MIME and extension for extensionless video', async (uri, mimeType, extension) => {
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: CREATED, error: null })).mockReturnValueOnce(chain({ error: null }));
        expect((await submitReportWithMedia(args({ media: { uri, fileType: 'video', mimeType } }))).error).toBeNull();
        expect(supabase.storage.__upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`\\.${extension}$`)), expect.any(ArrayBuffer), expect.objectContaining({ contentType: mimeType }));
    });
});

describe('media validation and cleanup', () => {
    test.each([NaN, -1, 0, 52428801, '10'])('rejects invalid size %s', size => {
        expect(validateMediaFile('file:///a.jpg', size).valid).toBe(false);
    });
    test('accepts the maximum size', () => expect(validateMediaFile('file:///a.jpg', 52428800).valid).toBe(true));
    test('rejects an unsafe in-memory upload before reading or contacting storage', async () => {
        supabase.from.mockReturnValue(allow());
        FileSystem.getInfoAsync.mockResolvedValue({ exists: true, size: 12 * 1024 * 1024 + 1 });
        const result = await submitReportWithMedia(args());
        expect(result.error.code).toBe('UPLOAD_FAILED');
        expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
        expect(supabase.storage.__upload).not.toHaveBeenCalled();
    });
    test('missing path cleanup is a no-op', async () => {
        expect(await removeReportMedia(null)).toEqual({ error: null });
        expect(supabase.storage.__remove).not.toHaveBeenCalled();
    });
    test('cleanup failure is best effort and does not leak storage detail', async () => {
        supabase.storage.__remove.mockRejectedValue(new Error(MEDIA.uri));
        expect((await removeReportMedia('u1/synthetic.jpg')).error).toBeTruthy();
        expect(JSON.stringify(console.warn.mock.calls)).not.toContain(MEDIA.uri);
    });
});
describe('demo isolation and cancellation', () => {
    test.each([{ demo: true }, { ai_raw_result: { demo: true } }])('demo fails before all backend/file calls (%j)', async marker => {
        expect((await submitReportWithMedia(args({ report: { ...REPORT, ...marker } }))).error.code).toBe('DEMO_NOT_SAVED');
        expect(supabase.from).not.toHaveBeenCalled(); expect(supabase.rpc).not.toHaveBeenCalled(); expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
    });
    test('abort before validation makes no requests', async () => {
        const controller = new AbortController(); controller.abort();
        expect((await submitReportWithMedia(args({ signal: controller.signal }))).error.code).toBe('CANCELLED'); expect(supabase.from).not.toHaveBeenCalled();
    });
    test('abort during confirmed upload cleans only that object and never inserts', async () => {
        const controller = new AbortController();
        supabase.from.mockReturnValue(allow());
        supabase.storage.__upload.mockImplementation(async () => { controller.abort(); return { error: null }; });
        expect((await submitReportWithMedia(args({ signal: controller.signal }))).error.code).toBe('CANCELLED');
        expect(supabase.storage.__remove).toHaveBeenCalledTimes(1); expect(supabase.from).toHaveBeenCalledTimes(1);
    });
    test('abort after insert starts retains evidence and confirms success', async () => {
        const controller = new AbortController();
        supabase.from.mockReturnValueOnce(allow()).mockReturnValueOnce(chain({ data: CREATED, error: null })).mockReturnValueOnce(chain({ error: null }));
        const result = await submitReportWithMedia(args({ signal: controller.signal, onPhase: phase => { if (phase === 'saving') controller.abort(); } }));
        expect(result.data).toEqual(CREATED); expect(supabase.storage.__remove).not.toHaveBeenCalled();
    });
});
