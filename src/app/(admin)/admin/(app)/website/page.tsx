import { requireUser, pageCan, can, canAny } from '@/server/auth';
import { q } from '@/server/db';
import { findImage } from '@/lib/media';
import { services } from '@/config/site';
import { DEFAULT_SLIDES, getDraftContent, imageSlots, mediaUrl } from '@/server/cms';
import { discardAction, publishAction, restoreVersionAction, saveSlidesAction, saveTextAction, saveTypographyAction, savePortfolioAction, setSlotImageAction, updateMediaAction, uploadMediaAction } from '@/server/actions/cms';
import { ActionButton, ActionForm } from '@/components/admin/Forms';
import { PortfolioEditor, PublishBar, SlidesEditor, SlotPicker, TypographyPreview } from '@/components/admin/CmsEditors';
import { Card, Empty, Tabs, when } from '@/components/admin/Ui';

export const metadata = { title: 'Website' };
const ANY = ['cms.edit_text', 'cms.upload_images', 'cms.replace_images', 'cms.portfolio', 'cms.fonts', 'cms.preview', 'cms.publish', 'cms.design'];

export default async function Website({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const u = await requireUser();
  pageCan(u, ANY);
  const tab = (await searchParams).tab ?? 'content';
  const { draft, dirty } = await getDraftContent();
  const media = await q<{ id: string; name: string; alt: string | null; caption: string | null; size: number; created_at: string }>(`SELECT id, name, alt, caption, size, created_at FROM media ORDER BY created_at DESC LIMIT 200`);
  const slots = imageSlots(draft);
  const tabs = [
    ...(can(u, 'cms.edit_text') ? [{ href: '/admin/website', label: 'Text' }] : []),
    ...(canAny(u, ['cms.upload_images', 'cms.replace_images', 'cms.design']) ? [{ href: '/admin/website?tab=images', label: 'Images' }] : []),
    ...(can(u, 'cms.portfolio') ? [{ href: '/admin/website?tab=portfolio', label: 'Portfolio' }] : []),
    ...(can(u, 'cms.fonts') ? [{ href: '/admin/website?tab=type', label: 'Typography' }] : []),
    ...(canAny(u, ['cms.preview', 'cms.publish']) ? [{ href: '/admin/website?tab=preview', label: 'Preview' }] : []),
    ...(can(u, 'cms.publish') ? [{ href: '/admin/website?tab=history', label: 'History' }] : []),
  ];
  const cur = tab === 'content' ? '/admin/website' : `/admin/website?tab=${tab}`;
  const tabHref = tabs.find((t) => t.href === cur) ? cur : tabs[0]?.href ?? '/admin/website';
  const active = tabHref === '/admin/website' ? 'content' : tabHref.split('=')[1];

  return (
    <div className="ad-grid" style={{ maxWidth: 1100 }}>
      <PublishBar dirty={dirty} canPublish={can(u, 'cms.publish')} canDiscard={canAny(u, ANY)} publish={publishAction} discard={discardAction} />
      <Tabs items={tabs} current={tabHref} />

      {active === 'content' && can(u, 'cms.edit_text') && (
        <ActionForm action={saveTextAction} submit="Save to draft">
          <Card title="Home page"><div className="ad-form">
            <div className="ad-field"><label htmlFor="hq">Main heading</label><input id="hq" name="hero_quote" type="text" defaultValue={draft.hero.quote} maxLength={160} /></div>
            <div className="ad-field"><label htmlFor="hb">Sub-heading (right side of the hero)</label><input id="hb" name="hero_budget" type="text" defaultValue={draft.hero.budgetQuote} maxLength={200} /></div>
          </div></Card>
          <Card title="Founder card"><div className="ad-form">
            <div className="ad-row"><div className="ad-field"><label htmlFor="fn">Name</label><input id="fn" name="founder_name" type="text" defaultValue={draft.founder.name} /></div><div className="ad-field"><label htmlFor="ft">Title</label><input id="ft" name="founder_title" type="text" defaultValue={draft.founder.title} /></div></div>
            <div className="ad-field"><label htmlFor="fq">Quote</label><textarea id="fq" name="founder_quote" defaultValue={draft.founder.quote} maxLength={500} /></div>
          </div></Card>
          <Card title="Contact details"><div className="ad-form">
            <div className="ad-row"><div className="ad-field"><label htmlFor="cp">Phone</label><input id="cp" name="phone" type="text" defaultValue={draft.contact.phone} /></div><div className="ad-field"><label htmlFor="ce">Email</label><input id="ce" name="email" type="text" defaultValue={draft.contact.email} /></div></div>
            <div className="ad-row"><div className="ad-field"><label htmlFor="ca">Address</label><input id="ca" name="address" type="text" defaultValue={draft.contact.address} /></div><div className="ad-field"><label htmlFor="ch">Opening hours</label><input id="ch" name="hours" type="text" defaultValue={draft.contact.hours} /></div></div>
            <div className="ad-field"><label htmlFor="fb">Footer blurb</label><input id="fb" name="footer_blurb" type="text" defaultValue={draft.footer.blurb} /></div>
          </div></Card>
          <Card title="Studio in numbers"><div className="ad-row three">
            <div className="ad-field"><label htmlFor="s1">Projects completed</label><input id="s1" name="stat_completed" type="number" min="0" defaultValue={draft.stats.completed ?? ''} /></div>
            <div className="ad-field"><label htmlFor="s2">Projects in progress</label><input id="s2" name="stat_running" type="number" min="0" defaultValue={draft.stats.running ?? ''} /></div>
            <div className="ad-field"><label htmlFor="s3">Cities served</label><input id="s3" name="stat_cities" type="number" min="0" defaultValue={draft.stats.cities ?? ''} /></div>
          </div><p className="muted small">Leave blank to keep showing the placeholder tag. Only enter real, verified numbers.</p></Card>
          <Card title="Services"><div className="ad-form">{services.map((s) => <div key={s.slug} className="ad-field"><label htmlFor={`sv-${s.slug}`}>{s.name} intro</label><textarea id={`sv-${s.slug}`} name={`svc_${s.slug}`} defaultValue={draft.services[s.slug]?.intro ?? s.intro} style={{ minHeight: 64 }} /></div>)}</div></Card>
          <Card title="Search engines (SEO)"><div className="ad-form">
            <div className="ad-field"><label htmlFor="st">Page title</label><input id="st" name="seo_title" type="text" defaultValue={draft.seo.title} maxLength={90} /></div>
            <div className="ad-field"><label htmlFor="sd">Description</label><textarea id="sd" name="seo_desc" defaultValue={draft.seo.description} maxLength={200} style={{ minHeight: 64 }} /></div>
          </div></Card>
        </ActionForm>
      )}

      {active === 'images' && (
        <>
          {can(u, 'cms.design') && <Card title="Home hero slideshow"><SlidesEditor initial={draft.hero.slides.length ? draft.hero.slides : DEFAULT_SLIDES} options={slots.filter((s) => s.slot.endsWith('-poster'))} action={saveSlidesAction} /></Card>}
          {can(u, 'cms.upload_images') && (
            <Card title="Upload an image">
              <ActionForm action={uploadMediaAction} submit="Upload" resetOnOk>
                <div className="ad-row"><div className="ad-field"><label htmlFor="mf">Image (JPG, PNG, WebP or GIF, up to 4 MB)</label><input id="mf" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required /></div>
                  <div className="ad-field"><label htmlFor="ma">Alternative text</label><input id="ma" name="alt" type="text" placeholder="Describe the image for screen readers" /></div></div>
                <div className="ad-field"><label htmlFor="mc">Caption (optional)</label><input id="mc" name="caption" type="text" /></div>
              </ActionForm>
            </Card>
          )}
          {can(u, 'cms.replace_images') && (
            <Card title="Replace images on the website">
              <p className="muted">Pick a picture from the library for any spot on the site, or go back to the original.</p>
              <div className="ad-grid ad-cols-3">{slots.map((sl) => {
                const id = draft.images[sl.slot] ?? null;
                const src = id ? mediaUrl(id) : findImage(sl.slot);
                return (
                  <div key={sl.slot} className="ad-pgroup" style={{ padding: 10, display: 'grid', gap: 8 }}>
                    <div style={{ aspectRatio: '16/10', background: 'var(--soft)', borderRadius: 8, overflow: 'hidden' }}>{src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Empty title="No image" />}</div>
                    <b className="small">{sl.label}</b>
                    <SlotPicker slot={sl.slot} media={media.map((m) => ({ id: m.id, name: m.name, alt: m.alt }))} current={id} setSlot={setSlotImageAction} />
                  </div>);
              })}</div>
            </Card>
          )}
          <Card title="Media library">
            {media.length === 0 ? <Empty title="No uploads yet" /> : (
              <div className="ad-grid ad-cols-3">{media.map((m) => (
                <div key={m.id} className="ad-pgroup" style={{ padding: 10, display: 'grid', gap: 8 }}>
                  <img src={mediaUrl(m.id)} alt={m.alt ?? ''} style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: 8 }} />
                  <span className="muted small">{m.name} · {Math.round(m.size / 1024)} KB · {when(m.created_at)}</span>
                  {canAny(u, ['cms.upload_images', 'cms.edit_text']) && (
                    <ActionForm action={updateMediaAction} submit="Save text" className="ad-form">
                      <input type="hidden" name="id" value={m.id} />
                      <div className="ad-field"><label>Alt text</label><input name="alt" type="text" defaultValue={m.alt ?? ''} /></div>
                      <div className="ad-field"><label>Caption</label><input name="caption" type="text" defaultValue={m.caption ?? ''} /></div>
                    </ActionForm>
                  )}
                </div>))}</div>
            )}
          </Card>
        </>
      )}

      {active === 'portfolio' && can(u, 'cms.portfolio') && (
        <Card title="Portfolio entries"><PortfolioEditor initial={draft.portfolio} action={savePortfolioAction} /></Card>
      )}

      {active === 'type' && can(u, 'cms.fonts') && (
        <Card title="Typography (approved fonts only)">
          <ActionForm action={saveTypographyAction} submit="Save typography to draft">
            <TypographyPreview initial={{ heading: draft.typography.heading, body: draft.typography.body, hw: draft.typography.headingWeight, bw: draft.typography.bodyWeight }} />
          </ActionForm>
          <p className="muted small" style={{ marginTop: 10 }}>Fonts are restricted to a vetted list. Arbitrary CSS or scripts cannot be added. Use History to go back to an earlier typography setup.</p>
        </Card>
      )}

      {active === 'preview' && (
        <Card title="Preview of unpublished changes">
          <p className="muted small">This is a faithful preview of the text and typography in your draft. Use &quot;Open live site&quot; to compare with what visitors see now.</p>
          <div className="ad-doc" style={{ background: '#f7f2e9', fontFamily: 'inherit' }}>
            {(() => { const slide = draft.hero.slides[0]; const id = draft.images[slide]; const src = id ? mediaUrl(id) : findImage(slide); return src ? <img src={src} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10, marginBottom: 16 }} /> : null; })()}
            <h2 style={{ fontSize: '2.2rem' }}>{draft.hero.quote}</h2><p className="muted"><i>{draft.hero.budgetQuote}</i></p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0' }} />
            <p><b>{draft.founder.name}</b>, {draft.founder.title}<br />“{draft.founder.quote}”</p>
            <p className="muted small">{[draft.contact.phone, draft.contact.email, draft.contact.address].filter(Boolean).join(' · ') || 'No contact details yet'}</p>
          </div>
          <p style={{ marginTop: 12 }}><a className="ad-btn" href="/" target="_blank" rel="noopener">Open live site</a></p>
        </Card>
      )}

      {active === 'history' && can(u, 'cms.publish') && <History />}
    </div>
  );
}

async function History() {
  const rows = await q<{ id: string; note: string | null; created_at: string; by: string | null }>(`SELECT v.id, v.note, v.created_at, us.name AS by FROM cms_versions v LEFT JOIN users us ON us.id = v.published_by ORDER BY v.id DESC LIMIT 30`);
  return (
    <Card title="Published versions">
      {rows.length === 0 ? <Empty title="Nothing published yet" /> : <ul className="ad-list">{rows.map((r) => (
        <li key={r.id}><span><b>Version {r.id}</b> {r.note && `· ${r.note}`}<br /><span className="muted small">{r.by ?? 'unknown'} · {when(r.created_at)}</span></span>
          <ActionButton action={restoreVersionAction.bind(null, Number(r.id))} label="Restore to draft" confirm="Replace your current draft with this version? You can review it before publishing." /></li>))}</ul>}
    </Card>
  );
}
