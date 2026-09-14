/** Static documentation checks only. These do NOT execute or validate SQL in Postgres. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const guide = fs.readFileSync(path.join(root, 'SUPABASE_CHANGES.md'), 'utf8').replace(/\r\n/g, '\n');
const sections = guide.split(/^## Section \d+[^\n]*\n/gm);

test('guide has exactly ten ordered sections without a duplicated tail', () => {
    const numbers = [...guide.matchAll(/^## Section (\d+)/gm)].map(match => Number(match[1]));
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect((guide.match(/^```/gm) || []).length % 2).toBe(0);
});

test('original AI SQL is included verbatim and the provider correction is separate', () => {
    const sql = fs.readFileSync(path.join(root, 'database/PHASE1_SQL_EDITOR.sql'), 'utf8').replace(/\r\n/g, '\n').trim();
    const originalBlock = sections[1].match(/```sql\n([\s\S]*?)\n```/)[1].trim();
    expect(originalBlock).toBe(sql);
    expect(sections[1]).toContain("CHECK (provider IN ('tokenharbor', 'nvidia', 'gemini', 'groq'))");
});

test('review recommendation retains the complete routing check and exactly one notification insert', () => {
    const review = sections[4].match(/```sql\n([\s\S]*?)\n```/)[1];
    expect(review.match(/INSERT INTO public.notifications/g)).toHaveLength(1);
    expect(review).toContain("v_suffix := substring(v_badge from '([0-9]+)$');");
    expect(review).toContain('Report is outside officer jurisdiction');
    expect(review).toContain('p_officer_id IS DISTINCT FROM v_caller_id');
    expect(review).toContain('FOR UPDATE');
    expect(review).not.toContain('v_caller_id := p_officer_id');
    expect(review.match(/\$\$/g)).toHaveLength(2);
});

test('signup ignores metadata roles and routing fields are protected separately', () => {
    const signup = sections[5].match(/```sql\n([\s\S]*?)\n```/)[1];
    expect(signup).toContain("'citizen'");
    expect(signup).not.toMatch(/raw_user_meta_data\s*->>\s*'(role|badge_id|department|jurisdiction)'/);
    expect(sections[5]).toContain('NEW.jurisdiction IS DISTINCT FROM OLD.jurisdiction');
    expect(sections[5]).toContain('NEW.department IS DISTINCT FROM OLD.department');
});

test('seed is insert-only, serialized and preserves completed data on rerun', () => {
    const seed = sections[6].match(/```sql\n([\s\S]*?)\n```/)[1];
    expect(seed).not.toMatch(/DELETE FROM|TRUNCATE|DROP TABLE/i);
    expect(seed).toContain('pg_advisory_xact_lock');
    expect(seed).toContain('FOR v_i IN 1..13 LOOP');
    expect(seed).toContain('Demo seed already exists');
    expect(seed.match(/\$\$/g)).toHaveLength(2);
});
